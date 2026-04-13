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

/**
 * シート名一覧キャッシュ（Warm起動間で再利用 / 並列呼び出しも1回だけ取得）
 * spreadsheets.get は高コストなので最小化する
 */
let _sheetNamesPromise = null;

async function getSheetNames() {
  if (!_sheetNamesPromise) {
    _sheetNamesPromise = (async () => {
      const client = await getClient();
      const meta = await client.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      return new Set(meta.data.sheets.map(s => s.properties.title));
    })();
  }
  return _sheetNamesPromise;
}

/** ensureHeaders 済みシートのキャッシュ（同一 warm instance 内で重複チェック不要） */
const _ensuredHeaders = new Set();

/** シートが存在しなければ作成する */
async function ensureSheet(sheetName) {
  const names = await getSheetNames();
  if (names.has(sheetName)) return;
  const client = await getClient();
  await client.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
  });
  names.add(sheetName);
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

/** シートのヘッダー行を初期化。空なら全列書き込み、不足列があれば末尾に追加する */
async function ensureHeaders(sheetName, headers) {
  if (_ensuredHeaders.has(sheetName)) return;   // キャッシュ済みならスキップ
  await ensureSheet(sheetName);
  const client = await getClient();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!1:1`,
  });
  const existing = res.data.values?.[0] || [];
  if (existing.length === 0) {
    // 空シート: 全列書き込み
    await client.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [headers] },
    });
  } else {
    // 不足列を末尾に追加（スキーマ変更時の自動マイグレーション）
    const missing = headers.filter(h => !existing.includes(h));
    if (missing.length > 0) {
      const startCol = columnToLetter(existing.length + 1);
      await client.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!${startCol}1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [missing] },
      });
    }
  }
  _ensuredHeaders.add(sheetName);
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
