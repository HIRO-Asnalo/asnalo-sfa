/**
 * 見積書・請求書 CRUD API
 * GET    /api/invoices              → 一覧（?type=quote|invoice&status=xxx&deal_id=xxx）
 * GET    /api/invoices?id=xxx       → 1件取得
 * POST   /api/invoices              → 新規作成
 * PUT    /api/invoices              → 更新
 * DELETE /api/invoices?id=xxx       → 削除
 */

const { getRows, getRow, insertRow, updateRow, deleteRow, response } = require('./_db');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('./_auth');

const TABLE = 'invoices';

function calcTotals(items = [], taxRate = 10) {
  const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const taxAmount = Math.floor(subtotal * taxRate / 100);
  return { subtotal, tax_amount: taxAmount, total: subtotal + taxAmount };
}

async function nextNumber(type) {
  const prefix = type === 'invoice' ? 'INV' : 'QT';
  const year   = new Date().getFullYear();
  const month  = String(new Date().getMonth() + 1).padStart(2, '0');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { count } = await supabase.from(TABLE).select('*', { count: 'exact', head: true }).eq('type', type);
  const seq = String((count || 0) + 1).padStart(3, '0');
  return `${prefix}-${year}${month}-${seq}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    switch (event.httpMethod) {
      case 'GET': {
        const { id, type, status, deal_id, customer_id } = event.queryStringParameters || {};

        if (id) {
          const row = await getRow(TABLE, id);
          if (!row) return response(404, { error: '見つかりません' });
          return response(200, row);
        }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
        let query = supabase.from(TABLE).select('*');
        if (type)        query = query.eq('type', type);
        if (status)      query = query.eq('status', status);
        if (deal_id)     query = query.eq('deal_id', deal_id);
        if (customer_id) query = query.eq('customer_id', customer_id);
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return response(200, data || []);
      }

      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        const items = body.items || [];
        const taxRate = body.tax_rate ?? 10;
        const totals = calcTotals(items, taxRate);
        const number = body.number || await nextNumber(body.type || 'quote');
        const now = new Date().toISOString();

        const result = await insertRow(TABLE, {
          ...body,
          number,
          items,
          tax_rate: taxRate,
          ...totals,
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
        if (rest.items !== undefined) {
          const totals = calcTotals(rest.items, rest.tax_rate ?? 10);
          Object.assign(rest, totals);
        }
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
