/**
 * 社内Wiki API
 * GET    /api/wiki          → 一覧
 * GET    /api/wiki?id=xxx   → 1件取得
 * POST   /api/wiki          → 作成
 * PUT    /api/wiki          → 更新
 * DELETE /api/wiki?id=xxx  → 削除
 */
const { getRows, getRow, insertRow, updateRow, deleteRow, response } = require('./_db');
const { requireAuth } = require('./_auth');
const TABLE = 'wiki_pages';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    switch (event.httpMethod) {
      case 'GET': {
        const { id } = event.queryStringParameters || {};
        if (id) {
          const row = await getRow(TABLE, id);
          if (!row) return response(404, { error: 'Not found' });
          return response(200, row);
        }
        const rows = await getRows(TABLE);
        rows.sort((a, b) => (b.updated_at || '') < (a.updated_at || '') ? -1 : 1);
        return response(200, rows);
      }
      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        if (!body.title) return response(400, { error: 'タイトルは必須です' });
        const now = new Date().toISOString();
        const result = await insertRow(TABLE, {
          title:    body.title,
          content:  body.content || '',
          category: body.category || 'その他',
          author:   auth.user?.email || '',
          created_at: now,
          updated_at: now,
        });
        return response(201, result);
      }
      case 'PUT': {
        const body = JSON.parse(event.body || '{}');
        if (!body.id) return response(400, { error: 'id が必要です' });
        const result = await updateRow(TABLE, body.id, {
          title:      body.title,
          content:    body.content,
          category:   body.category,
          updated_at: new Date().toISOString(),
        });
        return response(200, result);
      }
      case 'DELETE': {
        const id = event.queryStringParameters?.id;
        if (!id) return response(400, { error: 'id が必要です' });
        await deleteRow(TABLE, id);
        return response(200, { success: true });
      }
      default: return response(405, { error: 'Method Not Allowed' });
    }
  } catch (err) {
    console.error('wiki error:', err);
    return response(500, { error: err.message });
  }
};
