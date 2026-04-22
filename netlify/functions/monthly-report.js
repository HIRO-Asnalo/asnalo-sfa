/**
 * 月次営業レポート生成 → Slack投稿
 * POST /api/monthly-report
 *   - x-cron-secret ヘッダー（GAS経由）または Netlify Identity 認証
 *   - クエリ: ?year=2026&month=3（省略時は先月）
 */

const { getRows, response } = require('./_db');
const { requireAuth } = require('./_auth');
const { notifyMonthlyReport } = require('./_slack');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  // GAS CRON または通常認証
  const cronSecret = process.env.CRON_SECRET;
  const sentSecret = event.headers?.['x-cron-secret'];
  const isGas = cronSecret && sentSecret === cronSecret;

  if (!isGas) {
    const auth = requireAuth(event);
    if (auth.error) return auth;
  }

  try {
    const now = new Date();
    // 先月を算出
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const year  = parseInt(event.queryStringParameters?.year  || prevYear);
    const month = parseInt(event.queryStringParameters?.month || prevMonth);

    const start = new Date(year, month - 1, 1).toISOString();
    const end   = new Date(year, month, 1).toISOString();

    // 全案件を取得してJSでフィルタリング
    const allDeals = await getRows('deals');

    const newDeals  = allDeals.filter(d => d.created_at >= start && d.created_at < end);
    const wonDeals  = allDeals.filter(d => d.phase === '受注' && d.updated_at >= start && d.updated_at < end);
    const lostDeals = allDeals.filter(d => d.phase === '失注' && d.updated_at >= start && d.updated_at < end);
    const activeDeals = allDeals.filter(d => !['受注', '失注'].includes(d.phase));

    const revenue  = wonDeals.reduce((s, d)  => s + (Number(d.expected_amount) || 0), 0);
    const pipeline = activeDeals.reduce((s, d) => s + (Number(d.expected_amount) || 0), 0);

    // 活動数（activity_date は YYYY-MM-DD）
    let activityCount = 0;
    try {
      const allActivities = await getRows('activities');
      activityCount = allActivities.filter(a =>
        a.activity_date >= start.slice(0, 10) && a.activity_date < end.slice(0, 10)
      ).length;
    } catch (e) { /* テーブルなければスキップ */ }

    // MA送信数
    let maSent = 0;
    try {
      const allSends = await getRows('ma_sends');
      maSent = allSends.filter(s =>
        s.status === 'sent' && s.sent_at && s.sent_at >= start && s.sent_at < end
      ).length;
    } catch (e) { /* テーブルなければスキップ */ }

    const stats = {
      new_deals:  newDeals.length,
      won_count:  wonDeals.length,
      lost_count: lostDeals.length,
      revenue,
      pipeline,
      activities: activityCount,
      ma_sent:    maSent,
    };

    await notifyMonthlyReport(stats, year, month);

    return response(200, { success: true, year, month, stats });
  } catch (err) {
    console.error('monthly-report error:', err);
    return response(500, { error: err.message });
  }
};
