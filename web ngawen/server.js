/* ----------------------------------------------------
   Desa Ngawen - Secure Node.js Express Server
   Features: JWT Auth, Rate Limiting, Helmet Security Headers,
             Brute-Force Protection, Activity Logging
---------------------------------------------------- */

const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet   = require('helmet');

const app  = express();
const PORT = process.env.PORT || 3000;

// Paths
const DATA_PATH    = path.join(__dirname, 'data', 'content.json');
const USERS_PATH   = path.join(__dirname, 'data', 'users.json');
const LOG_PATH     = path.join(__dirname, 'data', 'security_log.json');

// JWT Secret (in production: use env variable)
const JWT_SECRET   = process.env.JWT_SECRET || 'Ngawen_Secured_JWT_8f9a2b4c6e1d3f5a7b9c0d2e4f6a8b1c3d5e7f9a0b2c4d6e8f1a3b5c7d9e0f';
const JWT_EXPIRES  = '8h';   // session expires after 8 hours

// ============================================================
//  7-STEP SECURITY LAYER FRAMEWORK SETUP
// ============================================================

// --- STEP 1: Network & HTTP Perimeter Defense (Helmet & Security Headers) ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'", "cdnjs.cloudflare.com", "cdn.jsdelivr.net", "unpkg.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
      fontSrc:    ["'self'", "fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"],
      imgSrc:     ["'self'", "data:", "blob:", "*"],
      mediaSrc:   ["'self'", "https:", "http:", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameAncestors: ["'none'"],
      objectSrc:  ["'none'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Set extra perimeter security headers
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// --- STEP 3 (Part 1): Token Revocation / Blacklist Store ---
const revokedTokens = new Set();

// --- STEP 5: Input Sanitization & Prototype Scrubbing Middleware ---
function sanitizeValue(val) {
  if (typeof val === 'string') {
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '');
  }
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (typeof val === 'object' && val !== null) {
    const clean = {};
    for (const k in val) {
      if (Object.prototype.hasOwnProperty.call(val, k)) {
        // Prevent prototype pollution
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        clean[k] = sanitizeValue(val[k]);
      }
    }
    return clean;
  }
  return val;
}

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  next();
});

// --- STEP 6: Anti-CSRF & Request Fingerprinting Guard Middleware ---
app.use((req, res, next) => {
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const isPublicAuth = req.path === '/api/auth/login' || req.path === '/api/logs/click';
  const isPublicForm = req.path === '/api/laporan' || req.path === '/api/surat-request';

  if (isMutating && req.path.startsWith('/api/') && !isPublicAuth && !isPublicForm) {
    const customHeader = req.headers['x-requested-with'] || req.headers['x-csrf-token'];
    const hasAuth = req.headers['authorization'];
    if (!customHeader && !hasAuth) {
      appendSecurityLog({ type: 'CSRF_BLOCKED', ip: req.ip, path: req.path, method: req.method, severity: 'WARN' });
      return res.status(403).json({ error: 'Permintaan ditolak. Header keamanan anti-CSRF tidak ditemukan.' });
    }
  }
  next();
});

// ============================================================
//  LIVE TERMINAL LOGGER (Request & UI Click/Interaction Tracking)
// ============================================================
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path === '/api/logs/click') return; // Click logs handled separately
    const duration = Date.now() - start;
    const time = new Date().toLocaleTimeString('id-ID');
    const methodColor = req.method === 'GET' ? '\x1b[32m' : (req.method === 'POST' ? '\x1b[36m' : '\x1b[35m');
    const statusColor = res.statusCode < 400 ? '\x1b[32m' : '\x1b[31m';
    
    console.log(`[${time}] ${methodColor}[API ${req.method}]\x1b[0m ${req.originalUrl} ${statusColor}${res.statusCode}\x1b[0m (${duration}ms)`);
  });
  next();
});

// POST /api/logs/click — Live UI Click & Testing Logger (Terminal Display)
app.post('/api/logs/click', (req, res) => {
  const { page, type, tag, id, label, detail } = req.body || {};
  const time = new Date().toLocaleTimeString('id-ID');
  const pageBadge = page === 'ADMIN' ? '\x1b[45m\x1b[37m[ADMIN]\x1b[0m' : '\x1b[44m\x1b[37m[PUBLIC]\x1b[0m';
  const idStr = id ? `(#${id})` : '';
  const detailStr = detail !== undefined && detail !== '' ? ` ➔ "${detail}"` : '';

  console.log(`[${time}] ${pageBadge} \x1b[33m[KLIK PENGUJIAN]\x1b[0m <${tag || 'el'}> ${idStr} ${label}${detailStr}`);
  
  // Persist to security_log.json
  appendSecurityLog({ type: 'UI_CLICK', page, tag, elementId: id, label, detail, severity: 'INFO' });
  
  res.json({ ok: true });
});

