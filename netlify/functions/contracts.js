/**
 * 契約履歴 API
 * GET    /api/contracts?customer_id=xxx → 顧客の契約一覧
 * POST   /api/contracts                 → 契約追加
 * PUT    /api/contracts                 → 契約更新
 * DELETE /api/contracts?id=xxx         → 契約削除
 */

const { getRows, insertRow, updateRow, deleteRow, response } = require('./_db');
const { requireAuth } = require('./_auth');

const TABLE = 'contracts';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  const auth = requireAuth(event);
  if (auth.error) return auth;

  try {
    switch (event.httpMethod) {
      case 'GET': {
        const { customer_id } = event.queryStringParameters || {};
        if (!customer_id) return response(400, { error: 'customer_id が必要です' });
        const rows = await getRows(TABLE, { customer_id });
        rows.sort((a, b) => (b.contract_date || '') < (a.contract_date || '') ? -1 : 1);
        return response(200, rows);
      }

      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        if (!body.customer_id) return response(400, { error: 'customer_id が必要です' });
        const now = new Date().toISOString();
        const result = await insertRow(TABLE, {
          customer_id:       body.customer_id,
          service_name:      body.service_name      || null,
          contract_date:     body.contract_date     || null,
          contract_end_date: body.contract_end_date || null,
          contract_amount:   body.contract_amount   ? parseInt(body.contract_amount) : null,
          status:            body.status            || 'active',
          notes:             body.notes             || null,
          created_at:        now,
          updated_at:        now,
        });
        return response(201, result);
      }

      case 'PUT': {
        const body = JSON.parse(event.body || '{}');
        if (!body.id) return response(400, { error: 'id が必要です' });
        const updates = {
          service_name:      body.service_name,
          contract_date:     body.contract_date     || null,
          contract_end_date: body.contract_end_date || null,
          contract_amount:   body.contract_amount   ? parseInt(body.contract_amount) : null,
          status:            body.status,
          notes:             body.notes,
          updated_at:        new Date().toISOString(),
        };
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
    console.error('contracts error:', err);
    return response(500, { error: err.message });
  }
};
