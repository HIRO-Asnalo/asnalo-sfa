/**
 * MAシナリオ CRUD API
 * GET    /api/ma-sequences          → 一覧
 * GET    /api/ma-sequences?id=xxx   → 1件（ステップ含む）
 * POST   /api/ma-sequences          → 新規作成
 * PUT    /api/ma-sequences          → 更新
 * DELETE /api/ma-sequences?id=xxx   → 削除
 */

const { getRows, getRow, insertRow, updateRow, deleteRow, response } = require('./_db');
const { requireAuth } = require('./_auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    switch (event.httpMethod) {
      case 'GET': {
        const id = event.queryStringParameters?.id;
        if (id) {
          const seq = await getRow('ma_sequences', id);
          const steps = await getRows('ma_steps', { sequence_id: id });
          steps.sort((a, b) => a.step_order - b.step_order);
          return response(200, { ...seq, steps });
        }
        const rows = await getRows('ma_sequences');
        return response(200, rows);
      }
      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        const result = await insertRow('ma_sequences', {
          name: body.name || '新しいシナリオ',
          description: body.description || '',
          status: '停止中',
        });
        return response(201, result);
      }
      case 'PUT': {
        const body = JSON.parse(event.body || '{}');
        if (!body.id) return response(400, { error: 'id が必要です' });
        const { id, ...rest } = body;
        await updateRow('ma_sequences', id, rest);
        return response(200, { success: true });
      }
      case 'DELETE': {
        const id = event.queryStringParameters?.id;
        if (!id) return response(400, { error: 'id が必要です' });
        await deleteRow('ma_sequences', id);
        return response(200, { success: true });
      }
      default:
        return response(405, { error: 'Method Not Allowed' });
    }
  } catch (err) {
    console.error('ma-sequences error:', err);
    return response(500, { error: err.message });
  }
};