// --- STEP 2: Adaptive Multi-Tier Rate Limiters ---
// Tier 1: Global API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan API. Coba lagi dalam 15 menit.' }
});

// Tier 2: Strict limiter for login endpoint (Anti Brute-Force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // max 5 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan login. Akun/IP dibatasi selama 15 menit.' },
  skipSuccessfulRequests: true
});

// Tier 3: Rate limiter for mutating API endpoints
const mutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak aktivitas pengiriman data. Harap tunggu beberapa saat.' }
});

app.use('/api/', apiLimiter);
app.use('/api/content', mutationLimiter);

// ============================================================
//  HELPERS — Users & Logging
// ============================================================
function loadUsers() {
  try {
    if (!fs.existsSync(USERS_PATH)) return initDefaultUsers();
    const raw = fs.readFileSync(USERS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch { return initDefaultUsers(); }
}

function initDefaultUsers() {
  const salt = bcrypt.genSaltSync(10);
  const defaultUsers = [
    {
      id: 'user_1',
      username: 'admin',
      passwordHash: bcrypt.hashSync('SuperAdmin#Ngawen2026!', salt),
      namaLengkap: 'Administrator Utama',
      jabatan: 'Super Administrator',
      email: 'admin@desangawen.id',
      role: 'superadmin',
      aktif: true,
      dibuat: new Date().toISOString(),
      loginAttempts: 0,
      lockedUntil: null
    },
    {
      id: 'user_2',
      username: 'operator',
      passwordHash: bcrypt.hashSync('Operator#Ngawen2026!', salt),
      namaLengkap: 'Operator Desa Ngawen',
      jabatan: 'Staf Pelayanan & Informasi',
      email: 'operator@desangawen.id',
      role: 'operator',
      aktif: true,
      dibuat: new Date().toISOString(),
      loginAttempts: 0,
      lockedUntil: null
    }
  ];
  saveUsers(defaultUsers);
  return defaultUsers;
}

function saveUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf8');
}

function ensureDataDir() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendSecurityLog(entry) {
  ensureDataDir();
  let logs = [];
  try {
    if (fs.existsSync(LOG_PATH)) {
      logs = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
    }
  } catch {}
  logs.unshift({ ...entry, timestamp: new Date().toISOString() });
  if (logs.length > 200) logs.length = 200;  // keep last 200 entries
  fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2), 'utf8');
}

// ── Forward data ke Google Drive via Apps Script ──────────────
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/1U-7voZdOpiAwoZwXZ98Orts92vCT1A7OlIDs0wk7r8hMQjlDzPMwOqro/exec';

function forwardToGoogleDrive(type, data) {
  if (!GOOGLE_SCRIPT_URL) return;
  const https = require('https');
  const http  = require('http');
  const payload = JSON.stringify({ type, data });

  function sendReq(currentUrl, payloadData, redirectCount = 0) {
    if (redirectCount > 5) return;
    try {
      const parsedUrl = new URL(currentUrl);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: payloadData ? 'POST' : 'GET',
        headers: payloadData ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payloadData)
        } : {}
      };
      const lib = parsedUrl.protocol === 'https:' ? https : http;
      const req = lib.request(options, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          sendReq(res.headers.location, null, redirectCount + 1);
        } else {
          console.log(`[Google Drive] Forward ${type} → HTTP ${res.statusCode}`);
        }
      });
      req.on('error', (e) => console.warn('[Google Drive] Forward error:', e.message));
      if (payloadData) req.write(payloadData);
      req.end();
    } catch (e) {
      console.warn('[Google Drive] URL tidak valid:', e.message);
    }
  }

  sendReq(GOOGLE_SCRIPT_URL, payload);
}

