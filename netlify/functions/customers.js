/**
 * 顧客マスタ CRUD API
 * GET    /api/customers           → 一覧
 * GET    /api/customers?id=xxx    → 1件取得
 * POST   /api/customers           → 新規作成
 * PUT    /api/customers           → 更新
 * DELETE /api/customers?id=xxx    → 削除
 */

const { v4: uuidv4 } = require('uuid');
const { getRows, getRow, appendRow, updateRow, deleteRow, ensureHeaders, response } = require('./_sheets');
const { requireAuth } = require('./_auth');

const SHEET = '顧客マスタ';
const HEADERS = [
  'id', 'company_name', 'industry', 'address', 'phone', 'website',
  'contact_name', 'contact_email', 'contact_phone', 'employee_count',
  'ma_subscribed', 'notes', 'created_at', 'updated_at',
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    await ensureHeaders(SHEET, HEADERS);

    switch (event.httpMethod) {
      case 'GET': {
        const id = event.queryStringParameters?.id;
        if (id) {
          const row = await getRow(SHEET, id);
          if (!row) return response(404, { error: '顧客が見つかりません' });
          return response(200, row);
        }
        const rows = await getRows(SHEET);
        return response(200, rows);
      }

      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        if (!body.company_name) return response(400, { error: '顧客名は必須です' });
        const now = new Date().toISOString();
        const newCustomer = {
          id: uuidv4(),
          ma_subscribed: 'false',
          ...body,
          created_at: now,
          updated_at: now,
        };
        await appendRow(SHEET, newCustomer);
        return response(201, newCustomer);
      }

      case 'PUT': {
        const body = JSON.parse(event.body || '{}');
        if (!body.id) return response(400, { error: 'id が必要です' });
        await updateRow(SHEET, body.id, { ...body, updated_at: new Date().toISOString() });
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
    console.error('customers error:', err);
    return response(500, { error: err.message });
  }
};
