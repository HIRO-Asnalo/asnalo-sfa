/**
 * 活動履歴 API
 * GET    /api/activities?deal_id=xxx     → 案件の履歴一覧
 * GET    /api/activities?customer_id=xxx → 顧客の履歴一覧
 * POST   /api/activities                 → 履歴追加
 * DELETE /api/activities?id=xxx          → 削除
 */

const { getRows, insertRow, deleteRow, response } = require('./_db');
const { requireAuth } = require('./_auth');

const TABLE = 'activities';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    switch (event.httpMethod) {
      case 'GET': {
        const { deal_id, customer_id } = event.queryStringParameters || {};
        const filters = {};
        if (deal_id)     filters.deal_id     = deal_id;
        if (customer_id) filters.customer_id = customer_id;
        const rows = await getRows(TABLE, filters);
        return response(200, rows);
      }

      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        const now = new Date().toISOString();
        const result = await insertRow(TABLE, {
          deal_id:       body.deal_id       || null,
          customer_id:   body.customer_id   || null,
          type:          body.type          || 'メモ',
          content:       body.content       || '',
          activity_date: body.activity_date || now.slice(0, 10),
          user_name:     auth.user?.email   || '',
          created_at:    now,
        });
        return response(201, result);
      }

      case 'DELETE': {
        const id = event.queryStringParameters?.id;
        if (!id) return response(400, { error: 'id が必要です' });
        await deleteRow(TABLE, id);
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
