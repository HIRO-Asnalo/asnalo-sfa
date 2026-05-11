/**
 * 営業ターゲットスプレッドシート → leadsテーブル 同期 API
 * POST /api/leads-sync
 *
 * 環境変数:
 *   SALES_TARGET_SPREADSHEET_ID : 営業ターゲットのスプレッドシートID
 *   SALES_TARGET_SHEET_NAME     : シート名（省略時は "営業ターゲット"）
 *   GOOGLE_SERVICE_ACCOUNT      : サービスアカウントJSON
 */

const { getRows, insertRow, response } = require('./_db');
const { requireAuth } = require('./_auth');
const { google } = require('googleapis');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  if (event.httpMethod !== 'POST') return response(405, { error: 'POST only' });

  const auth = requireAuth(event);
  if (auth.error) return auth;

  const spreadsheetId = process.env.SALES_TARGET_SPREADSHEET_ID;
  if (!spreadsheetId) {
    return response(400, { error: 'SALES_TARGET_SPREADSHEET_ID が設定されていません。Netlify環境変数に追加してください。' });
  }

  const sheetName = process.env.SALES_TARGET_SHEET_NAME || '営業ターゲット';

  try {
    // Google Sheets から読み込み
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const googleAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth: googleAuth });

    const sheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });

    const rows = sheetRes.data.values || [];
    if (rows.length < 2) return response(200, { added: 0, skipped: 0, message: 'データなし' });

    const headers = rows[0];
    const COL = {
      company_name:   ['会社名','企業名','company_name'],
      industry:       ['業種','industry'],
      employee_count: ['従業員数','employee_count'],
      contact_name:   ['担当者名','担当者','contact_name'],
      contact_email:  ['メール','email','contact_email'],
      contact_phone:  ['電話','電話番号','contact_phone'],
      score:          ['スコア','採用スコア','score'],
      source:         ['ソース','流入元','source'],
    };

    const colIndex = {};
    for (const [key, names] of Object.entries(COL)) {
      colIndex[key] = headers.findIndex(h => names.includes((h || '').trim()));
    }

    // 既存リードの企業名一覧
    const existing = await getRows('leads');
    const existingNames = new Set(existing.map(r => (r.company_name || '').trim().toLowerCase()));

    let added = 0, skipped = 0;
    const now = new Date().toISOString();

    for (const row of rows.slice(1)) {
      const val = (key) => (colIndex[key] >= 0 ? (row[colIndex[key]] || '').trim() : '');
      const companyName = val('company_name');
      if (!companyName) { skipped++; continue; }
      if (existingNames.has(companyName.toLowerCase())) { skipped++; continue; }

      await insertRow('leads', {
        company_name:   companyName,
        industry:       val('industry'),
        employee_count: val('employee_count'),
        contact_name:   val('contact_name'),
        contact_email:  val('contact_email'),
        contact_phone:  val('contact_phone'),
        score:          val('score') ? parseInt(val('score')) || null : null,
        source:         val('source') || 'スプレッドシート',
        status:         '未対応',
        created_at:     now,
        updated_at:     now,
      });
      existingNames.add(companyName.toLowerCase());
      added++;
    }

    return response(200, { added, skipped });
  } catch (err) {
    console.error('leads-sync error:', err);
    return response(500, { error: err.message });
  }
};
