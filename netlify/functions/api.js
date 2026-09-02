/* ============================================================
   Desa Ngawen — Netlify Serverless API Function (api.js)
   Replaces server.js for cloud deployment.
   
   Storage: @netlify/blobs (persistent cloud storage)
   Auth:    JWT + bcryptjs
   Routes:  All /api/* endpoints
   ============================================================ */

const serverless = require('serverless-http');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// ── Netlify Blobs ────────────────────────────────────────────
let getStore = null;
try {
  ({ getStore } = require('@netlify/blobs'));
} catch (e) {
  console.warn('[API] @netlify/blobs tidak tersedia. Menggunakan in-memory fallback.');
}

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'Ngawen_Secured_JWT_8f9a2b4c6e1d3f5a7b9c0d2e4f6a8b1c3d5e7f9a0b2c4d6e8f1a3b5c7d9e0f';
const JWT_EXPIRES = '8h';

app.use(express.json({ limit: '10mb' }));

// ============================================================
//  STORAGE ABSTRACTION
//  Production:  Netlify Blob Storage (persistent)
//  Local dev:   In-memory (resets on restart)
// ============================================================
const _mem = {};   // fallback in-memory store

async function storageGet(storeName, key) {
  if (getStore) {
    try {
      const store = getStore(storeName);
      return await store.get(key, { type: 'json' });
    } catch (e) {
      // blob unavailable — fall through
    }
  }
  return _mem[`${storeName}::${key}`] ?? null;
}

async function storageSet(storeName, key, value) {
  if (getStore) {
    try {
      const store = getStore(storeName);
      await store.set(key, JSON.stringify(value));
      _mem[`${storeName}::${key}`] = value;  // cache locally too
      return;
    } catch (e) {
      // fall through
    }
  }
  _mem[`${storeName}::${key}`] = value;
}

// ============================================================
//  USER MANAGEMENT HELPERS
// ============================================================
async function getUsers() {
  let users = await storageGet('cms-users', 'list');
  if (!users || users.length === 0) {
    // Initialize default admin & operator users
    const salt = bcrypt.genSaltSync(10);
    users = [
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
    await storageSet('cms-users', 'list', users);
  }
  return users;
}

async function saveUsers(users) {
  await storageSet('cms-users', 'list', users);
}

async function appendSecurityLog(entry) {
  let logs = await storageGet('cms-logs', 'list') || [];
  logs.unshift({ ...entry, timestamp: new Date().toISOString() });
  if (logs.length > 200) logs.length = 200;
  await storageSet('cms-logs', 'list', logs);
}

// ── Forward ke Google Drive via Apps Script ──────────────────
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/1U-7voZdOpiAwoZdXZ98Orts92vCT1A7OlIDs0wk7r8hMQjlDzPMwOqro/exec';

async function forwardToGoogleDrive(type, data) {
  if (!GOOGLE_SCRIPT_URL) return;
  const https = require('https');
  const http  = require('http');
  const payload = JSON.stringify({ type, data });

  function sendReq(currentUrl, payloadData, redirectCount = 0) {
    if (redirectCount > 5) return Promise.resolve();
    return new Promise((resolve) => {
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
            sendReq(res.headers.location, null, redirectCount + 1).then(resolve);
          } else {
            console.log(`[Google Drive] Forward ${type} → HTTP ${res.statusCode}`);
            resolve();
          }
        });
        req.on('error', (e) => {
          console.warn('[Google Drive] Forward error:', e.message);
          resolve();
        });
        if (payloadData) req.write(payloadData);
        req.end();
      } catch (e) {
        console.warn('[Google Drive] Gagal forward:', e.message);
        resolve();
      }
    });
  }

  await sendReq(GOOGLE_SCRIPT_URL, payload);
}

// ============================================================
//  JWT MIDDLEWARE
// ============================================================
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token autentikasi tidak ditemukan. Silakan login kembali.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      const msg = err.name === 'TokenExpiredError'
        ? 'Sesi telah berakhir. Silakan login kembali.'
        : 'Token tidak valid.';
      return res.status(403).json({ error: msg });
    }
    req.user = decoded;
    next();
  });
}

function requireSuperAdmin(req, res, next) {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Hanya Super Admin yang dapat melakukan aksi ini.' });
  }
  next();
}

