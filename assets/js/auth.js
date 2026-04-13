/**
 * 認証ユーティリティ
 * Netlify Identity との連携
 */

const Auth = (() => {
  let _user = null;

  function init(onLogin, onLogout) {
    if (!window.netlifyIdentity) return;
    netlifyIdentity.on('init', user => {
      _user = user;
      if (!user) {
        // ログインページ以外はログイン画面へ
        if (!location.pathname.includes('login')) {
          location.href = '/login.html';
        }
      } else {
        onLogin?.(user);
      }
    });
    netlifyIdentity.on('login', user => {
      _user = user;
      netlifyIdentity.close();
      onLogin?.(user);
      if (location.pathname.includes('login')) location.href = '/';
    });
    netlifyIdentity.on('logout', () => {
      _user = null;
      onLogout?.();
      location.href = '/login.html';
    });
    netlifyIdentity.init();
  }

  function getUser() { return _user; }

  async function getToken() {
    if (!_user) return '';
    try {
      // jwt() は期限切れ時に自動更新してくれる
      const t = await _user.jwt();
      if (t) return t;
    } catch (e) {
      console.warn('jwt() failed, falling back to refresh:', e.message);
    }
    try {
      // フォールバック: netlifyIdentity.refresh() で強制更新
      return await netlifyIdentity.refresh();
    } catch (e) {
      console.warn('refresh() failed:', e.message);
      return _user?.token?.access_token || '';
    }
  }

  function logout() {
    netlifyIdentity.logout();
  }

  function requireUser() {
    if (!_user && !location.pathname.includes('login')) {
      location.href = '/login.html';
    }
    return _user;
  }

  return { init, getUser, getToken, logout, requireUser };
})();
