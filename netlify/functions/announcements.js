/**
 * お知らせ API
 * GET    /api/announcements          → 一覧（ピン留め先頭）
 * POST   /api/announcements          → 投稿
 * PUT    /api/announcements          → 更新
 * DELETE /api/announcements?id=xxx  → 削除
 */
const { getRows, insertRow, updateRow, deleteRow, response } = require('./_db');
const { requireAuth } = require('./_auth');
const TABLE = 'announcements';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    switch (event.httpMethod) {
      case 'GET': {
        const rows = await getRows(TABLE);
        rows.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return (b.created_at || '') < (a.created_at || '') ? -1 : 1;
        });
        return response(200, rows);
      }
      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        if (!body.title) return response(400, { error: 'タイトルは必須です' });
        const now = new Date().toISOString();
        const result = await insertRow(TABLE, {
          title:   body.title,
          content: body.content || '',
          author:  auth.user?.email || '',
          pinned:  body.pinned || false,
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
          pinned:     body.pinned,
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
    console.error('announcements error:', err);
    return response(500, { error: err.message });
  }
};