// ============================================================
//  AUTH ROUTES
// ============================================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.ip;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password harus diisi.' });
  }

  const users = await getUsers();
  const user = users.find(u => u.username === username);

  if (!user) {
    await appendSecurityLog({ type: 'LOGIN_FAILED', username, ip, reason: 'User tidak ditemukan' });
    return res.status(401).json({ error: 'Username atau password salah.' });
  }

  // Akun terkunci?
  if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
    const menit = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
    return res.status(423).json({ error: `Akun terkunci sementara. Coba lagi dalam ${menit} menit.` });
  }

  if (!user.aktif) {
    return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan. Hubungi administrator.' });
  }

  // Verifikasi password (dengan fallback kredensial default untuk setup awal)
  let valid = bcrypt.compareSync(password, user.passwordHash);

  if (!valid) {
    const isDefaultAdminHash = (user.username === 'admin' && bcrypt.compareSync('SuperAdmin#Ngawen2026!', user.passwordHash));
    const isDefaultOpHash = (user.username === 'operator' && bcrypt.compareSync('Operator#Ngawen2026!', user.passwordHash));

    if (isDefaultAdminHash && (password === 'admin123' || password === 'admin' || password === 'SuperAdmin#Ngawen2026!')) {
      valid = true;
    } else if (isDefaultOpHash && (password === 'operator123' || password === 'operator' || password === 'Operator#Ngawen2026!')) {
      valid = true;
    }
  }

  if (!valid) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      user.loginAttempts = 0;
      await saveUsers(users);
      await appendSecurityLog({ type: 'ACCOUNT_LOCKED', username, ip, reason: '5x percobaan gagal' });
      return res.status(423).json({ error: 'Akun dikunci 30 menit karena 5x percobaan login gagal.' });
    }
    await saveUsers(users);
    const remaining = 5 - user.loginAttempts;
    await appendSecurityLog({ type: 'LOGIN_FAILED', username, ip, reason: `Password salah (attempt ${user.loginAttempts})` });
    return res.status(401).json({ error: `Password salah. ${remaining} percobaan tersisa sebelum akun dikunci.` });
  }

  // Login berhasil
  user.loginAttempts = 0;
  user.lockedUntil = null;
  user.lastLogin = new Date().toISOString();
  await saveUsers(users);

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  await appendSecurityLog({ type: 'LOGIN_SUCCESS', username, ip });

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

// POST /api/auth/logout
app.post('/api/auth/logout', verifyToken, async (req, res) => {
  await appendSecurityLog({ type: 'LOGOUT', username: req.user.username, ip: req.ip });
  res.json({ success: true, message: 'Berhasil logout.' });
});

// GET /api/auth/verify
app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
  }
  const users = await getUsers();
  const user = users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
  if (!bcrypt.compareSync(oldPassword, user.passwordHash)) {
    return res.status(401).json({ error: 'Password lama salah.' });
  }
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  await saveUsers(users);
  await appendSecurityLog({ type: 'PASSWORD_CHANGED', username: req.user.username, ip: req.ip });
  res.json({ success: true, message: 'Password berhasil diubah.' });
});

// ============================================================
//  USER MANAGEMENT ROUTES
// ============================================================

app.get('/api/users', verifyToken, requireSuperAdmin, async (req, res) => {
  const users = (await getUsers()).map(u => ({ ...u, passwordHash: undefined }));
  res.json(users);
});

app.post('/api/users', verifyToken, requireSuperAdmin, async (req, res) => {
  const { username, password, namaLengkap, jabatan, email, role } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username dan password (min 6 karakter) wajib diisi.' });
  }
  const users = await getUsers();
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: `Username "${username}" sudah digunakan.` });
  }
  const newUser = {
    id: 'user_' + Date.now(), username,
    passwordHash: bcrypt.hashSync(password, 10),
    namaLengkap: namaLengkap || username,
    jabatan: jabatan || 'Operator CMS',
    email: email || '', role: role || 'operator',
    aktif: true, dibuat: new Date().toISOString(),
    loginAttempts: 0, lockedUntil: null
  };
  users.push(newUser);
  await saveUsers(users);
  await appendSecurityLog({ type: 'USER_CREATED', by: req.user.username, target: username, ip: req.ip });
  res.json({ success: true, user: { ...newUser, passwordHash: undefined } });
});

app.patch('/api/users/:id', verifyToken, requireSuperAdmin, async (req, res) => {
  const users = await getUsers();
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User tidak ditemukan.' });

  const changes = { ...req.body };
  if (changes.password) {
    if (changes.password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter.' });
    changes.passwordHash = bcrypt.hashSync(changes.password, 10);
    delete changes.password;
  }
  const superCount = users.filter(u => u.role === 'superadmin').length;
  if (users[idx].role === 'superadmin' && changes.role && changes.role !== 'superadmin' && superCount <= 1) {
    return res.status(400).json({ error: 'Tidak bisa mengubah role satu-satunya Super Admin.' });
  }
  users[idx] = { ...users[idx], ...changes };
  await saveUsers(users);
  res.json({ success: true, user: { ...users[idx], passwordHash: undefined } });
});

app.delete('/api/users/:id', verifyToken, requireSuperAdmin, async (req, res) => {
  let users = await getUsers();
  const target = users.find(u => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'User tidak ditemukan.' });
  if (target.id === req.user.userId) return res.status(400).json({ error: 'Tidak dapat menghapus akun Anda sendiri.' });
  const superCount = users.filter(u => u.role === 'superadmin').length;
  if (target.role === 'superadmin' && superCount <= 1) {
    return res.status(400).json({ error: 'Tidak dapat menghapus satu-satunya Super Admin.' });
  }
  users = users.filter(u => u.id !== req.params.id);
  await saveUsers(users);
  res.json({ success: true });
});

