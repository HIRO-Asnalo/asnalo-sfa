/**
 * 目標管理 API
 * GET    /api/goals?year=2026&month=4 → 月次目標取得
 * POST   /api/goals                   → 目標を作成/更新（upsert）
 */

const { getRows, insertRow, updateRow, response } = require('./_db');
const { requireAuth } = require('./_auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    if (event.httpMethod === 'GET') {
      const { year, month } = event.queryStringParameters || {};
      const now = new Date();
      const y = year  || now.getFullYear();
      const m = month || now.getMonth() + 1;
      const rows = await getRows('goals', { year: String(y), month: String(m) });
      return response(200, rows[0] || null);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { year, month, deal_count, revenue, activity_count } = body;
      if (!year || !month) return response(400, { error: 'year と month が必要です' });

      const existing = await getRows('goals', { year: String(year), month: String(month) });
      if (existing.length) {
        await updateRow('goals', existing[0].id, { deal_count, revenue, activity_count });
        return response(200, { ...existing[0], deal_count, revenue, activity_count });
      }
      const result = await insertRow('goals', {
        year: String(year), month: String(month),
        deal_count, revenue, activity_count,
      });
      return response(201, result);
    }

    return response(405, { error: 'Method Not Allowed' });
  } catch (err) {
    console.error('goals error:', err);
    return response(500, { error: err.message });
  }
};
