# 🔐 Dokumentasi Keamanan — Sistem Informasi Desa Ngawen

> **Versi:** 1.0.0 &nbsp;|&nbsp; **Diperbarui:** Agustus 2026

---

## 📋 Daftar Isi

- [Arsitektur Keamanan](#arsitektur-keamanan)
- [Autentikasi JWT](#autentikasi-jwt)
- [Enkripsi Password](#enkripsi-password)
- [Proteksi Brute-Force](#proteksi-brute-force)
- [Rate Limiting](#rate-limiting)
- [HTTP Security Headers](#http-security-headers)
- [Manajemen Sesi Frontend](#manajemen-sesi-frontend)
- [Sanitasi XSS](#sanitasi-xss)
- [Audit Log Keamanan](#audit-log-keamanan)
- [Manajemen User & Peran](#manajemen-user--peran)
- [Checklist Keamanan Production](#checklist-keamanan-production)
- [Melaporkan Kerentanan](#melaporkan-kerentanan)

---

## Arsitektur Keamanan

Sistem keamanan diimplementasikan dalam **dua lapisan**:

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (Frontend)                    │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ security.js │  │    cms.js   │  │   admin.js      │ │
│  │ JWT Session │  │ authFetch() │  │ Login UI Logic  │ │
│  │ XSS Filter  │  │ Data Sync   │  │ Session Bar     │ │
│  │ Idle Timer  │  │             │  │ Error Handling  │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS + Bearer JWT Token
┌──────────────────────────▼──────────────────────────────┐
│                 SERVER (Backend/API)                     │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │  Helmet  │  │  Rate    │  │   JWT    │  │bcrypt  │  │
│  │ Headers  │  │ Limiting │  │  Auth    │  │  Hash  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Brute-Force Protection                 │   │
│  │    5x gagal → Akun dikunci 30 menit              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Audit Security Log                   │   │
│  │  Catat semua: login, logout, gagal, perubahan    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Autentikasi JWT

### Cara Kerja

1. User memasukkan username & password di form login
2. Server memverifikasi kredensial dan mengembalikan **JWT Token**
3. Token disimpan di `sessionStorage` (bukan `localStorage`)
4. Setiap request API yang membutuhkan auth menyertakan header:
   ```
   Authorization: Bearer <token>
   ```
5. Server memverifikasi token pada setiap request protected

### Konfigurasi Token

| Parameter | Nilai | Keterangan |
|-----------|-------|------------|
| Algoritma | `HS256` | HMAC SHA-256 |
| Masa Berlaku | `8 jam` | Token expired setelah 8 jam |
| Storage | `sessionStorage` | Lebih aman dari localStorage |
| Secret | Env: `JWT_SECRET` | **Harus** di-set di production |

### Payload Token

```json
{
  "userId": "user_1",
  "username": "admin",
  "role": "superadmin",
  "iat": 1723680000,
  "exp": 1723708800
}
```

### Keunggulan vs Cookie Session

| | JWT (dipakai) | Cookie Session |
|--|--|--|
| **Stateless** | ✅ Tidak perlu session store | ❌ Perlu database sesi |
| **Scalable** | ✅ Bekerja di serverless | ❌ Sulit di serverless |
| **Mobile** | ✅ Mudah digunakan | ❌ Butuh CORS cookie config |
| **Revoke** | ❌ Tidak bisa dicabut | ✅ Bisa di-invalidate |

> **Mitigasi revoke:** Token disimpan di `sessionStorage` sehingga otomatis hilang saat tab/browser ditutup. Idle timeout 30 menit juga meminimalkan risiko.

---

## Enkripsi Password

### Implementasi

Library: **bcryptjs** (pure JavaScript, tidak perlu native module)

```javascript
// Hashing password saat create user
const hash = bcrypt.hashSync(password, 10);  // salt rounds = 10

// Verifikasi saat login
const valid = bcrypt.compareSync(inputPassword, storedHash);
```

### Salt Rounds

| Salt Rounds | Waktu Hash | Keamanan |
|-------------|------------|----------|
| 8 | ~1ms | Kurang (untuk production lama) |
| **10** | ~10ms | **✅ Dipakai — Balance baik** |
| 12 | ~100ms | Sangat kuat (production besar) |
| 14 | ~1s | Terlalu lambat untuk UX |

### Catatan Keamanan

- ❌ **Password TIDAK pernah disimpan dalam bentuk plaintext**
- ✅ Setiap user mendapat salt unik yang di-generate otomatis
- ✅ Hash bcrypt secara otomatis menyertakan salt dalam outputnya
- ✅ Password tidak dikirim ulang ke client dalam response apapun

---

## Proteksi Brute-Force

### Mekanisme

```
Login Attempt 1-4 (gagal)
  → Tampilkan pesan: "X percobaan tersisa"
  → Catat ke security_log.json

Login Attempt ke-5 (gagal)
  → Akun DIKUNCI selama 30 menit
  → Catat event ACCOUNT_LOCKED ke log
  → Return HTTP 423 (Locked)

Selama akun terkunci:
  → Semua login attempt (benar/salah) ditolak
  → Tampilkan sisa waktu kunci dalam menit

Setelah 30 menit:
  → Akun otomatis terbuka
  → Login counter di-reset ke 0

Admin dapat membuka paksa via:
  → POST /api/users/:id/unlock (requires superadmin JWT)
```

### Kode Implementasi (server.js / api.js)

```javascript
if (!valid) {
  user.loginAttempts = (user.loginAttempts || 0) + 1;

  if (user.loginAttempts >= 5) {
    // Kunci akun 30 menit
    user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    user.loginAttempts = 0;
    return res.status(423).json({ error: 'Akun dikunci 30 menit.' });
  }

  const remaining = 5 - user.loginAttempts;
  return res.status(401).json({ 
    error: `Password salah. ${remaining} percobaan tersisa.` 
  });
}
```

---

## Rate Limiting

### Konfigurasi

| Endpoint | Limit | Window | Keterangan |
|----------|-------|--------|------------|
| `POST /api/auth/login` | 10 req | 15 menit | Proteksi login |
| `GET/POST /api/*` | 100 req | 15 menit | General API |

### Perilaku Saat Limit Tercapai

- Status HTTP: `429 Too Many Requests`
- Response: `{ "error": "Terlalu banyak permintaan. Coba lagi dalam 15 menit." }`
- Header `Retry-After` disertakan otomatis

> **Catatan Netlify:** Di deployment cloud (serverless), rate limiting bersifat per-invocation karena tidak ada shared memory. Netlify sendiri menyediakan DDoS protection di layer CDN.

---

## HTTP Security Headers

Diimplementasikan melalui **Helmet.js** (lokal) dan **netlify.toml** (production).

| Header | Nilai | Fungsi |
|--------|-------|--------|
| `X-Frame-Options` | `SAMEORIGIN` | Cegah Clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Filter XSS browser |
| `X-Content-Type-Options` | `nosniff` | Cegah MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Batasi Referer header |
| `Permissions-Policy` | `camera=(), mic=(), geo=()` | Batasi akses API browser |
| `Content-Security-Policy` | Lihat di bawah | Batasi sumber resource |

### Content Security Policy (CSP)

```
default-src: 'self'
script-src:  'self' 'unsafe-inline' cdnjs.cloudflare.com cdn.jsdelivr.net unpkg.com
style-src:   'self' 'unsafe-inline' cdnjs.cloudflare.com fonts.googleapis.com
font-src:    'self' fonts.googleapis.com fonts.gstatic.com cdnjs.cloudflare.com
img-src:     'self' data: blob: *
connect-src: 'self'
frame-src:   'none'
object-src:  'none'
```

> `'unsafe-inline'` diperlukan untuk script inline yang digunakan oleh beberapa komponen. Pertimbangkan refactor ke nonce-based CSP untuk keamanan lebih tinggi.

---

## Manajemen Sesi Frontend

Diimplementasikan di `js/security.js`.

### Lifecycle Sesi

```
Login Berhasil
    │
    ▼
Token disimpan di sessionStorage
    │
    ▼
Idle Timer dimulai (30 menit)
    │
    ├── [User aktif] → Timer di-reset setiap mouse/keyboard/scroll
    │
    ├── [Tidak aktif 30 menit] → Auto logout, minta login ulang
    │
    └── [Tab/browser ditutup] → sessionStorage otomatis terhapus
                                 (Token tidak persist)
```

### Events yang Me-reset Idle Timer

- `mousedown`
- `keydown`
- `scroll`
- `touchstart`

### Pemeriksaan Token Periodik

Setiap **1 menit**, sistem memeriksa apakah token JWT masih valid (belum expired). Jika sudah expired, sesi diakhiri dan user diminta login ulang.

---

## Sanitasi XSS

Library: Custom `security.js` — tanpa dependensi eksternal.

### Fungsi yang Tersedia

#### `Security.sanitizeHTML(str)`
Mengubah karakter berbahaya menjadi HTML entities:
```javascript
Security.sanitizeHTML('<script>alert(1)</script>')
// → '&lt;script&gt;alert(1)&lt;/script&gt;'
```

#### `Security.sanitizeInput(str)`
Menghapus pattern berbahaya dari string input:
```javascript
Security.sanitizeInput('Hello <script>evil()</script> World')
// → 'Hello  World'
```

Karakter/pattern yang disanitasi:
- Tag `<script>...</script>`
- Event handler: `onclick=`, `onload=`, `onerror=`, dll.
- `javascript:` protocol
- `data:text/html` (XSS via data URI)

#### `Security.sanitizeObject(obj)`
Sanitasi rekursif untuk seluruh objek/array:
```javascript
const clean = Security.sanitizeObject(userInputData);
```

### Penggunaan di CMS

Semua output user yang ditampilkan ke HTML menggunakan `sanitizeHTML()`:
```javascript
el.innerHTML = `<span>${Security.sanitizeHTML(user.namaLengkap)}</span>`;
```

### Validasi & Proteksi Injeksi CSS pada Dynamic Branding

Fitur kustomisasi teks & branding (`headingColor`, `textColor`, `accentTextColor`, `subtitleTextColor`, `darkCardTextColor`, `heroTextAlign`, `bodyTextAlign`, `headingFont`, `bodyFont`) mengimplementasikan mitigasi terhadap CSS Injection dan Defacement:

- **Validasi Format Warna Hex**: Hanya string format hex valid (`#RRGGBB` / `#RGB`) yang diterapkan pada variabel CSS (`--heading-text-color`, dll.). Karakter ekspresi CSS eksternal/injection otomatis ditolak dan di-fallback.
- **Whitelist Posisi Alignment**: Nilai alignment diproteksi dengan Whitelist nilai sah (`left`, `center`, `right`, `justify`).
- **Whitelist Dynamic Font Loading**: Hanya font terverifikasi dari daftar `GOOGLE_FONTS` yang dapat dimuat stylesheet-nya secara dinamis.

---

## Audit Log Keamanan

### Lokasi File

- **Lokal:** `web ngawen/data/security_log.json`
- **Production:** Netlify Blob Storage (`cms-logs > list`)

### Format Event

```json
{
  "type": "LOGIN_SUCCESS",
  "username": "admin",
  "ip": "::1",
  "timestamp": "2026-08-15T09:02:29.311Z"
}
```

### Jenis Event yang Dicatat

| Event | Pemicu |
|-------|--------|
| `LOGIN_SUCCESS` | Login berhasil |
| `LOGIN_FAILED` | Password salah / user tidak ada |
| `ACCOUNT_LOCKED` | 5x login gagal |
| `ACCOUNT_UNLOCKED` | Admin membuka kunci akun |
| `LOGOUT` | Klik tombol logout |
| `PASSWORD_CHANGED` | Ganti password berhasil |
| `PASSWORD_CHANGE_FAILED` | Password lama salah |
| `USER_CREATED` | Superadmin menambah user baru |
| `USER_UPDATED` | Superadmin mengupdate user |
| `USER_DELETED` | Superadmin menghapus user |
| `CONTENT_SAVED` | Data CMS disimpan ke server |

### Batas Log

- Maksimum **200 entri** disimpan
- Entri lama otomatis dihapus saat limit tercapai (FIFO)

### Akses Log

```
GET /api/security/logs
Authorization: Bearer <token superadmin>
```

---

## Manajemen User & Peran

### Peran (Roles)

| Peran | Kode | Akses |
|-------|------|-------|
| **Super Administrator** | `superadmin` | Akses penuh termasuk manajemen user & log keamanan |
| **Operator CMS** | `operator` | Edit konten, kelola laporan & berita |

### Aturan Proteksi User

1. **Minimal 1 Super Admin** — Tidak dapat menghapus/downgrade satu-satunya superadmin
2. **Tidak bisa hapus diri sendiri** — Superadmin tidak bisa menghapus akun aktifnya sendiri
3. **Username unik** — Tidak bisa membuat 2 user dengan username sama
4. **Password minimal 6 karakter** — Validasi sisi server

---

## Checklist Keamanan Production

Sebelum go-live, pastikan hal berikut sudah dilakukan:

### Wajib ✅
- [x] `JWT_SECRET` sudah diganti dengan nilai yang kuat dan unik (64-character secure string)
- [x] Password default admin `admin123` sudah diganti dengan `SuperAdmin#Ngawen2026!`
- [x] HTTPS aktif (Netlify otomatis menyediakan SSL gratis)
- [x] File `users.json` dan `security_log.json` ada di `.gitignore`

### Disarankan 💡
- [ ] Aktifkan 2FA di akun Netlify
- [ ] Review security log secara berkala
- [x] Buat user operator terpisah (`operator` / `Operator#Ngawen2026!`)
- [ ] Ganti JWT_SECRET secara berkala (setiap 6 bulan)

### Opsional 🔧
- [ ] Daftarkan domain kustom (contoh: `desangawen.magelangkab.go.id`)
- [ ] Aktifkan Netlify Analytics untuk monitoring traffic
- [ ] Setup notifikasi email via Netlify untuk alert deploy gagal

---

## Melaporkan Kerentanan

Jika Anda menemukan celah keamanan pada sistem ini:

1. **Jangan dipublikasikan** langsung ke GitHub Issues
2. Hubungi tim pengembang melalui email resmi desa
3. Berikan detail: deskripsi, langkah reproduksi, dampak potensial
4. Tim akan merespons dalam 3 hari kerja

---

<div align="center">
  <sub>📄 SECURITY.md — Sistem Informasi Desa Ngawen v1.0.0</sub>
</div>
