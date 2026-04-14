/**
 * MAステップ CRUD API
 * POST   /api/ma-steps → 追加
 * PUT    /api/ma-steps → 更新
 * DELETE /api/ma-steps?id=xxx → 削除
 */

const { insertRow, updateRow, deleteRow, response } = require('./_db');
const { requireAuth } = require('./_auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    switch (event.httpMethod) {
      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        const result = await insertRow('ma_steps', {
          sequence_id: body.sequence_id,
          step_order:  body.step_order  || 1,
          delay_days:  body.delay_days  || 0,
          subject:     body.subject     || '',
          body:        body.body        || '',
        });
        return response(201, result);
      }
      case 'PUT': {
        const body = JSON.parse(event.body || '{}');
        if (!body.id) return response(400, { error: 'id が必要です' });
        const { id, ...rest } = body;
        await updateRow('ma_steps', id, rest);
        return response(200, { success: true });
      }
      case 'DELETE': {
        const id = event.queryStringParameters?.id;
        if (!id) return response(400, { error: 'id が必要です' });
        await deleteRow('ma_steps', id);
        return response(200, { success: true });
      }
      default:
        return response(405, { error: 'Method Not Allowed' });
    }
  } catch (err) {
    console.error('ma-steps error:', err);
    return response(500, { error: err.message });
  }
};
