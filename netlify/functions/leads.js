/**
 * リード API
 *
 * 認証あり（SFA内部）:
 *   GET    /api/leads        → leads テーブル一覧
 *   GET    /api/leads?id=xxx → 1件取得
 *   POST   /api/leads        → 新規作成
 *   PUT    /api/leads        → 更新
 *   DELETE /api/leads?id=xxx → 削除
 *
 * 認証なし（ウェブフォーム連携）:
 *   POST /api/leads  → deals テーブルに自動作成（既存動作を維持）
 */

const { getRows, getRow, insertRow, updateRow, deleteRow, response } = require('./_db');
const { requireAuth } = require('./_auth');
const { notifyDealCreated } = require('./_slack');

const TABLE = 'leads';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: '',
    };
  }

  // 認証トークンがあれば SFA 内部操作（CRUD）
  const hasAuth = !!(event.headers?.authorization || event.headers?.Authorization);

  if (hasAuth) {
    const auth = requireAuth(event);
    if (auth.error) return auth;

    try {
      switch (event.httpMethod) {
        case 'GET': {
          const id = event.queryStringParameters?.id;
          if (id) {
            const row = await getRow(TABLE, id);
            if (!row) return response(404, { error: 'リードが見つかりません' });
            return response(200, row);
          }
          return response(200, await getRows(TABLE));
        }

        case 'POST': {
          const body = JSON.parse(event.body || '{}');
          if (!body.company_name) return response(400, { error: '企業名は必須です' });
          const { force, ...insertData } = body;
          const now = new Date().toISOString();
          const result = await insertRow(TABLE, { ...insertData, created_at: now, updated_at: now });
          return response(201, result);
        }

        case 'PUT': {
          const body = JSON.parse(event.body || '{}');
          if (!body.id) return response(400, { error: 'id が必要です' });
          const { id, ...rest } = body;
          await updateRow(TABLE, id, { ...rest, updated_at: new Date().toISOString() });
          return response(200, { success: true });
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
      console.error('leads error:', err);
      return response(500, { error: err.message });
    }
  }

  // 認証なし → ウェブフォーム受付（既存動作）
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const leadSecret = process.env.LEAD_SECRET;
  if (leadSecret) {
    const sent = event.headers?.['x-lead-secret'] || event.queryStringParameters?.secret;
    if (sent !== leadSecret) return response(401, { error: '認証が必要です' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { company_name, contact_name, contact_email, contact_phone, inquiry, source } = body;

    if (!company_name && !contact_email) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: '会社名またはメールアドレスは必須です' }),
      };
    }

    const now = new Date().toISOString();
    const deal = await insertRow('deals', {
      deal_name:    `【新規リード】${company_name || contact_name || 'Unknown'}`,
      company_name: company_name || '',
      phase:        '認知商談',
      memo: [
        inquiry       ? `【お問い合わせ内容】\n${inquiry}` : '',
        source        ? `【流入元】${source}` : '',
        contact_name  ? `【担当者名】${contact_name}` : '',
        contact_email ? `【メール】${contact_email}` : '',
        contact_phone ? `【電話】${contact_phone}` : '',
      ].filter(Boolean).join('\n\n'),
      channel:    source || 'HP',
      created_at: now,
      updated_at: now,
    });

    notifyDealCreated(deal, 'ウェブフォーム').catch(() => {});

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, deal_id: deal.id }),
    };
  } catch (err) {
    console.error('leads (form) error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
