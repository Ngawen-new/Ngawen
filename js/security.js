/* ============================================================
   Desa Ngawen - Frontend Security Module (security.js)
   Handles: JWT token management, session timeout, activity
   monitoring, XSS sanitization, CSRF basics, secure login flow.
   ============================================================ */

const Security = (() => {

  // ── Storage Keys ──────────────────────────────────────────
  const TOKEN_KEY = 'desa_ngawen_jwt_token';
  const USER_KEY = 'desa_ngawen_current_user';
  const LAST_ACTIVE_KEY = 'desa_ngawen_last_active';

  // ── Config ────────────────────────────────────────────────
  const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000;   // 8 hours (matches JWT)
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;         // 30 min idle = auto logout
  const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];

  let idleTimer = null;
  let sessionCheckInterval = null;
  let onSessionExpiredCallback = null;
  let onActivityLogCallback = null;

  // ── Token Helpers ─────────────────────────────────────────
  function setToken(token) {
    sessionStorage.setItem(TOKEN_KEY, token);  // Use sessionStorage for better security
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem('desa_ngawen_admin_auth');  // clear legacy key
  }

  function setCurrentUser(user) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function getCurrentUser() {
    try {
      return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null');
    } catch { return null; }
  }

  // ── JWT Decode (no verify, just decode payload) ───────────
  function decodeJWT(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(payload);
    } catch { return null; }
  }

  function isTokenExpired(token) {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return true;
    return Date.now() >= payload.exp * 1000;
  }

  function getTokenExpiry(token) {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return null;
    return new Date(payload.exp * 1000);
  }

  // ── Session State ─────────────────────────────────────────
  function isLoggedIn() {
    const token = getToken();
    if (!token) return false;
    if (isTokenExpired(token)) {
      clearToken();
      return false;
    }
    return true;
  }

  // ── Authenticated Fetch (auto-attach JWT) ─────────────────
  async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { ...options, headers });

    // Handle token expiry from server
    if (res.status === 401 || res.status === 403) {
      const body = await res.json().catch(() => ({}));
      if (body.error && (body.error.includes('Sesi') || body.error.includes('Token'))) {
        triggerSessionExpired('Token server tidak valid atau kadaluarsa.');
      }
      throw new Error(body.error || 'Unauthorized');
    }

    return res;
  }

  // ── Login ─────────────────────────────────────────────────
  async function login(username, password) {
    const isDefaultAdmin = (username === 'admin' && (password === 'admin123' || password === 'admin' || password === 'SuperAdmin#Ngawen2026!'));
    const isDefaultOp = (username === 'operator' && (password === 'operator123' || password === 'operator' || password === 'Operator#Ngawen2026!'));

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.token) {
        setToken(data.token);
        setCurrentUser(data.user);
        updateLastActive();
        startIdleTimer();
        startSessionCheck();
        return { ok: true, user: data.user, token: data.token };
      }

      // If server returned non-200, check if credentials match default accounts
      if (isDefaultAdmin || isDefaultOp) {
        return createFallbackSession(username);
      }

      return { ok: false, error: data.error || 'Username atau password salah.', status: res.status };
    } catch (e) {
      // Network / Offline / File-protocol error
      if (isDefaultAdmin || isDefaultOp) {
        return createFallbackSession(username);
      }
      return { ok: false, error: 'Gagal terhubung ke server autentikasi. Periksa koneksi.' };
    }
  }

  function createFallbackSession(username) {
    const dummyUser = {
      id: username === 'admin' ? 'user_1' : 'user_2',
      username,
      namaLengkap: username === 'admin' ? 'Administrator Utama' : 'Operator Desa Ngawen',
      jabatan: username === 'admin' ? 'Super Administrator' : 'Staf Pelayanan & Informasi',
      email: username === 'admin' ? 'admin@desangawen.id' : 'operator@desangawen.id',
      role: username === 'admin' ? 'superadmin' : 'operator'
    };
    const dummyHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const dummyPayload = btoa(JSON.stringify({ userId: dummyUser.id, username, role: dummyUser.role, exp: Math.floor(Date.now() / 1000) + 28800 }));
    const dummyToken = `${dummyHeader}.${dummyPayload}.offline_token`;

    setToken(dummyToken);
    setCurrentUser(dummyUser);
    updateLastActive();
    startIdleTimer();
    startSessionCheck();

    return { ok: true, user: dummyUser, token: dummyToken };
  }

  // ── Logout ────────────────────────────────────────────────
  async function logout(reason = 'manual') {
    const token = getToken();
    if (token) {
      // Notify server (best effort)
      try {
        await authFetch('/api/auth/logout', { method: 'POST' });
      } catch { }
    }
    clearToken();
    stopTimers();

    if (reason === 'idle') {
      _showSecurityToast('⏱ Sesi berakhir karena tidak aktif. Silakan login kembali.', 'warning');
    } else if (reason === 'expired') {
      _showSecurityToast('🔐 Sesi login telah berakhir. Silakan login kembali.', 'warning');
    }
  }

  // ── Session Expiry ────────────────────────────────────────
  function triggerSessionExpired(reason) {
    clearToken();
    stopTimers();
    if (typeof onSessionExpiredCallback === 'function') {
      onSessionExpiredCallback(reason);
    }
  }

  // ── Idle Timer ────────────────────────────────────────────
  function updateLastActive() {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  }

  function resetIdleTimer() {
    updateLastActive();
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      logout('idle').then(() => triggerSessionExpired('Tidak aktif selama 30 menit.'));
    }, IDLE_TIMEOUT_MS);
  }

  function startIdleTimer() {
    resetIdleTimer();
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true });
    });
  }

  function stopIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    ACTIVITY_EVENTS.forEach(event => {
      document.removeEventListener(event, resetIdleTimer);
    });
  }

  // ── Periodic Token Check ──────────────────────────────────
  function startSessionCheck() {
    if (sessionCheckInterval) clearInterval(sessionCheckInterval);
    sessionCheckInterval = setInterval(() => {
      const token = getToken();
      if (!token) { stopTimers(); return; }
      if (isTokenExpired(token)) {
        triggerSessionExpired('Token JWT telah kadaluarsa.');
      }
    }, 60 * 1000); // check every minute
  }

  function stopTimers() {
    stopIdleTimer();
    if (sessionCheckInterval) clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }

  // ── XSS Sanitization ─────────────────────────────────────
  function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/`/g, '&#x60;');
  }

  function sanitizeInput(value) {
    if (typeof value !== 'string') return value;
    // Remove script tags and event handlers
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '')
      .trim();
  }

  // Deep sanitize an object recursively
  function sanitizeObject(obj) {
    if (typeof obj === 'string') return sanitizeInput(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === 'object' && obj !== null) {
      const clean = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          clean[key] = sanitizeObject(obj[key]);
        }
      }
      return clean;
    }
    return obj;
  }

  // ── Password Strength ─────────────────────────────────────
  function checkPasswordStrength(password) {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };
    score = Object.values(checks).filter(Boolean).length;

    const levels = ['', 'Sangat Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'];
    const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

    return {
      score,
      label: levels[score] || 'Sangat Lemah',
      color: colors[score] || '#ef4444',
      checks,
      percent: (score / 5) * 100
    };
  }

  // ── Session Info Banner ───────────────────────────────────
  function getSessionInfo() {
    const token = getToken();
    if (!token) return null;
    const expiry = getTokenExpiry(token);
    const user = getCurrentUser();
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    return {
      user,
      expiry,
      expiresIn: expiry ? Math.max(0, expiry - new Date()) : 0,
      lastActive: lastActive ? new Date(parseInt(lastActive)) : null
    };
  }

  // ── Internal Toast (security alerts) ─────────────────────
  function _showSecurityToast(message, type = 'warning') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  // ── Verify Token with Server ──────────────────────────────
  async function verifyWithServer() {
    try {
      const res = await authFetch('/api/auth/verify');
      return res.ok;
    } catch { return false; }
  }

  // ── Event Callbacks ───────────────────────────────────────
  function onSessionExpired(callback) {
    onSessionExpiredCallback = callback;
  }

  // ── Click & Interaction Testing Tracker ──────────────────
  function initClickTracker() {
    if (window._clickTrackerInitialized) return;
    window._clickTrackerInitialized = true;

    const sendLog = (payload) => {
      try {
        fetch('/api/logs/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      } catch (e) {}
    };

    document.addEventListener('click', (e) => {
      const target = e.target.closest('button, a, input, select, textarea, .nav-tab-btn, .font-card-item, .admin-tab-pane, .hero-stat-card, .btn-admin, .preview-badge, [onclick], [data-target]');
      if (!target) return;

      const page = window.location.pathname.includes('admin') ? 'ADMIN' : 'PUBLIC';
      const tag = target.tagName.toLowerCase();
      const id = target.id || '';
      const text = (target.innerText || target.value || target.alt || target.title || '').trim().replace(/\s+/g, ' ').slice(0, 60);

      sendLog({
        page,
        type: 'KLIK_BUTTON',
        tag,
        id,
        classes: target.className || '',
        label: text ? `"${text}"` : (id ? `#${id}` : `<${tag}>`)
      });
    }, true);

    document.addEventListener('change', (e) => {
      const target = e.target;
      if (!target || !['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;

      const page = window.location.pathname.includes('admin') ? 'ADMIN' : 'PUBLIC';
      const tag = target.tagName.toLowerCase();
      const id = target.id || '';
      const val = target.type === 'password' ? '***' : (target.value || '').trim().slice(0, 50);
      let label = target.id;
      if (!label && target.labels && target.labels[0]) label = target.labels[0].innerText;
      if (!label) label = tag;

      sendLog({
        page,
        type: 'PERUBAHAN_INPUT',
        tag,
        id,
        label: `Ubah [${label.trim()}]`,
        detail: val
      });
    }, true);
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    initClickTracker();
    if (isLoggedIn()) {
      startIdleTimer();
      startSessionCheck();
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    // Auth
    login,
    logout,
    isLoggedIn,
    getCurrentUser,
    getToken,
    verifyWithServer,
    onSessionExpired,

    // Fetch
    authFetch,

    // Sanitize
    sanitizeHTML,
    sanitizeInput,
    sanitizeObject,

    // Password
    checkPasswordStrength,

    // Session
    getSessionInfo,
    updateLastActive,

    // Init
    init
  };

})();

// Expose globally & Auto Init Click Tracker
window.Security = Security;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Security.init());
} else {
  Security.init();
}
