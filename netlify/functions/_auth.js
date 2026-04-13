/**
 * 認証ヘルパー
 * Netlify Identity の JWT トークンを検証する
 */

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
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
  const user = getUser(event);
  if (!user) {
    return {
      error: true,
      statusCode: 401,
      body: JSON.stringify({ error: '認証が必要です' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
  return { error: false, user };
}

module.exports = { getUser, requireAuth };
