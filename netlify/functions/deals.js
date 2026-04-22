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
const { notifyDealCreated, notifyPhaseChanged } = require('./_slack');

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

        // 重複チェック（force=trueで強制登録）
        if (!body.force && body.company_name) {
          const existing = await getRows(TABLE, { company_name: body.company_name });
          const active = existing.filter(d => !['受注', '失注'].includes(d.phase));
          if (active.length > 0) {
            return response(409, {
              duplicate: true,
              existing_count: active.length,
              error: `「${body.company_name}」の進行中案件が既に${active.length}件存在します`,
            });
          }
        }

        const { force, ...insertData } = body;
        const now = new Date().toISOString();
        const result = await insertRow(TABLE, { ...insertData, created_at: now, updated_at: now });
        notifyDealCreated(result, auth.user?.email).catch(() => {});
        return response(201, result);
      }

      case 'PUT': {
        const body = JSON.parse(event.body || '{}');
        if (!body.id) return response(400, { error: 'id が必要です' });
        const { id, ...rest } = body;
        // フェーズ変更チェック
        if (rest.phase) {
          const oldDeal = await getRow(TABLE, id).catch(() => null);
          if (oldDeal && oldDeal.phase !== rest.phase) {
            notifyPhaseChanged({ ...oldDeal, ...rest }, oldDeal.phase, auth.user?.email).catch(() => {});
          }
        }
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