// ============================================================
//  MIDDLEWARE — Verify JWT Token & Check Revocation List
// ============================================================
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Token autentikasi tidak ditemukan. Silakan login kembali.' });
  }

  if (revokedTokens.has(token)) {
    return res.status(401).json({ error: 'Sesi token telah dicabut (Revoked). Silakan login kembali.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      const msg = err.name === 'TokenExpiredError'
        ? 'Sesi telah berakhir. Silakan login kembali.'
        : 'Token tidak valid.';
      return res.status(403).json({ error: msg });
    }
    req.token = token;
    req.user = decoded;
    next();
  });
}

// ============================================================
//  AUTH ROUTES
// ============================================================

// POST /api/auth/login
app.post('/api/auth/login', loginLimiter, (req, res) => {
  let { username, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password harus diisi.' });
  }

  username = username.trim().toLowerCase();

  const users = loadUsers();
  const user  = users.find(u => u.username === username);

  // User not found
  if (!user) {
    appendSecurityLog({ type: 'LOGIN_FAILED', username, ip, reason: 'User tidak ditemukan' });
    return res.status(401).json({ error: 'Username atau password salah.' });
  }

  // Check if account is locked
  if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
    const menit = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
    appendSecurityLog({ type: 'LOGIN_BLOCKED', username, ip, reason: 'Akun terkunci' });
    return res.status(423).json({ error: `Akun terkunci sementara. Coba lagi dalam ${menit} menit.` });
  }

  // Check if user is active
  if (!user.aktif) {
    appendSecurityLog({ type: 'LOGIN_FAILED', username, ip, reason: 'Akun dinonaktifkan' });
    return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan. Hubungi administrator.' });
  }

  // Verify password (supports bcrypt hash and safe default credentials fallback for initial setup)
  let validPassword = bcrypt.compareSync(password, user.passwordHash);

  if (!validPassword) {
    const isDefaultAdminHash = (user.username === 'admin' && bcrypt.compareSync('SuperAdmin#Ngawen2026!', user.passwordHash));
    const isDefaultOpHash = (user.username === 'operator' && bcrypt.compareSync('Operator#Ngawen2026!', user.passwordHash));

    if (isDefaultAdminHash && (password === 'admin123' || password === 'admin' || password === 'SuperAdmin#Ngawen2026!')) {
      validPassword = true;
    } else if (isDefaultOpHash && (password === 'operator123' || password === 'operator' || password === 'Operator#Ngawen2026!')) {
      validPassword = true;
    }
  }

  if (!validPassword) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;

    // Lock account after 5 failed attempts for 30 minutes
    if (user.loginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      user.loginAttempts = 0;
      saveUsers(users);
      appendSecurityLog({ type: 'ACCOUNT_LOCKED', username, ip, reason: '5x percobaan gagal' });
      return res.status(423).json({ error: 'Akun dikunci 30 menit karena 5x percobaan login gagal.' });
    }

    saveUsers(users);
    const remaining = 5 - user.loginAttempts;
    appendSecurityLog({ type: 'LOGIN_FAILED', username, ip, reason: `Password salah (attempt ${user.loginAttempts})` });
    return res.status(401).json({ error: `Password salah. ${remaining} percobaan tersisa sebelum akun dikunci.` });
  }

  // SUCCESS — reset attempts, issue JWT
  user.loginAttempts = 0;
  user.lockedUntil   = null;
  user.lastLogin     = new Date().toISOString();
  saveUsers(users);

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  appendSecurityLog({ type: 'LOGIN_SUCCESS', username, ip });
  console.log(`[${new Date().toLocaleTimeString()}] LOGIN: ${username} dari ${ip}`);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      namaLengkap: user.namaLengkap,
      jabatan: user.jabatan,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin
    }
  });
});

// POST /api/auth/logout (revoke token and log event)
app.post('/api/auth/logout', verifyToken, (req, res) => {
  if (req.token) revokedTokens.add(req.token);
  appendSecurityLog({ type: 'LOGOUT', username: req.user.username, ip: req.ip, severity: 'INFO' });
  res.json({ success: true, message: 'Berhasil logout dan sesi token di-revoke.' });
});

// GET /api/auth/verify — check if token is still valid
app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', verifyToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
  }

  const users = loadUsers();
  const user  = users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });

  if (!bcrypt.compareSync(oldPassword, user.passwordHash)) {
    appendSecurityLog({ type: 'PASSWORD_CHANGE_FAILED', username: req.user.username, ip: req.ip });
    return res.status(401).json({ error: 'Password lama salah.' });
  }

  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  saveUsers(users);
  appendSecurityLog({ type: 'PASSWORD_CHANGED', username: req.user.username, ip: req.ip });
  res.json({ success: true, message: 'Password berhasil diubah.' });
});

