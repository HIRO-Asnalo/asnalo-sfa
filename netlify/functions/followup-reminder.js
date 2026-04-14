/**
 * フォローアップリマインダー API
 * POST /api/followup-reminder → 未更新案件をSlack通知
 * CRON_SECRET ヘッダーで認証（GASからの定期実行用）
 */

const { getRows, response } = require('./_db');
const { requireAuth } = require('./_auth');
const { notifyStaleDeals } = require('./_slack');

const ACTIVE_PHASES = ['認知商談', 'ヒアリング', '提案', 'クロージング'];
const DEFAULT_STALE_DAYS = 7;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  // CRON_SECRET による自動実行バイパス
  const cronSecret = process.env.CRON_SECRET;
  const cronHeader = event.headers?.['x-cron-secret'];
  const isCron = cronSecret && cronHeader === cronSecret;

  if (!isCron) {
    const auth = requireAuth(event);
    if (auth.error) return auth;
  }

  if (event.httpMethod !== 'POST') return response(405, { error: 'Method Not Allowed' });

  try {
    const body = JSON.parse(event.body || '{}');
    const staleDays = parseInt(body.stale_days) || DEFAULT_STALE_DAYS;
    const threshold = new Date(Date.now() - staleDays * 86400000);

    const allDeals = await getRows('deals');

    const stale = allDeals
      .filter(d => ACTIVE_PHASES.includes(d.phase))
      .filter(d => d.updated_at && new Date(d.updated_at) < threshold)
      .map(d => ({
        ...d,
        staleDays: Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000),
      }))
      .sort((a, b) => b.staleDays - a.staleDays);

    if (stale.length > 0) {
      await notifyStaleDeals(stale, staleDays);
    }

    return response(200, {
      checked: allDeals.length,
      stale: stale.length,
      notified: stale.length > 0,
      deals: stale.map(d => ({ id: d.id, deal_name: d.deal_name, staleDays: d.staleDays })),
    });
  } catch (err) {
    console.error('followup-reminder error:', err);
    return response(500, { error: err.message });
  }
};
