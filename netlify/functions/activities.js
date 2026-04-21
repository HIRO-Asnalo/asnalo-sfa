/**
 * 活動履歴 / タスク API
 * GET    /api/activities?deal_id=xxx           → 案件の履歴一覧
 * GET    /api/activities?customer_id=xxx       → 顧客の履歴一覧
 * GET    /api/activities?tasks=true            → 全未完了タスク（ダッシュボード用）
 * GET    /api/activities?tasks=true&assigned_to=xxx → 担当者絞り込み
 * POST   /api/activities                       → 履歴/タスク追加
 * PUT    /api/activities                       → タスクステータス更新
 * DELETE /api/activities?id=xxx               → 削除
 */

const { getRows, insertRow, updateRow, deleteRow, response } = require('./_db');
const { requireAuth } = require('./_auth');

const TABLE = 'activities';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    switch (event.httpMethod) {
      case 'GET': {
        const { deal_id, customer_id, tasks, assigned_to } = event.queryStringParameters || {};

        if (tasks === 'true') {
          // ダッシュボード用: 全未完了タスクを返す
          let rows = await getRows(TABLE, { is_task: true });
          rows = rows.filter(r => r.status !== 'done');
          if (assigned_to) rows = rows.filter(r => r.assigned_to === assigned_to);
          rows.sort((a, b) => (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1);
          return response(200, rows);
        }

        const filters = {};
        if (deal_id)     filters.deal_id     = deal_id;
        if (customer_id) filters.customer_id = customer_id;
        const rows = await getRows(TABLE, filters);
        // 活動ログとタスクを分けて返す（is_task=true が先、次に活動日降順）
        rows.sort((a, b) => {
          if (a.is_task && !b.is_task) return -1;
          if (!a.is_task && b.is_task) return 1;
          return (b.activity_date || b.created_at || '') < (a.activity_date || a.created_at || '') ? -1 : 1;
        });
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
          // タスク用
          is_task:       body.is_task       || false,
          due_date:      body.due_date      || null,
          assigned_to:   body.assigned_to   || null,
          status:        body.status        || 'pending',
        });
        return response(201, result);
      }

      case 'PUT': {
        const body = JSON.parse(event.body || '{}');
        if (!body.id) return response(400, { error: 'id が必要です' });
        const updates = {};
        if (body.status    !== undefined) updates.status      = body.status;
        if (body.due_date  !== undefined) updates.due_date    = body.due_date;
        if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;
        if (body.content   !== undefined) updates.content     = body.content;
        if (!Object.keys(updates).length) return response(400, { error: '更新フィールドがありません' });
        const result = await updateRow(TABLE, body.id, updates);
        return response(200, result);
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