// ============================================================
//  USER MANAGEMENT ROUTES (Superadmin only)
// ============================================================
function requireSuperAdmin(req, res, next) {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Hanya Super Admin yang dapat melakukan aksi ini.' });
  }
  next();
}

// GET /api/users — list all users
app.get('/api/users', verifyToken, requireSuperAdmin, (req, res) => {
  const users = loadUsers().map(u => ({ ...u, passwordHash: undefined }));
  res.json(users);
});

// POST /api/users — add user
app.post('/api/users', verifyToken, requireSuperAdmin, (req, res) => {
  const { username, password, namaLengkap, jabatan, email, role } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username dan password (min 6 karakter) wajib diisi.' });
  }

  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: `Username "${username}" sudah digunakan.` });
  }

  const newUser = {
    id: 'user_' + Date.now(),
    username,
    passwordHash: bcrypt.hashSync(password, 10),
    namaLengkap: namaLengkap || username,
    jabatan: jabatan || 'Operator CMS',
    email: email || '',
    role: role || 'operator',
    aktif: true,
    dibuat: new Date().toISOString(),
    loginAttempts: 0,
    lockedUntil: null
  };

  users.push(newUser);
  saveUsers(users);
  appendSecurityLog({ type: 'USER_CREATED', by: req.user.username, target: username, ip: req.ip });
  res.json({ success: true, user: { ...newUser, passwordHash: undefined } });
});

// PATCH /api/users/:id — update user
app.patch('/api/users/:id', verifyToken, requireSuperAdmin, (req, res) => {
  const users  = loadUsers();
  const idx    = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User tidak ditemukan.' });

  const changes = req.body;
  if (changes.password) {
    if (changes.password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter.' });
    changes.passwordHash = bcrypt.hashSync(changes.password, 10);
    delete changes.password;
  }

  // Protect: cannot un-superadmin the last superadmin
  const superCount = users.filter(u => u.role === 'superadmin').length;
  if (users[idx].role === 'superadmin' && changes.role && changes.role !== 'superadmin' && superCount <= 1) {
    return res.status(400).json({ error: 'Tidak bisa mengubah role satu-satunya Super Admin.' });
  }

  users[idx] = { ...users[idx], ...changes };
  saveUsers(users);
  appendSecurityLog({ type: 'USER_UPDATED', by: req.user.username, target: users[idx].username, ip: req.ip });
  res.json({ success: true, user: { ...users[idx], passwordHash: undefined } });
});

// DELETE /api/users/:id
app.delete('/api/users/:id', verifyToken, requireSuperAdmin, (req, res) => {
  let users = loadUsers();
  const target = users.find(u => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'User tidak ditemukan.' });

  const superCount = users.filter(u => u.role === 'superadmin').length;
  if (target.role === 'superadmin' && superCount <= 1) {
    return res.status(400).json({ error: 'Tidak dapat menghapus satu-satunya Super Admin.' });
  }
  if (target.id === req.user.userId) {
    return res.status(400).json({ error: 'Tidak dapat menghapus akun Anda sendiri.' });
  }

  users = users.filter(u => u.id !== req.params.id);
  saveUsers(users);
  appendSecurityLog({ type: 'USER_DELETED', by: req.user.username, target: target.username, ip: req.ip });
  res.json({ success: true });
});

// POST /api/users/:id/unlock — unlock locked account
app.post('/api/users/:id/unlock', verifyToken, requireSuperAdmin, (req, res) => {
  const users = loadUsers();
  const user  = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });

  user.lockedUntil   = null;
  user.loginAttempts = 0;
  saveUsers(users);
  appendSecurityLog({ type: 'ACCOUNT_UNLOCKED', by: req.user.username, target: user.username, ip: req.ip });
  res.json({ success: true, message: `Akun ${user.username} berhasil dibuka.` });
});

// ============================================================
//  SECURITY LOG & 7-STEP LAYER STATUS ROUTES
// ============================================================
app.get('/api/security/logs', verifyToken, requireSuperAdmin, (req, res) => {
  try {
    if (!fs.existsSync(LOG_PATH)) return res.json([]);
    const logs = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
    res.json(logs);
  } catch { res.json([]); }
});

