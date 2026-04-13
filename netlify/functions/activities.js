/**
 * コンタクト履歴 API
 * GET    /api/activities?deal_id=xxx   → 案件の履歴一覧
 * GET    /api/activities?customer_id=xxx → 顧客の履歴一覧
 * POST   /api/activities               → 履歴追加
 * DELETE /api/activities?id=xxx        → 削除
 */

const { v4: uuidv4 } = require('uuid');
const { getRows, appendRow, deleteRow, ensureHeaders, response } = require('./_sheets');
const { requireAuth } = require('./_auth');

const SHEET = 'コンタクト履歴';
const HEADERS = ['id', 'deal_id', 'customer_id', 'type', 'content', 'activity_date', 'user_name', 'created_at'];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    await ensureHeaders(SHEET, HEADERS);

    switch (event.httpMethod) {
      case 'GET': {
        const { deal_id, customer_id } = event.queryStringParameters || {};
        let rows = await getRows(SHEET);
        if (deal_id) rows = rows.filter(r => r.deal_id === deal_id);
        if (customer_id) rows = rows.filter(r => r.customer_id === customer_id);
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
        return response(200, rows);
      }

      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        const now = new Date().toISOString();
        const newActivity = {
          id: uuidv4(),
          deal_id: body.deal_id || '',
          customer_id: body.customer_id || '',
          type: body.type || 'メモ',
          content: body.content || '',
          activity_date: body.activity_date || now.slice(0, 10),
          user_name: auth.user?.email || '',
          created_at: now,
        };
        await appendRow(SHEET, newActivity);
        return response(201, newActivity);
      }

      case 'DELETE': {
        const id = event.queryStringParameters?.id;
        if (!id) return response(400, { error: 'id が必要です' });
        await deleteRow(SHEET, id);
        return response(200, { success: true });
      }

      default:
        return response(405, { error: 'Method Not Allowed' });
    }
  } catch (err) {
    console.error('activities error:', err);
    return response(500, { error: err.message });
  }
};
