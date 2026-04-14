/**
 * 認証ヘルパー
 * Netlify Identity の JWT トークンを検証する
 */

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    // base64url → base64 変換（パディング補完含む）
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (e) {
    console.error('JWT decode error:', e.message);
    return null;
  }
}

/**
 * リクエストからユーザー情報を取得
 * @returns {object|null} ユーザー情報 or null（未認証）
 */
function getUser(event) {
  const auth = event.headers.authorization || event.headers.Authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const payload = decodeJWT(token);
  if (!payload) return null;
  // 有効期限チェック
  if (payload.exp && payload.exp < Date.now() / 1000) return null;
  return payload;
}

/**
 * 認証必須ミドルウェア
 * 未認証の場合は 401 を返す
 */
function requireAuth(event) {
  // ローカル開発時は認証をバイパス
  if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
    return { error: false, user: { email: 'dev@local', sub: 'dev' } };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    console.error('[auth] no Authorization header');
    return { error: true, statusCode: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: '認証が必要です', debug: 'no_header' }) };
  }
  if (!authHeader.startsWith('Bearer ')) {
    console.error('[auth] bad Bearer format');
    return { error: true, statusCode: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: '認証が必要です', debug: 'bad_format' }) };
  }
  const token = authHeader.slice(7);
  const payload = decodeJWT(token);
  if (!payload) {
    console.error('[auth] JWT decode failed, token prefix:', token.slice(0, 20));
    return { error: true, statusCode: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: '認証が必要です', debug: 'decode_failed' }) };
  }
  if (payload.exp && payload.exp < Date.now() / 1000) {
    console.error('[auth] token expired, exp:', payload.exp, 'now:', Math.floor(Date.now()/1000));
    return { error: true, statusCode: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: '認証が必要です', debug: 'expired' }) };
  }
  return { error: false, user: payload };
}

module.exports = { getUser, requireAuth };
