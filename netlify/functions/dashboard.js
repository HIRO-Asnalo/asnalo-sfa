/**
 * ダッシュボード統計 API
 * GET /api/dashboard → 各種KPIを返す
 */

const { getRows, response } = require('./_sheets');
const { requireAuth } = require('./_auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    const [deals, customers, activities] = await Promise.all([
      getRows('FS案件'),
      getRows('顧客マスタ'),
      getRows('コンタクト履歴'),
    ]);

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay() + 1); // 月曜
    const thisWeekStr = thisWeekStart.toISOString().slice(0, 10);

    // フェーズ別案件数
    const phaseCount = {};
    deals.forEach(d => {
      const p = d.phase || '未設定';
      phaseCount[p] = (phaseCount[p] || 0) + 1;
    });

    // 受注案件（フェーズ = 受注）
    const wonDeals = deals.filter(d => d.phase === '受注');
    const lostDeals = deals.filter(d => d.phase === '失注');
    const activeDeals = deals.filter(d => !['受注', '失注'].includes(d.phase));

    // 今月の受注予定
    const closingThisMonth = deals.filter(d =>
      d.phase !== '受注' && d.phase !== '失注' &&
      d.expected_close_date?.startsWith(thisMonth)
    );

    // 受注率
    const closedTotal = wonDeals.length + lostDeals.length;
    const winRate = closedTotal > 0 ? Math.round((wonDeals.length / closedTotal) * 100) : 0;

    // 今週の活動数
    const weekActivities = activities.filter(a => a.activity_date >= thisWeekStr);

    // 直近10件の活動
    const recentActivities = [...activities]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 10);

    // 直近5件の更新案件
    const recentDeals = [...deals]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 5);

    return response(200, {
      summary: {
        total_deals: deals.length,
        active_deals: activeDeals.length,
        total_customers: customers.length,
        win_rate: winRate,
        closing_this_month: closingThisMonth.length,
        week_activities: weekActivities.length,
      },
      phase_count: phaseCount,
      recent_deals: recentDeals,
      recent_activities: recentActivities,
    });
  } catch (err) {
    console.error('dashboard error:', err);
    return response(500, { error: err.message });
  }
};
