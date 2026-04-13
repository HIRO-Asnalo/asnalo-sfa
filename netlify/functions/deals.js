/**
 * FS案件 CRUD API
 * GET    /api/deals        → 一覧
 * GET    /api/deals?id=xxx → 1件取得
 * POST   /api/deals        → 新規作成
 * PUT    /api/deals        → 更新（body に id 含む）
 * DELETE /api/deals?id=xxx → 削除
 */

const { getRows, getRow, insertRow, updateRow, deleteRow, response } = require('./_db');
const { requireAuth } = require('./_auth');

const TABLE = 'deals';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    switch (event.httpMethod) {
      case 'GET': {
        const id = event.queryStringParameters?.id;
        if (id) {
          const row = await getRow(TABLE, id);
          if (!row) return response(404, { error: '案件が見つかりません' });
          return response(200, row);
        }
        return response(200, await getRows(TABLE));
      }

      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        const now = new Date().toISOString();
        const result = await insertRow(TABLE, { ...body, created_at: now, updated_at: now });
        return response(201, result);
      }

      case 'PUT': {
        const body = JSON.parse(event.body || '{}');
        if (!body.id) return response(400, { error: 'id が必要です' });
        const { id, ...rest } = body;
        await updateRow(TABLE, id, { ...rest, updated_at: new Date().toISOString() });
        return response(200, { success: true });
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
    console.error('deals error:', err);
    return response(500, { error: err.message });
  }
};
