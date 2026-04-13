/**
 * Supabase DB ヘルパー（_sheets.js の代替）
 * 全 Netlify Functions から共通で使う CRUD ユーティリティ
 */

const { createClient } = require('@supabase/supabase-js');

let _client = null;

function getClient() {
  if (_client) return _client;
  _client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );
  return _client;
}

/** テーブル全行取得（filtersはオブジェクト {key: value}） */
async function getRows(table, filters = {}) {
  let query = getClient().from(table).select('*');
  for (const [key, val] of Object.entries(filters)) {
    query = query.eq(key, val);
  }
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

/** id で1行取得 */
async function getRow(table, id) {
  const { data, error } = await getClient()
    .from(table).select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

/** 新規行を追加（単行） */
async function insertRow(table, data) {
  const { data: result, error } = await getClient()
    .from(table).insert(data).select().single();
  if (error) throw new Error(error.message);
  return result;
}

/** 複数行を一括追加 */
async function insertRows(table, rows) {
  const { data, error } = await getClient()
    .from(table).insert(rows).select();
  if (error) throw new Error(error.message);
  return data || [];
}

/** id が一致する行を更新 */
async function updateRow(table, id, data) {
  const { error } = await getClient()
    .from(table).update(data).eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

/** id が一致する行を削除 */
async function deleteRow(table, id) {
  const { error } = await getClient()
    .from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
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

module.exports = { getRows, getRow, insertRow, insertRows, updateRow, deleteRow, response };