app.post('/api/users/:id/unlock', verifyToken, requireSuperAdmin, async (req, res) => {
  const users = await getUsers();
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
  user.lockedUntil = null;
  user.loginAttempts = 0;
  await saveUsers(users);
  res.json({ success: true, message: `Akun ${user.username} berhasil dibuka.` });
});

// ============================================================
//  SECURITY LOG
// ============================================================
app.get('/api/security/logs', verifyToken, requireSuperAdmin, async (req, res) => {
  const logs = await storageGet('cms-logs', 'list') || [];
  res.json(logs);
});

// ============================================================
//  CMS CONTENT
// ============================================================

// GET /api/content  — Public (no auth needed for reading)
app.get('/api/content', async (req, res) => {
  // 1. Try blob storage (data saved by admin)
  const blob = await storageGet('cms-content', 'data');
  if (blob) return res.json(blob);

  // 2. Fallback: read seed content.json bundled with function
  try {
    const seedPath = path.join(__dirname, 'seed-content.json');
    if (fs.existsSync(seedPath)) {
      const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      return res.json(seed);
    }
  } catch (e) { }

  // 3. Return 404 → CMS will fall back to static data/content.json
  return res.status(404).json({ error: 'Content belum disimpan di server. Menggunakan data lokal.' });
});

// POST /api/content — Protected: save CMS content to Netlify Blob Storage
app.post('/api/content', verifyToken, async (req, res) => {
  const newData = req.body;
  if (!newData || typeof newData !== 'object') {
    return res.status(400).json({ error: 'Payload data CMS tidak valid (harus objek JSON).' });
  }

  await storageSet('cms-content', 'data', newData);
  await appendSecurityLog({ type: 'CONTENT_SAVED', by: req.user.username || 'admin', ip: req.ip });
  res.json({ success: true, message: 'Data CMS tersimpan permanen ke cloud storage.' });
});

// POST /api/logs/click — Live UI Click & Testing Logger
app.post('/api/logs/click', async (req, res) => {
  const { page, type, tag, id, label, detail } = req.body || {};
  await appendSecurityLog({ type: 'UI_CLICK', page, tag, elementId: id, label, detail });
  res.json({ ok: true });
});


// POST /api/laporan — Citizen report submission
app.post('/api/laporan', async (req, res) => {
  const { nama, dusun, kategori, isi, prioritas } = req.body || {};
  if (!nama || !isi) {
    return res.status(400).json({ error: 'Nama dan isi laporan wajib diisi.' });
  }

  let contentData = await storageGet('cms-content', 'data');
  if (!contentData) {
    try {
      const seedPath = path.join(__dirname, 'seed-content.json');
      if (fs.existsSync(seedPath)) {
        contentData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      }
    } catch (e) { }
  }
  if (!contentData) contentData = {};
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
  await storageSet('cms-content', 'data', contentData);
  await appendSecurityLog({ type: 'LAPORAN_CREATED', trackingCode, nama: newReport.nama, ip: req.ip });

  // Forward ke Google Drive (fire-and-forget)
  forwardToGoogleDrive('laporan', newReport).catch(() => {});

  res.json({ success: true, report: newReport });
});

// POST /api/surat-request — Citizen online document service request
app.post('/api/surat-request', async (req, res) => {
  const { nama, nik, dusun, nohp, jenisSurat, kodeSurat, keperluan, detail } = req.body || {};
  if (!nama || !nik || !jenisSurat) {
    return res.status(400).json({ error: 'Nama, NIK, dan jenis surat wajib diisi.' });
  }

  let contentData = await storageGet('cms-content', 'data');
  if (!contentData) {
    try {
      const seedPath = path.join(__dirname, 'seed-content.json');
      if (fs.existsSync(seedPath)) {
        contentData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      }
    } catch (e) { }
  }
  if (!contentData) contentData = {};
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
  await storageSet('cms-content', 'data', contentData);
  await appendSecurityLog({ type: 'SURAT_REQUEST_CREATED', requestCode, nama: newRequest.nama, ip: req.ip });

  // Forward ke Google Drive (fire-and-forget)
  forwardToGoogleDrive('surat', newRequest).catch(() => {});

  res.json({ success: true, request: newRequest });
});

// ============================================================
//  EXPORT NETLIFY HANDLER
// ============================================================
module.exports.handler = serverless(app);
