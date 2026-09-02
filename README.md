<div align="center">

# 🏔️ Sistem Informasi Desa Ngawen

**Portal Resmi & CMS Desa Ngawen, Kecamatan Muntilan, Kabupaten Magelang**

[![Netlify Status](https://api.netlify.com/api/v1/badges/07c0527e-49e9-4e47-9e63-a9b8acab9b1e/deploy-status)](https://app.netlify.com/projects/desa-ngawen-si)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

> 🌐 **Website Utama:** [desa-ngawen-si.netlify.app](https://desa-ngawen-si.netlify.app)
> 
> 🔐 **CMS Admin:** [desa-ngawen-si.netlify.app/admin.html](https://desa-ngawen-si.netlify.app/admin.html)

</div>

---

## 📋 Daftar Isi

- [Tentang Proyek](#-tentang-proyek)
- [Fitur Utama](#-fitur-utama)
- [Teknologi](#-teknologi)
- [Struktur Proyek](#-struktur-proyek)
- [Instalasi & Menjalankan Lokal](#-instalasi--menjalankan-lokal)
- [Sistem Keamanan](#-sistem-keamanan)
- [Panduan CMS Admin](#-panduan-cms-admin)
- [Deployment ke Netlify](#-deployment-ke-netlify)
- [Konfigurasi Environment](#-konfigurasi-environment)
- [API Endpoints](#-api-endpoints)
- [Kontribusi](#-kontribusi)

---

## 🏡 Tentang Proyek

**Sistem Informasi Desa Ngawen** adalah portal digital resmi yang menyajikan informasi lengkap tentang Desa Ngawen, termasuk profil desa, struktur pemerintahan, potensi wisata, berita & pengumuman, layanan surat, serta sistem laporan & pengaduan warga.

Proyek ini dilengkapi dengan **CMS Admin Dashboard** berfitur lengkap yang memungkinkan operator desa mengelola seluruh konten website secara real-time tanpa keahlian coding.

---

## ✨ Fitur Utama

### 🌐 Website Utama (index.html)
| Fitur | Deskripsi |
|-------|-----------|
| 📊 Profil Desa | Data demografi, statistik penduduk, dan sejarah desa |
| 🏛️ Pemerintahan | Struktur perangkat desa dan informasi jabatan |
| 🌿 Potensi & Wisata | Galeri potensi agrowisata dan budaya lokal |
| 🗺️ Peta Wilayah | Peta interaktif menggunakan Leaflet.js |
| 📰 Berita & Pengumuman | Informasi terkini dari pemerintah desa |
| 📝 Laporan Warga | Sistem pengaduan dengan kode tracking |
| 📄 Layanan Surat | Informasi layanan administrasi digital |
| 🔍 Tracking Laporan | Warga dapat melacak status laporan secara mandiri |

### 🛠️ CMS Admin Dashboard (admin.html)
| Fitur | Deskripsi |
|-------|-----------|
| 🔐 Login JWT | Autentikasi aman berbasis JSON Web Token |
| 📝 Edit Konten | CRUD lengkap untuk semua konten website |
| 🎨 Kustomisasi Tampilan | Edit teks (posisi alignment, 5 warna teks, font judul & isi), Live Preview, logo, dan tema |
| 👥 Manajemen User | Tambah, edit, hapus, dan atur peran user |
| 📊 Dashboard Statistik | Ringkasan data website secara real-time |
| 🔒 Log Keamanan | Audit trail seluruh aktivitas login & perubahan |
| 💾 Backup & Restore | Export/import data CMS dalam format JSON |
| 📱 Responsive | Antarmuka admin yang responsif di semua perangkat |

---

## 🛠 Teknologi

### Frontend
- **HTML5** — Struktur semantik halaman
- **CSS3 Vanilla** — Glassmorphism design, animasi micro-interaction
- **JavaScript ES6+** — Logic frontend tanpa framework
- **Leaflet.js** — Peta interaktif
- **Chart.js** — Visualisasi data statistik
- **Font Awesome 6** — Ikon UI
- **Google Fonts** — Tipografi premium (Outfit, Poppins, Inter, dll.)

### Backend
- **Node.js** — Runtime JavaScript server-side
- **Express.js** — Framework web server
- **JWT (jsonwebtoken)** — Sistem autentikasi token
- **bcryptjs** — Enkripsi password
- **Helmet.js** — HTTP Security Headers
- **express-rate-limit** — Pembatasan request (Rate Limiting)

### Cloud & Deployment
- **Netlify** — Hosting static site + Serverless Functions
- **Netlify Blob Storage** — Penyimpanan data CMS persisten di cloud
- **Netlify CDN** — Distribusi konten global
- **serverless-http** — Adapter Express → Netlify Function

---

## 📁 Struktur Proyek

```
d:\SI\web ngawen\                   ← Root proyek
│
├── 📄 netlify.toml                 ← Konfigurasi Netlify (publish, functions, headers)
├── 📄 package.json                 ← Dependensi Node.js
├── 📄 .gitignore                   ← File yang dikecualikan dari Git
│
├── 📂 netlify/
│   └── 📂 functions/
│       ├── 📄 api.js               ← Serverless API (untuk Netlify cloud)
│       └── 📄 seed-content.json    ← Data awal website (seed)
│
└── 📂 web ngawen/                  ← Source website (publish dir Netlify)
    │
    ├── 📄 index.html               ← Website utama publik
    ├── 📄 admin.html               ← CMS Admin Dashboard
    ├── 📄 server.js                ← Express server (untuk development lokal)
    ├── 📄 package.json             ← Package.json lokal
    │
    ├── 📂 css/
    │   ├── 📄 style.css            ← Stylesheet website utama
    │   └── 📄 admin.css            ← Stylesheet CMS admin
    │
    ├── 📂 js/
    │   ├── 📄 security.js          ← Modul keamanan frontend (JWT, XSS, session)
    │   ├── 📄 cms.js               ← Engine CMS & data handler
    │   ├── 📄 script.js            ← Logic website utama
    │   └── 📄 admin.js             ← Logic CMS admin dashboard
    │
    ├── 📂 data/
    │   ├── 📄 content.json         ← Data konten CMS (seed & lokal)
    │   ├── 📄 users.json           ← Database user (lokal, di-ignore Git)
    │   └── 📄 security_log.json    ← Log keamanan (lokal, di-ignore Git)
    │
    └── 📂 assets/
        └── 🖼️ [gambar & aset]
```

---

## 🚀 Instalasi & Menjalankan Lokal

### Prasyarat
- **Node.js** versi `>= 18` ([download](https://nodejs.org))
- **npm** (sudah termasuk bersama Node.js)

### Langkah Instalasi

**1. Clone atau download proyek**
```bash
git clone https://github.com/username/desa-ngawen-si.git
cd "desa-ngawen-si"
```

**2. Install dependensi**
```bash
npm install
```

**3. Jalankan server lokal**
```bash
npm start
```

**4. Buka di browser**
```
Website Utama : http://localhost:3000/
CMS Admin     : http://localhost:3000/admin.html
```

> **Kredensial Login CMS Produksi:**
> - **Superadmin:** Username: `admin` | Password: `SuperAdmin#Ngawen2026!`
> - **Operator:** Username: `operator` | Password: `Operator#Ngawen2026!`
> 
> ⚠️ **Pastikan password diganti secara berkala via menu Pengaturan User!**

---

## 🔐 Sistem Keamanan

Proyek ini mengimplementasikan sistem keamanan berlapis. Lihat dokumentasi lengkap di [SECURITY.md](./SECURITY.md).

### Ringkasan Fitur Keamanan

| Lapisan | Teknologi | Fungsi |
|---------|-----------|--------|
| **Autentikasi** | JWT (8 jam) | Token-based session management |
| **Password** | bcryptjs (salt=10) | Enkripsi password satu arah |
| **Brute-Force** | Login counter + lockout | Kunci akun 30 menit setelah 5x gagal |
| **Rate Limiting** | express-rate-limit | Max 10 login/15 menit per IP |
| **HTTP Headers** | Helmet.js | CSP, X-Frame-Options, HSTS, dll. |
| **Session** | sessionStorage + idle timer | Auto-logout 30 menit tidak aktif |
| **XSS Protection** | security.js sanitizer | Sanitasi input & output HTML |
| **Audit Log** | security_log.json | Catat semua login & aktivitas |

---

## 🖥️ Panduan CMS Admin

### Login ke CMS

1. Buka `/admin.html`
2. Masukkan **username** dan **password**
3. Klik **"Masuk Ke CMS"**

> Jika login gagal 5 kali berturut-turut, akun akan **dikunci otomatis selama 30 menit**.

### Tab-Tab di CMS

| Tab | Fungsi |
|-----|--------|
| 📊 Dashboard | Ringkasan statistik dan info sistem |
| 📢 Laporan & Pengaduan | Kelola laporan masuk dari warga |
| 📄 Layanan & Surat | Informasi layanan administrasi |
| 🎨 Tampilan & Branding | Edit teks (posisi alignment, 5 warna teks, font judul & isi), Live Preview, logo & tema |
| 🏡 Profil & Visi Misi | Edit profil dan visi-misi desa |
| 🏛️ Perangkat Desa | CRUD data struktur pemerintahan |
| 🌿 Potensi & Wisata | Kelola galeri potensi desa |
| 👥 Kelembagaan | Manajemen kelompok masyarakat |
| 🗺️ Wilayah & Dusun | Data geografis desa |
| 📰 Berita | Kelola berita dan pengumuman |
| ⚙️ Pengaturan User | Manajemen akun operator CMS |
| 🔧 Pengaturan & Backup | Backup, restore, dan reset data |

### 🎨 Kustomisasi & Edit Teks (Posisi, Warna & Font)

Pengelola CMS dapat mengkustomisasi gaya visual dan teks branding secara langsung dari menu **Tampilan & Branding**:
- **Pilihan Font**: Memilih jenis font Google Fonts terpisah untuk **Font Judul Utama (Heading)** dan **Font Teks Isi (Body)**.
- **5 Pengaturan Warna Teks**:
  - *Warna Teks Judul*: Mengatur warna judul (`h1`-`h6`, `.hero-title`).
  - *Warna Teks Isi*: Mengatur warna paragraf dan teks konten utama (`p`).
  - *Warna Teks Aksen*: Mengatur warna badge, tag, dan aksen (`.hero-pill`, `.visi-tag`).
  - *Warna Sub-judul*: Mengatur warna keterangan & subtext (`.text-muted`).
  - *Warna Teks Latar Gelap*: Mengatur warna teks khusus untuk banner hijau dan kartu berlatar gelap (`.aspirasi-banner-card`, `.collab-cta-banner`, `.visi-card`).
- **Posisi Alignment Teks**: Mengatur alignment posisi teks pada bagian Hero Banner (`left`, `center`, `right`) dan Konten Utama (`left`, `center`, `right`, `justify`).
- **Live Text Preview Box**: Tampilan pratinjau real-time langsung di dalam admin dashboard saat pengaturan diubah.

### Simpan Perubahan

Klik tombol **"💾 Simpan Semua Perubahan"** di pojok kanan atas untuk menyimpan semua perubahan ke server.

## 🌐 Deployment ke GitHub Pages (github.io)

Website ini sudah dikonfigurasi penuh agar dapat di-host langsung di **GitHub Pages** (`https://<username>.github.io/<repo-name>/`).

### Opsi 1: Otomatis via GitHub Actions (Rekomendasi)

Workflow GitHub Actions sudah disediakan di [`.github/workflows/deploy.yml`](file:///.github/workflows/deploy.yml). Setiap kali Anda melakukan `git push` ke branch `main` atau `master`, GitHub Pages akan memublikasikan website secara otomatis.

**Langkah Aktivasi di GitHub:**
1. Push repository ini ke GitHub:
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git remote add origin https://github.com/<username>/<repo-name>.git
   git push -u origin master
   ```
2. Buka repository Anda di GitHub.com.
3. Masuk ke menu **Settings** > **Pages** (di sidebar kiri).
4. Pada opsi **Build and deployment** > **Source**, pilih **GitHub Actions**.
5. Tunggu proses build selesai di tab **Actions**. Website Anda langsung aktif di `https://<username>.github.io/<repo-name>/`!

### Opsi 2: Manual via `gh-pages` CLI

Jika ingin mendeploy langsung dari komputer lokal menggunakan terminal:

```bash
# 1. Push code awal ke GitHub
git push origin master

# 2. Deploy folder 'web ngawen' ke branch gh-pages
npm run deploy:gh-pages
```

---

## ☁️ Deployment ke Netlify

### Deploy Ulang (Setelah Ada Perubahan)

```bash
npx netlify-cli deploy --prod
```

### Deploy Pertama Kali (Fresh Setup)

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Login ke akun Netlify
netlify login

# 3. Inisialisasi site baru
netlify sites:create --name "nama-site-anda"

# 4. Set environment variable
netlify env:set JWT_SECRET "ganti-dengan-secret-yang-kuat"

# 5. Deploy ke production
netlify deploy --prod
```

### URL Hasil Deploy

| Halaman | URL |
|---------|-----|
| 🌐 Website Utama | `https://desa-ngawen-si.netlify.app` |
| 🔐 CMS Admin | `https://desa-ngawen-si.netlify.app/admin.html` |
| 📊 Dashboard Netlify | `https://app.netlify.com/projects/desa-ngawen-si` |

---

## ⚙️ Konfigurasi Environment

| Variable | Nilai Default | Keterangan |
|----------|--------------|------------|
| `PORT` | `3000` | Port server lokal |
| `JWT_SECRET` | `desa_ngawen_jwt_...` | **Wajib diganti di production!** |

> **Di Netlify:** Set via `netlify env:set JWT_SECRET "nilai-rahasia"`
> **Di lokal:** Buat file `.env` (sudah di-gitignore)

---

## 🌐 API Endpoints

Lihat dokumentasi API lengkap di [docs/API.md](./docs/API.md).

### Ringkasan

| Method | Endpoint | Auth | Fungsi |
|--------|----------|------|--------|
| `POST` | `/api/auth/login` | ❌ | Login, mendapat JWT token |
| `POST` | `/api/auth/logout` | ✅ | Logout, catat ke log |
| `GET` | `/api/auth/verify` | ✅ | Cek validitas token |
| `POST` | `/api/auth/change-password` | ✅ | Ganti password |
| `GET` | `/api/content` | ❌ | Ambil data konten CMS |
| `POST` | `/api/content` | ✅ | Simpan data konten CMS |
| `GET` | `/api/users` | ✅ 👑 | Daftar semua user |
| `POST` | `/api/users` | ✅ 👑 | Tambah user baru |
| `PATCH` | `/api/users/:id` | ✅ 👑 | Update data user |
| `DELETE` | `/api/users/:id` | ✅ 👑 | Hapus user |
| `GET` | `/api/security/logs` | ✅ 👑 | Lihat log keamanan |

> **✅** = Butuh JWT Token &nbsp;|&nbsp; **👑** = Butuh role `superadmin`

---

## 🤝 Kontribusi

Proyek ini dibuat untuk keperluan Sistem Informasi Desa Ngawen, Kecamatan Muntilan, Kabupaten Magelang.

**Tim Pengembang:**
- Sistem Informasi Desa Ngawen
- Pemerintah Desa Ngawen

---

## 📜 Lisensi

© 2026 Pemerintah Desa Ngawen, Kecamatan Muntilan, Kabupaten Magelang.  
Seluruh hak cipta dilindungi.

---

<div align="center">
  <sub>Dibuat dengan ❤️ untuk Desa Ngawen · Membangun Desa, Merawat Tradisi</sub>
</div>
