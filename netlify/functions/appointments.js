/**
 * 商談アポイントメント CRUD API
 * GET    /api/appointments              → 一覧（?start=ISO&end=ISO で期間絞込）
 * GET    /api/appointments?id=xxx       → 1件取得
 * POST   /api/appointments              → 新規作成
 * PUT    /api/appointments              → 更新
 * DELETE /api/appointments?id=xxx       → 削除
 */

const { getRows, getRow, insertRow, updateRow, deleteRow, response } = require('./_db');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('./_auth');

const TABLE = 'appointments';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    switch (event.httpMethod) {
      case 'GET': {
        const { id, start, end, deal_id, assigned_to } = event.queryStringParameters || {};

        if (id) {
          const row = await getRow(TABLE, id);
          if (!row) return response(404, { error: 'アポイントメントが見つかりません' });
          return response(200, row);
        }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
        let query = supabase.from(TABLE).select('*');

        if (start) query = query.gte('start_at', start);
        if (end)   query = query.lte('start_at', end);
        if (deal_id)     query = query.eq('deal_id', deal_id);
        if (assigned_to) query = query.eq('assigned_to', assigned_to);

        query = query.order('start_at', { ascending: true });
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return response(200, data || []);
      }

      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        if (!body.title)    return response(400, { error: 'title が必要です' });
        if (!body.start_at) return response(400, { error: 'start_at が必要です' });

        const now = new Date().toISOString();
        const result = await insertRow(TABLE, {
          ...body,
          created_by: auth.user?.email || null,
          created_at: now,
          updated_at: now,
        });
        return response(201, result);
      }

      case 'PUT': {
        const body = JSON.parse(event.body || '{}');
        if (!body.id) return response(400, { error: 'id が必要です' });
        const { id, ...rest } = body;
        await updateRow(TABLE, id, { ...rest, updated_at: new Date().toISOString() });
        return response(200, { ok: true });
      }

      case 'DELETE': {
        const id = event.queryStringParameters?.id;
        if (!id) return response(400, { error: 'id が必要です' });
        await deleteRow(TABLE, id);
        return response(200, { ok: true });
      }

      default:
        return response(405, { error: 'Method Not Allowed' });
    }
  } catch (err) {
    return response(500, { error: err.message });
  }
};
