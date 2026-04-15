/**
 * リード受付 API（ウェブフォーム連携）
 * POST /api/leads → 認証不要。お問い合わせフォームから受信して案件を自動作成
 *
 * 対応フィールド（フォームから送信）:
 *   company_name, contact_name, contact_email, contact_phone,
 *   inquiry, source（流入元: HP/LP/紹介等）
 */

const { insertRow, response } = require('./_db');
const { notifyDealCreated } = require('./_slack');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') return response(405, { error: 'Method Not Allowed' });

  // LEAD_SECRET によるシンプル認証（省略可）
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

    // 案件を自動作成
    const deal = await insertRow('deals', {
      deal_name:    `【新規リード】${company_name || contact_name || 'Unknown'}`,
      company_name: company_name || '',
      phase:        '認知商談',
      memo:         [
        inquiry    ? `【お問い合わせ内容】\n${inquiry}` : '',
        source     ? `【流入元】${source}` : '',
        contact_name  ? `【担当者名】${contact_name}` : '',
        contact_email ? `【メール】${contact_email}` : '',
        contact_phone ? `【電話】${contact_phone}` : '',
      ].filter(Boolean).join('\n\n'),
      channel:      source || 'HP',
      created_at:   now,
      updated_at:   now,
    });

    // Slack通知
    notifyDealCreated(deal, 'ウェブフォーム').catch(() => {});

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, deal_id: deal.id }),
    };
  } catch (err) {
    console.error('leads error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
