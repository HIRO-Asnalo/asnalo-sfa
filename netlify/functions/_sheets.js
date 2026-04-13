/**
 * Google Sheets API ヘルパー
 * 全 Netlify Functions から共通で使う CRUD ユーティリティ
 */

const { google } = require('googleapis');

let _sheetsClient = null;

async function getClient() {
  if (_sheetsClient) return _sheetsClient;
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _sheetsClient = google.sheets({ version: 'v4', auth });
  return _sheetsClient;
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

/** シートが存在しなければ作成する */
async function ensureSheet(sheetName) {
  const client = await getClient();
  const meta = await client.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === sheetName);
  if (!exists) {
    await client.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
    });
  }
}

/** シート全行を [{header: value, ...}] で返す */
async function getRows(sheetName) {
  await ensureSheet(sheetName);
  const client = await getClient();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:ZZ`,
  });
  const rows = res.data.values || [];
  if (rows.length < 1) return [];
  const headers = rows[0];
  return rows.slice(1)
    .filter(row => row.some(c => c !== '' && c !== undefined))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj;
    });
}

/** id で1行取得 */
async function getRow(sheetName, id) {
  const rows = await getRows(sheetName);
  return rows.find(r => r.id === id) || null;
}

/** 新規行を追加（data は {header: value, ...}）*/
async function appendRow(sheetName, data) {
  const client = await getClient();
  const headRes = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!1:1`,
  });
  const headers = headRes.data.values?.[0] || [];
  const rowValues = headers.map(h => data[h] !== undefined ? String(data[h]) : '');
  await client.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [rowValues] },
  });
}

/** id が一致する行を更新 */
async function updateRow(sheetName, id, data) {
  const client = await getClient();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:ZZ`,
  });
  const rows = res.data.values || [];
  if (!rows.length) return false;
  const headers = rows[0];
  const idIdx = headers.indexOf('id');
  if (idIdx === -1) return false;
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[idIdx] === id);
  if (rowIdx === -1) return false;
  const existing = rows[rowIdx];
  const updated = headers.map((h, i) => data[h] !== undefined ? String(data[h]) : (existing[i] ?? ''));
  const lastCol = columnToLetter(headers.length);
  const rowNum = rowIdx + 1;
  await client.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowNum}:${lastCol}${rowNum}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [updated] },
  });
  return true;
}

/** id が一致する行を削除 */
async function deleteRow(sheetName, id) {
  const client = await getClient();
  const meta = await client.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) return false;
  const sheetId = sheet.properties.sheetId;

  const res = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:ZZ`,
  });
  const rows = res.data.values || [];
  if (!rows.length) return false;
  const headers = rows[0];
  const idIdx = headers.indexOf('id');
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[idIdx] === id);
  if (rowIdx === -1) return false;

  await client.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIdx, endIndex: rowIdx + 1 },
        },
      }],
    },
  });
  return true;
}

/** シートに特定のヘッダー行を初期化（シートが空の場合のみ） */
async function ensureHeaders(sheetName, headers) {
  await ensureSheet(sheetName);
  const client = await getClient();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!1:1`,
  });
  if (!res.data.values || res.data.values.length === 0) {
    await client.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [headers] },
    });
  }
}

function columnToLetter(col) {
  let letter = '';
  let n = col;
  while (n > 0) {
    const mod = (n - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    n = Math.floor((n - mod) / 26);
  }
  return letter;
}

/** CORS ヘッダー付きレスポンス生成 */
function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

module.exports = { getRows, getRow, appendRow, updateRow, deleteRow, ensureHeaders, response };
