# 🌐 Dokumentasi API — Sistem Informasi Desa Ngawen

> **Base URL (Lokal):** `http://localhost:3000`
> 
> **Base URL (Production):** `https://desa-ngawen-si.netlify.app`

---

## 📋 Daftar Isi

- [Autentikasi](#autentikasi)
- [Format Response](#format-response)
- [Endpoint Auth](#endpoint-auth)
- [Endpoint Konten CMS](#endpoint-konten-cms)
- [Endpoint Manajemen User](#endpoint-manajemen-user)
- [Endpoint Log Keamanan](#endpoint-log-keamanan)
- [Kode Error](#kode-error)

---

## Autentikasi

API ini menggunakan **Bearer Token (JWT)**. Setelah login, sertakan token di header setiap request yang memerlukan autentikasi:

```http
Authorization: Bearer <jwt_token>
```

### Cara Mendapat Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Response akan menyertakan `token` yang digunakan untuk request selanjutnya.

---

## Format Response

### Sukses

```json
{
  "success": true,
  "message": "Pesan sukses (opsional)",
  "data": { ... }
}
```

### Error

```json
{
  "error": "Deskripsi error yang jelas"
}
```

---

## Endpoint Auth

### `POST /api/auth/login`

Login dan mendapatkan JWT token.

**Auth Required:** ❌

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response Sukses `200`:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_1",
    "username": "admin",
    "namaLengkap": "Administrator Utama",
    "jabatan": "Super Administrator",
    "email": "admin@desangawen.id",
    "role": "superadmin",
    "lastLogin": "2026-08-15T09:00:00.000Z"
  }
}
```

**Response Error:**

| Status | Kondisi | Pesan |
|--------|---------|-------|
| `400` | Username/password kosong | `"Username dan password harus diisi."` |
| `401` | Password salah | `"Password salah. X percobaan tersisa."` |
| `403` | Akun dinonaktifkan | `"Akun Anda telah dinonaktifkan."` |
| `423` | Akun terkunci | `"Akun terkunci sementara. Coba lagi dalam X menit."` |
| `429` | Rate limit tercapai | `"Terlalu banyak percobaan login. Tunggu 15 menit."` |

---

### `POST /api/auth/logout`

Logout dan mencatat event ke security log.

**Auth Required:** ✅

**Request:**
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Berhasil logout."
}
```

---

### `GET /api/auth/verify`

Memverifikasi apakah token masih valid.

**Auth Required:** ✅

**Request:**
```http
GET /api/auth/verify
Authorization: Bearer <token>
```

**Response `200`:**
```json
{
  "valid": true,
  "user": {
    "userId": "user_1",
    "username": "admin",
    "role": "superadmin",
    "iat": 1723680000,
    "exp": 1723708800
  }
}
```

**Response Error `403`:**
```json
{
  "error": "Sesi telah berakhir. Silakan login kembali."
}
```

---

### `POST /api/auth/change-password`

Mengganti password user yang sedang login.

**Auth Required:** ✅

**Request Body:**
```json
{
  "oldPassword": "admin123",
  "newPassword": "passwordBaru456!"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Password berhasil diubah."
}
```

**Response Error:**

| Status | Kondisi |
|--------|---------|
| `400` | Password baru kurang dari 6 karakter |
| `401` | Password lama salah |
| `404` | User tidak ditemukan |

---

## Endpoint Konten CMS

### `GET /api/content`

Mengambil seluruh data konten website CMS.

**Auth Required:** ❌ (publik)

**Request:**
```http
GET /api/content
```

**Response `200`:**
```json
{
  "siteInfo": {
    "namaDesa": "Desa Ngawen",
    "kecamatan": "Muntilan",
    "kabupaten": "Magelang",
    ...
  },
  "profil": { ... },
  "pemerintahan": { ... },
  "potensi": { ... },
  "berita": [ ... ],
  "laporan": [ ... ],
  "themeConfig": { ... }
}
```

**Response `404`:**
```json
{
  "error": "Content belum disimpan di server. Menggunakan data lokal."
}
```

> **Catatan:** Jika 404, frontend otomatis fallback ke `data/content.json` (file statis).

---

### `POST /api/content`

Menyimpan seluruh data konten CMS ke server.

**Auth Required:** ✅ (role apapun)

**Request Body:**
```json
{
  "siteInfo": { ... },
  "profil": { ... },
  "pemerintahan": { ... },
  "potensi": { ... },
  "berita": [ ... ],
  "laporan": [ ... ],
  "themeConfig": { ... }
}
```

**Validasi:** Body harus memiliki properti `siteInfo`.

**Response `200`:**
```json
{
  "success": true,
  "message": "Data CMS tersimpan permanen ke file disk server."
}
```

**Response Error:**

| Status | Kondisi |
|--------|---------|
| `400` | Body tidak valid / tidak ada `siteInfo` |
| `401` | Token tidak disertakan |
| `403` | Token expired atau tidak valid |
| `500` | Gagal menyimpan ke disk/storage |

---

## Endpoint Manajemen User

> ⚠️ **Semua endpoint di bagian ini memerlukan role `superadmin`**

### `GET /api/users`

Mengambil daftar semua user.

**Auth Required:** ✅ Superadmin

**Response `200`:**
```json
[
  {
    "id": "user_1",
    "username": "admin",
    "namaLengkap": "Administrator Utama",
    "jabatan": "Super Administrator",
    "email": "admin@desangawen.id",
    "role": "superadmin",
    "aktif": true,
    "dibuat": "2026-08-01T08:00:00.000Z",
    "loginAttempts": 0,
    "lockedUntil": null,
    "lastLogin": "2026-08-15T09:00:00.000Z"
  }
]
```

> **Catatan:** Field `passwordHash` **tidak pernah** disertakan dalam response.

---

### `POST /api/users`

Menambah user baru.

**Auth Required:** ✅ Superadmin

**Request Body:**
```json
{
  "username": "operator1",
  "password": "pass123",
  "namaLengkap": "Budi Santoso",
  "jabatan": "Operator CMS",
  "email": "budi@desangawen.id",
  "role": "operator"
}
```

**Field Wajib:** `username`, `password` (min. 6 karakter)

**Response `200`:**
```json
{
  "success": true,
  "user": {
    "id": "user_1723680000000",
    "username": "operator1",
    "namaLengkap": "Budi Santoso",
    ...
  }
}
```

**Response Error:**

| Status | Kondisi |
|--------|---------|
| `400` | Username/password kosong atau password < 6 karakter |
| `409` | Username sudah digunakan |

---

### `PATCH /api/users/:id`

Mengupdate data user berdasarkan ID.

**Auth Required:** ✅ Superadmin

**URL Parameter:** `:id` — ID user (contoh: `user_1`)

**Request Body** (semua field opsional):
```json
{
  "namaLengkap": "Nama Baru",
  "jabatan": "Jabatan Baru",
  "email": "email@baru.id",
  "role": "operator",
  "aktif": false,
  "password": "passwordBaru123"
}
```

> Jika `password` disertakan, akan otomatis di-hash ulang.

**Response `200`:**
```json
{
  "success": true,
  "user": { ... }
}
```

---

### `DELETE /api/users/:id`

Menghapus user berdasarkan ID.

**Auth Required:** ✅ Superadmin

**URL Parameter:** `:id` — ID user

**Response `200`:**
```json
{
  "success": true
}
```

**Response Error:**

| Status | Kondisi |
|--------|---------|
| `400` | Mencoba hapus akun sendiri |
| `400` | Mencoba hapus satu-satunya superadmin |
| `404` | User tidak ditemukan |

---

### `POST /api/users/:id/unlock`

Membuka kunci akun yang terkunci karena brute-force.

**Auth Required:** ✅ Superadmin

**URL Parameter:** `:id` — ID user

**Response `200`:**
```json
{
  "success": true,
  "message": "Akun operator1 berhasil dibuka."
}
```

---

## Endpoint Log Keamanan

### `GET /api/security/logs`

Mengambil log aktivitas keamanan (audit trail).

**Auth Required:** ✅ Superadmin

**Response `200`:**
```json
[
  {
    "type": "LOGIN_SUCCESS",
    "username": "admin",
    "ip": "::1",
    "timestamp": "2026-08-15T09:02:29.311Z"
  },
  {
    "type": "LOGIN_FAILED",
    "username": "admin",
    "ip": "::1",
    "reason": "Password salah (attempt 1)",
    "timestamp": "2026-08-15T09:02:19.114Z"
  },
  {
    "type": "CONTENT_SAVED",
    "by": "admin",
    "ip": "::1",
    "timestamp": "2026-08-15T09:05:00.000Z"
  }
]
```

> Log diurutkan dari yang **terbaru** ke yang terlama. Maksimum 200 entri.

---

## Kode Error

| Kode HTTP | Arti | Penanganan |
|-----------|------|------------|
| `200` | OK | Request berhasil |
| `400` | Bad Request | Cek format/isi request body |
| `401` | Unauthorized | Sertakan token atau cek kredensial |
| `403` | Forbidden | Token tidak valid/expired, atau tidak punya akses |
| `404` | Not Found | Resource tidak ditemukan |
| `409` | Conflict | Data sudah ada (misal: username duplikat) |
| `423` | Locked | Akun dikunci karena brute-force |
| `429` | Too Many Requests | Rate limit tercapai, tunggu 15 menit |
| `500` | Internal Server Error | Error di server, lihat logs |

---

## Contoh: Lengkap Flow Login & Simpan Konten

```javascript
// 1. Login
const loginRes = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});
const { token } = await loginRes.json();

// 2. Ambil konten
const contentRes = await fetch('/api/content');
const content = await contentRes.json();

// 3. Modifikasi & simpan konten (dengan token)
content.siteInfo.namaDesa = 'Desa Ngawen Updated';
const saveRes = await fetch('/api/content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(content)
});
const result = await saveRes.json();
// { "success": true, "message": "Data CMS tersimpan..." }
```

---

<div align="center">
  <sub>📄 docs/API.md — Sistem Informasi Desa Ngawen v1.0.0</sub>
</div>
