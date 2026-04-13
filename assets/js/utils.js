/**
 * 共通ユーティリティ
 */

// ===== Toast 通知 =====
const Toast = (() => {
  let container;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    getContainer().appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }

  return {
    success: (msg) => show(msg, 'success'),
    error:   (msg) => show(msg, 'error', 4000),
    info:    (msg) => show(msg, 'info'),
  };
})();

// ===== ローディング =====
const Loading = (() => {
  let overlay;

  function show() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
  }

  function hide() {
    overlay?.remove();
    overlay = null;
  }

  return { show, hide };
})();

// ===== 日付フォーマット =====
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function fmtDatetime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

// ===== フェーズ → バッジクラス =====
function phaseBadge(phase) {
  const map = {
    '認知商談':    'badge-gray',
    'ヒアリング': 'badge-blue',
    '提案':       'badge-yellow',
    'クロージング': 'badge-orange',
    '受注':       'badge-green',
    '失注':       'badge-red',
  };
  return `<span class="badge phase-badge ${map[phase] || 'badge-gray'}">${phase || '—'}</span>`;
}

// ===== URL パラメータ取得 =====
function getParam(key) {
  return new URLSearchParams(location.search).get(key);
}

// ===== 確認ダイアログ =====
function confirm(message) {
  return window.confirm(message);
}

// ===== サイドバー アクティブ設定 =====
function setActiveNav() {
  const path = location.pathname;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
    const href = el.getAttribute('href');
    if (href === '/' && (path === '/' || path === '/index.html')) {
      el.classList.add('active');
    } else if (href !== '/' && path.startsWith(href)) {
      el.classList.add('active');
    }
  });
}

// ===== サイドバーユーザー表示 =====
function renderSidebarUser(user) {
  const el = document.getElementById('sidebarUser');
  if (!el || !user) return;
  el.innerHTML = `
    <div class="user-name">${user.user_metadata?.full_name || user.email}</div>
    <div class="text-sm">${user.email}</div>
    <button class="logout-btn" onclick="Auth.logout()">ログアウト</button>
  `;
}

// ===== 共通ページ初期化 =====
function initPage(onReady) {
  Auth.init(
    (user) => {
      renderSidebarUser(user);
      setActiveNav();
      onReady?.(user);
    },
    () => {}
  );
}

// ===== 顧客名を ID から引く（キャッシュ） =====
let _customersCache = null;

async function getCustomersMap() {
  if (_customersCache) return _customersCache;
  const list = await API.customers.list();
  _customersCache = Object.fromEntries(list.map(c => [c.id, c]));
  return _customersCache;
}

// ===== フォームから object を生成 =====
function formToObject(form) {
  const fd = new FormData(form);
  const obj = {};
  fd.forEach((val, key) => {
    if (obj[key]) {
      obj[key] = Array.isArray(obj[key]) ? [...obj[key], val] : [obj[key], val];
    } else {
      obj[key] = val;
    }
  });
  return obj;
}