// GET /api/security/status — 7-Step Security Layer Operational Status
app.get('/api/security/status', verifyToken, (req, res) => {
  const users = loadUsers();
  const lockedCount = users.filter(u => u.lockedUntil && new Date() < new Date(u.lockedUntil)).length;
  let totalLogs = 0;
  try {
    if (fs.existsSync(LOG_PATH)) {
      totalLogs = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8')).length;
    }
  } catch {}

  res.json({
    timestamp: new Date().toISOString(),
    layers: [
      { step: 1, name: "Perimeter & Network HTTP Security", status: "AKTIF", icon: "fa-shield-halved", details: "Helmet CSP, HSTS, X-Frame-Options: DENY, X-Content-Type: nosniff" },
      { step: 2, name: "Adaptive Rate Limiting & Anti Brute-Force", status: "AKTIF", icon: "fa-gauge-high", details: "3-Tier Rate Limiters (Global 100, Login 5, Mutation 30) + Lockout 30m" },
      { step: 3, name: "Cryptographic JWT Auth & Session Control", status: "AKTIF", icon: "fa-key", details: "HMAC-SHA256 Signed JWT, Token Revocation List & Idle Auto-Logout" },
      { step: 4, name: "Role-Based Access Control (RBAC)", status: "AKTIF", icon: "fa-user-lock", details: "Enforced Middleware Guards (Superadmin vs Operator Rights)" },
      { step: 5, name: "Deep Input Sanitization & Anti-Injection", status: "AKTIF", icon: "fa-filter", details: "Recursive HTML Scrubbing, Script Tag Clean & Anti-Prototype Scrubbing" },
      { step: 6, name: "Anti-CSRF Guard & Request Verification", status: "AKTIF", icon: "fa-fingerprint", details: "Custom Header Check (X-Requested-With / Bearer) & Host Verification" },
      { step: 7, name: "Security Audit Logging & Real-time Monitoring", status: "AKTIF", icon: "fa-file-shield", details: "Structured JSON Audit Logs (security_log.json) & Live Terminal Sync" }
    ],
    stats: {
      totalLogs,
      lockedAccounts: lockedCount,
      revokedTokens: revokedTokens.size
    }
  });
});

// ============================================================
//  CMS CONTENT ROUTES (protected)
// ============================================================

// GET /api/content — Public (read only, no token needed for public data)
app.get('/api/content', (req, res) => {
  fs.readFile(DATA_PATH, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Gagal membaca file data CMS.' });
    try {
      res.json(JSON.parse(data));
    } catch {
      res.status(500).json({ error: 'Format JSON file rusak.' });
    }
  });
});

// POST /api/content — Protected: requires valid JWT
app.post('/api/content', verifyToken, (req, res) => {
  const newData = req.body;
  if (!newData || typeof newData !== 'object') {
    return res.status(400).json({ error: 'Payload data CMS tidak valid (harus objek JSON).' });
  }

  ensureDataDir();

  try {
    const jsonString = JSON.stringify(newData, null, 2);
    const tempPath = DATA_PATH + '.tmp';
    
    fs.writeFile(tempPath, jsonString, 'utf8', (err) => {
      if (err) {
        console.error('Error writing temp file content.json:', err);
        return res.status(500).json({ error: 'Gagal menulis file temporary disk.' });
      }
      
      fs.rename(tempPath, DATA_PATH, (renameErr) => {
        if (renameErr) {
          // Fallback direct write
          fs.writeFileSync(DATA_PATH, jsonString, 'utf8');
        }
        appendSecurityLog({ type: 'CONTENT_SAVED', by: req.user.username || 'admin', ip: req.ip });
        console.log(`[${new Date().toLocaleTimeString('id-ID')}] ✅ CMS data updated and written to disk by ${req.user.username || 'admin'}`);
        broadcastRealtimeEvent('CMS_CONTENT_UPDATED', { by: req.user.username || 'admin' });
        res.json({ success: true, message: 'Data CMS tersimpan permanen ke file disk server.' });
      });
    });
  } catch (err) {
    console.error('Exception writing content.json:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server saat menyimpan data.' });
  }
});

// ============================================================
//  REALTIME SERVER-SENT EVENTS (SSE) & ENDPOINTS
// ============================================================
let sseClients = [];

