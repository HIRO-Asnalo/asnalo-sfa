/**
 * FS案件 CRUD API
 * GET    /api/deals           → 一覧
 * GET    /api/deals?id=xxx    → 1件取得
 * POST   /api/deals           → 新規作成
 * PUT    /api/deals           → 更新（body に id 含む）
 * DELETE /api/deals?id=xxx    → 削除
 */

const { v4: uuidv4 } = require('uuid');
const { getRows, getRow, appendRow, updateRow, deleteRow, ensureHeaders, response } = require('./_sheets');
const { requireAuth } = require('./_auth');

const SHEET = 'FS案件';
const HEADERS = [
  'id', 'company_name', 'deal_name', 'pattern', 'phase', 'expected_close_date',
  'channel', 'checklist', 'appointment_date', 'appointment_bg', 'first_visit_date',
  'proposal_date', 'meeting3', 'meeting4', 'budget', 'authority', 'needs',
  'timeframe', 'competitor', 'human_resources', 'hire_count', 'job_types',
  'hire_target', 'past_results', 'identify_pain', 'pain_assumption', 'red_flag',
  'selection_month', 'joy_seeds', 'grip_point', 'loss_reason', 'screen2_fail',
  'screen3_fail', 'screen4_fail', 'resign_reason', 'final_fail', 'next_action',
  'assigned_user', 'contact_person', 'agency', 'tags', 'memo',
  'created_at', 'updated_at',
];

exports.handler = async (event) => {
  // CORS プリフライト
  if (event.httpMethod === 'OPTIONS') {
    return response(204, {});
  }

  // 認証チェック
  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    await ensureHeaders(SHEET, HEADERS);

    switch (event.httpMethod) {
      case 'GET': {
        const id = event.queryStringParameters?.id;
        if (id) {
          const row = await getRow(SHEET, id);
          if (!row) return response(404, { error: '案件が見つかりません' });
          return response(200, row);
        }
        const rows = await getRows(SHEET);
        return response(200, rows);
      }

      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        const now = new Date().toISOString();
        const newDeal = {
          id: uuidv4(),
          ...body,
          created_at: now,
          updated_at: now,
        };
        await appendRow(SHEET, newDeal);
        return response(201, newDeal);
      }

      case 'PUT': {
        const body = JSON.parse(event.body || '{}');
        if (!body.id) return response(400, { error: 'id が必要です' });
        const now = new Date().toISOString();
        await updateRow(SHEET, body.id, { ...body, updated_at: now });
        return response(200, { success: true });
      }

      case 'DELETE': {
        const id = event.queryStringParameters?.id;
        if (!id) return response(400, { error: 'id が必要です' });
        await deleteRow(SHEET, id);
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
