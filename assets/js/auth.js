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

  function getToken() {
    return _user?.token?.access_token || '';
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