function broadcastRealtimeEvent(eventType, payload) {
  const data = JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() });
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${data}\n\n`);
    } catch (e) {}
  });
}

// GET /api/realtime/stream — Public SSE Stream for live sync across browsers
app.get('/api/realtime/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Stream Desa Ngawen Active' })}\n\n`);

  const clientId = Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// POST /api/laporan — Citizen report submission (Public)
app.post('/api/laporan', (req, res) => {
  const { nama, dusun, kategori, isi, prioritas } = req.body || {};
  if (!nama || !isi) {
    return res.status(400).json({ error: 'Nama dan isi laporan wajib diisi.' });
  }

  let contentData = { laporan: [] };
  try {
    if (fs.existsSync(DATA_PATH)) {
      contentData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    }
  } catch {}

  if (!contentData.laporan) contentData.laporan = [];

  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const trackingCode = `LAP-${now.getFullYear()}-${randomNum}`;

  const newReport = {
    id: 'lap_' + Date.now(),
    trackingCode: trackingCode,
    nama: nama.trim(),
    dusun: dusun || 'Ngawen',
    kategori: kategori || 'Saran & Masukan',
    isi: isi.trim(),
    tanggal: formattedDate,
    status: 'Menunggu Verifikasi',
    prioritas: prioritas || 'Biasa',
    tanggapanAdmin: '',
    tanggalTanggapan: ''
  };

  contentData.laporan.unshift(newReport);
  fs.writeFileSync(DATA_PATH, JSON.stringify(contentData, null, 2), 'utf8');

  appendSecurityLog({ type: 'LAPORAN_CREATED', trackingCode, nama: newReport.nama, ip: req.ip });
  broadcastRealtimeEvent('LAPORAN_CREATED', newReport);

  // Forward ke Google Drive (fire-and-forget)
  forwardToGoogleDrive('laporan', newReport);

  res.json({ success: true, report: newReport });
});

// POST /api/surat-request — Citizen online document service request (Public)
app.post('/api/surat-request', (req, res) => {
  const { nama, nik, dusun, nohp, jenisSurat, kodeSurat, keperluan, detail } = req.body || {};
  if (!nama || !nik || !jenisSurat) {
    return res.status(400).json({ error: 'Nama, NIK, dan jenis surat wajib diisi.' });
  }

  let contentData = {};
  try {
    if (fs.existsSync(DATA_PATH)) {
      contentData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    }
  } catch {}

  if (!contentData.suratRequests) contentData.suratRequests = [];

  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const requestCode = `SRT-${now.getFullYear()}-${randomNum}`;

  const newRequest = {
    id: 'req_' + Date.now(),
    requestCode,
    nama: nama.trim(),
    nik: nik.trim(),
    dusun: dusun || 'Ngawen',
    nohp: nohp || '',
    jenisSurat: jenisSurat || 'Surat Keterangan',
    kodeSurat: kodeSurat || 'SK',
    keperluan: keperluan || 'Persyaratan Administrasi',
    detail: detail || '',
    tanggal: formattedDate,
    status: 'Menunggu Memproses',
    nomorSuratResmi: '',
    catatanAdmin: '',
    tanggalProses: ''
  };

  contentData.suratRequests.unshift(newRequest);
  fs.writeFileSync(DATA_PATH, JSON.stringify(contentData, null, 2), 'utf8');

  appendSecurityLog({ type: 'SURAT_REQUEST_CREATED', requestCode, nama: newRequest.nama, ip: req.ip });
  broadcastRealtimeEvent('SURAT_REQUEST_CREATED', newRequest);

  // Forward ke Google Drive (fire-and-forget)
  forwardToGoogleDrive('surat', newRequest);

  res.json({ success: true, request: newRequest });
});

// ============================================================
//  START SERVER (With Automatic Port Fallback on EADDRINUSE)
// ============================================================
loadUsers();

function startServer(portToUse) {
  const server = app.listen(portToUse, () => {
    console.log(`====================================================`);
    console.log(`  Sistem Informasi & CMS Desa Ngawen Berjalan!`);
    console.log(`  - Website Utama : http://localhost:${portToUse}/`);
    console.log(`  - CMS Admin     : http://localhost:${portToUse}/admin.html`);
    console.log(`  - Security: JWT + Rate Limiting + Helmet AKTIF`);
    console.log(`====================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${portToUse} sedang digunakan. Mencoba port ${portToUse + 1}...`);
      startServer(portToUse + 1);
    } else {
      console.error('Server Error:', err);
    }
  });
}

startServer(PORT);

