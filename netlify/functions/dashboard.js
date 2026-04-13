/**
 * ダッシュボード統計 API
 * GET /api/dashboard → 各種KPIを返す
 */

const { getRows, response } = require('./_db');
const { requireAuth } = require('./_auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    const [deals, customers, activities] = await Promise.all([
      getRows('deals'),
      getRows('customers'),
      getRows('activities'),
    ]);

    const now = new Date();
    const thisMonth   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const weekStart   = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const activeDeals = deals.filter(d => !['受注', '失注'].includes(d.phase));
    const wonDeals    = deals.filter(d => d.phase === '受注');
    const lostDeals   = deals.filter(d => d.phase === '失注');
    const closedTotal = wonDeals.length + lostDeals.length;
    const winRate     = closedTotal > 0 ? Math.round(wonDeals.length / closedTotal * 100) : 0;

    const closingThisMonth = deals.filter(d =>
      !['受注','失注'].includes(d.phase) && d.expected_close_date?.startsWith(thisMonth)
    );

    const weekActivities = activities.filter(a => a.activity_date >= weekStartStr);

    const phaseCount = {};
    deals.forEach(d => {
      const p = d.phase || '未設定';
      phaseCount[p] = (phaseCount[p] || 0) + 1;
    });

    const recentDeals = [...deals]
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
      .slice(0, 5);

    const recentActivities = [...activities]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 10);

    return response(200, {
      summary: {
        active_deals:       activeDeals.length,
        total_customers:    customers.length,
        win_rate:           winRate,
        closing_this_month: closingThisMonth.length,
        week_activities:    weekActivities.length,
      },
      phase_count:        phaseCount,
      recent_deals:       recentDeals,
      recent_activities:  recentActivities,
    });
  } catch (err) {
    console.error('dashboard error:', err);
    return response(500, { error: err.message });
  }
};
