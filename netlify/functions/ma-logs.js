/**
 * MA配信ログ API
 * GET /api/ma-logs?sequence_id=xxx → シナリオの配信ログ一覧
 */

const { getRows, response } = require('./_db');
const { requireAuth } = require('./_auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  const auth = requireAuth(event);
  if (auth.error) return auth;

  if (event.httpMethod !== 'GET') return response(405, { error: 'Method Not Allowed' });

  const sequence_id = event.queryStringParameters?.sequence_id;

  try {
    const filters = sequence_id ? { sequence_id } : {};
    const sends = await getRows('ma_sends', filters);

    // 集計: シナリオ単位の統計
    const total   = sends.length;
    const sent    = sends.filter(s => s.status === '送信済み').length;
    const opened  = sends.filter(s => s.opened_at).length;
    const errors  = sends.filter(s => s.status === 'エラー').length;
    const pending = sends.filter(s => s.status === '未送信').length;

    return response(200, {
      stats: { total, sent, opened, errors, pending },
      logs: sends,
    });
  } catch (err) {
    console.error('ma-logs error:', err);
    return response(500, { error: err.message });
  }
};
