/* ----------------------------------------------------
   Desa Ngawen - CMS Engine & Data Handler (cms.js)
   Provides seamless synchronization with LocalStorage,
   JSON seed files, REST API server, font dynamic loader & image reader.
   Auth: Delegated to Security module (JWT-based).
---------------------------------------------------- */

const CMS_STORAGE_KEY    = 'desa_ngawen_cms_data';
const CMS_PROFILE_KEY    = 'desa_ngawen_admin_profile';
const API_URL            = '/api/content';

// NOTE: User management is now handled server-side via /api/users (users.json)
// The Security module manages JWT tokens and session state.

// Available Fonts List for CMS Font Picker
const GOOGLE_FONTS = [
  { name: 'Outfit', family: "'Outfit', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap' },
  { name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap' },
  { name: 'Poppins', family: "'Poppins', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap' },
  { name: 'Inter', family: "'Inter', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap' },
  { name: 'Roboto', family: "'Roboto', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap' },
  { name: 'Playfair Display', family: "'Playfair Display', serif", url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&display=swap' }
];

class CMSEngine {
  constructor() {
    this.data = null;
    this.isLoaded = false;

    // Initialize BroadcastChannel for instant cross-tab real-time sync
    try {
      this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ngawen_cms_channel') : null;
    } catch {
      this.channel = null;
    }

    this.listeners = [];
    this.setupTabListeners();
    this.initRealtimeStream();
  }

  // Setup cross-tab listeners (BroadcastChannel & LocalStorage fallback)
  setupTabListeners() {
    if (this.channel) {
      this.channel.onmessage = (event) => {
        this._handleIncomingRealtimeEvent(event.data);
      };
    }

    window.addEventListener('storage', (e) => {
      if (e.key === CMS_STORAGE_KEY && e.newValue) {
        try {
          const fresh = JSON.parse(e.newValue);
          this.data = fresh;
          this.applyThemeAndFonts(fresh);
          this.notifyListeners({ type: 'CMS_STORAGE_UPDATED', data: fresh });
        } catch {}
      }
    });
  }

  // Connect to server SSE Stream for live multi-device sync
  initRealtimeStream() {
    if (typeof EventSource === 'undefined') return;
    try {
      this.evtSource = new EventSource('/api/realtime/stream');
      this.evtSource.onmessage = (e) => {
        try {
          const evtData = JSON.parse(e.data);
          this._handleIncomingRealtimeEvent(evtData);
        } catch {}
      };
    } catch {}
  }

  _handleIncomingRealtimeEvent(evt) {
    if (!evt || !evt.type) return;
    console.log('⚡ Realtime Event Received:', evt.type);

    if (evt.type === 'CMS_CONTENT_UPDATED') {
      this.loadData().then(fresh => {
        this.notifyListeners({ type: 'CMS_UPDATED', data: fresh });
      });
    } else if (evt.type === 'LAPORAN_CREATED' || evt.type === 'LAPORAN_UPDATED') {
      this.loadData().then(fresh => {
        this.notifyListeners({ type: 'LAPORAN_SYNC', payload: evt.payload, data: fresh });
      });
    } else if (evt.type === 'SURAT_REQUEST_CREATED' || evt.type === 'SURAT_REQUEST_UPDATED') {
      this.loadData().then(fresh => {
        this.notifyListeners({ type: 'SURAT_REQUEST_SYNC', payload: evt.payload, data: fresh });
      });
    }
  }

  onRealtimeEvent(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  notifyListeners(evt) {
    this.listeners.forEach(cb => {
      try { cb(evt); } catch {}
    });
  }

  broadcastLocalEvent(type, payload = {}) {
    const msg = { type, payload, timestamp: Date.now() };
    if (this.channel) {
      try { this.channel.postMessage(msg); } catch {}
    }
    this.notifyListeners(msg);
  }

  // Load data: REST API -> LocalStorage -> content.json seed
  async loadData() {
    // 1. Try REST API server
    try {
      const res = await fetch(API_URL, { cache: 'no-store' });
      if (res.ok) {
        this.data = await res.json();
        this.saveToLocalStorage(this.data);
        this.isLoaded = true;
        this.applyThemeAndFonts(this.data);
        return this.data;
      }
    } catch (e) {
      // Backend API not reachable, fallback to local/JSON
    }

    // 2. Try LocalStorage
    const localData = localStorage.getItem(CMS_STORAGE_KEY);
    if (localData) {
      try {
        this.data = JSON.parse(localData);
        this.isLoaded = true;
        this.applyThemeAndFonts(this.data);
        return this.data;
      } catch (err) {
        console.warn('Failed to parse local CMS data, loading default content.json');
      }
    }

    // 3. Fallback to data/content.json seed file
    try {
      const seedRes = await fetch('data/content.json', { cache: 'no-store' });
      if (seedRes.ok) {
        this.data = await seedRes.json();
        this.saveToLocalStorage(this.data);
        this.isLoaded = true;
        this.applyThemeAndFonts(this.data);
        return this.data;
      }
    } catch (err) {
      console.error('Error fetching data/content.json:', err);
    }

    return null;
  }

  saveToLocalStorage(data) {
    try {
      localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('LocalStorage quota exceeded or unavailable, continuing with memory state:', err);
    }
  }

  async saveData(newData) {
    this.data = newData;
    this.saveToLocalStorage(newData);
    this.applyThemeAndFonts(newData);
    this.broadcastLocalEvent('CMS_CONTENT_UPDATED', { timestamp: Date.now() });

    // Try saving to backend API (requires JWT token via Security module)
    const sec = window.Security;
    let serverOk = false;
    let serverErrorMsg = '';

    try {
      let res = null;
      if (sec && sec.isLoggedIn()) {
        res = await sec.authFetch(API_URL, {
          method: 'POST',
          body: JSON.stringify(newData)
        });
      } else {
        res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newData)
        });
      }

      if (res && res.ok) {
        const json = await res.json().catch(() => ({}));
        console.log('CMS data saved to server JSON file successfully.', json);
        serverOk = true;
      } else if (res) {
        const errBody = await res.json().catch(() => ({}));
        serverErrorMsg = errBody.error || `HTTP ${res.status}: Gagal menyimpan ke server`;
      }
    } catch (e) {
      console.warn('Network error or unauthenticated when saving to server:', e);
      serverErrorMsg = e.message || 'Sesi login tidak aktif atau server offline.';
    }

    if (serverOk) {
      return { success: true, message: 'Data CMS tersimpan permanen ke file disk server.' };
    } else {
      return {
        success: false,
        error: serverErrorMsg || 'Gagal menyimpan data ke file disk server. Silakan login ulang.'
      };
    }
  }

  // Dynamic Font & Theme Applicator
  applyThemeAndFonts(data) {
    if (!data || !data.themeConfig) return;

    const fontName = data.themeConfig.fontFamily || 'Outfit';
    const headingFontName = data.themeConfig.headingFont || fontName;
    const bodyFontName = data.themeConfig.bodyFont || fontName;

    const mainFontObj = GOOGLE_FONTS.find(f => f.name === fontName) || GOOGLE_FONTS[0];
    const headingFontObj = GOOGLE_FONTS.find(f => f.name === headingFontName) || mainFontObj;
    const bodyFontObj = GOOGLE_FONTS.find(f => f.name === bodyFontName) || mainFontObj;

    // Load Google Font CSS dynamically if not present
    this._loadGoogleFontLink('cms-dynamic-google-font', mainFontObj.url);
    this._loadGoogleFontLink('cms-dynamic-heading-font', headingFontObj.url);
    this._loadGoogleFontLink('cms-dynamic-body-font', bodyFontObj.url);

    // Apply CSS variables to root element
    const root = document.documentElement;
    root.style.setProperty('--main-font-family', mainFontObj.family);
    root.style.setProperty('--heading-font-family', headingFontObj.family);
    root.style.setProperty('--body-font-family', bodyFontObj.family);

    document.body.style.fontFamily = bodyFontObj.family;

    // Apply Text Colors if provided
    if (data.themeConfig.headingColor) {
      root.style.setProperty('--heading-text-color', data.themeConfig.headingColor);
    }
    if (data.themeConfig.textColor) {
      root.style.setProperty('--body-text-color', data.themeConfig.textColor);
    }
    if (data.themeConfig.accentTextColor) {
      root.style.setProperty('--accent-text-color', data.themeConfig.accentTextColor);
    }
    if (data.themeConfig.subtitleTextColor) {
      root.style.setProperty('--subtitle-text-color', data.themeConfig.subtitleTextColor);
    }
    if (data.themeConfig.darkCardTextColor) {
      root.style.setProperty('--dark-card-text-color', data.themeConfig.darkCardTextColor);
    }

    // Apply Text Alignment
    if (data.themeConfig.heroTextAlign) {
      root.style.setProperty('--hero-text-align', data.themeConfig.heroTextAlign);
    }
    if (data.themeConfig.bodyTextAlign) {
      root.style.setProperty('--body-text-align', data.themeConfig.bodyTextAlign);
    }
  }

  _loadGoogleFontLink(id, url) {
    let fontLink = document.getElementById(id);
    if (!fontLink) {
      fontLink = document.createElement('link');
      fontLink.id = id;
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);
    }
    fontLink.href = url;
  }

  async resetData() {
    localStorage.removeItem(CMS_STORAGE_KEY);
    return await this.loadData();
  }

  // ── Authentication: Delegated to Security module ──────────
  // login() now calls Security.login() which uses JWT via /api/auth/login
  async login(username, password) {
    if (window.Security) {
      return await window.Security.login(username, password);
    }
    return { ok: false, error: 'Modul keamanan tidak tersedia.' };
  }

  isLoggedIn() {
    if (window.Security) return window.Security.isLoggedIn();
    return false;
  }

  logout() {
    if (window.Security) window.Security.logout('manual');
  }

  getCurrentUser() {
    if (window.Security) return window.Security.getCurrentUser();
    return null;
  }

  // ── Multi-User Management: Now via REST API (server-side) ──
  async getUsers() {
    try {
      const res = await window.Security.authFetch('/api/users');
      if (res.ok) return await res.json();
    } catch {}
    return [];
  }

  async addUser(userData) {
    try {
      const res = await window.Security.authFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      return res.ok ? { ok: true, user: data.user } : { ok: false, msg: data.error };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  }

  async updateUser(userId, changes) {
    try {
      const res = await window.Security.authFetch(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(changes)
      });
      const data = await res.json();
      return res.ok ? { ok: true } : { ok: false, msg: data.error };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  }

  async deleteUser(userId) {
    try {
      const res = await window.Security.authFetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      return res.ok ? { ok: true } : { ok: false, msg: data.error };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  }

  // ── Admin Profile & Credentials ────────────────────────────
  async setCredentials(username, password) {
    const user = this.getCurrentUser();
    if (user && user.id) {
      const changes = {};
      if (username) changes.username = username;
      if (password) changes.password = password;
      return await this.updateUser(user.id, changes);
    }
    return { ok: false, msg: 'Pengguna tidak terautentikasi.' };
  }

  async getLoginHistory() {
    try {
      if (window.Security && window.Security.isLoggedIn()) {
        const res = await window.Security.authFetch('/api/security/logs');
        if (res.ok) {
          const logs = await res.json();
          return logs.map(l => ({
            username: l.username || l.by || 'system',
            waktu: l.timestamp || new Date().toISOString(),
            status: (l.type === 'LOGIN_SUCCESS' || l.type === 'LOGOUT') ? 'Berhasil' : (l.type.includes('FAILED') || l.type.includes('LOCKED')) ? 'Gagal' : l.type,
            ip: l.ip || '-'
          }));
        }
      }
    } catch (e) {}
    return [];
  }

  getProfile() {
    try {
      const stored = localStorage.getItem(CMS_PROFILE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    const user = this.getCurrentUser() || {};
    return {
      namaLengkap: user.namaLengkap || 'Administrator',
      jabatan: user.jabatan || 'Super Administrator',
      email: user.email || 'admin@desangawen.id',
      nohp: '',
      avatar: user.avatar || ''
    };
  }

  async saveProfile(profileData) {
    localStorage.setItem(CMS_PROFILE_KEY, JSON.stringify(profileData));
    // Also sync to server-side user record
    const user = this.getCurrentUser();
    if (user && user.id) {
      await this.updateUser(user.id, {
        namaLengkap: profileData.namaLengkap,
        jabatan: profileData.jabatan,
        email: profileData.email,
        avatar: profileData.avatar || ''
      });
    }
  }

  // Helper for reading & compressing image files as Base64 Data URL
  readFileAsBase64(file, maxWidth = 1200, maxHeight = 1200, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('File tidak ditemukan.'));
      
      // Non-image fallback
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG for smaller storage size
          const mimeType = (file.type === 'image/png' && file.size < 400000) ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mimeType, quality);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
        img.src = e.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  // Direct Google Drive Backup Sync (Browser Client-side)
  _sendToGoogleDrive(type, data) {
    const scriptUrl = 'https://script.google.com/macros/s/1U-7voZdOpiAwoZdXZ98Orts92vCT1A7OlIDs0wk7r8hMQjlDzPMwOqro/exec';
    try {
      fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      }).catch(() => {});
    } catch (e) {}
  }

  // Report / Pengaduan Helpers
  async addLaporan(reportData) {
    // 1. Try posting to backend REST API
    try {
      const res = await fetch('/api/laporan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.report) {
          if (!this.data) await this.loadData();
          if (!this.data.laporan) this.data.laporan = [];
          this.data.laporan.unshift(json.report);
          this.saveToLocalStorage(this.data);
          this.broadcastLocalEvent('LAPORAN_CREATED', json.report);
          this._sendToGoogleDrive('laporan', json.report);
          return json.report;
        }
      }
    } catch (e) {}

    // Fallback to local
    if (!this.data) await this.loadData();
    if (!this.data.laporan) this.data.laporan = [];

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `LAP-${now.getFullYear()}-${randomNum}`;

    const newReport = {
      id: 'lap_' + Date.now(),
      trackingCode: trackingCode,
      nama: reportData.nama || 'Warga Desa',
      dusun: reportData.dusun || 'Ngawen',
      kategori: reportData.kategori || 'Saran & Masukan',
      isi: reportData.isi || '',
      tanggal: formattedDate,
      status: 'Menunggu Verifikasi',
      prioritas: reportData.prioritas || 'Biasa',
      tanggapanAdmin: '',
      tanggalTanggapan: ''
    };

    this.data.laporan.unshift(newReport);
    await this.saveData(this.data);
    this.broadcastLocalEvent('LAPORAN_CREATED', newReport);
    this._sendToGoogleDrive('laporan', newReport);
    return newReport;
  }

  // Layanan Surat Online Helpers
  async addSuratRequest(requestData) {
    // 1. Try posting to backend REST API
    try {
      const res = await fetch('/api/surat-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.request) {
          if (!this.data) await this.loadData();
          if (!this.data.suratRequests) this.data.suratRequests = [];
          this.data.suratRequests.unshift(json.request);
          this.saveToLocalStorage(this.data);
          this.broadcastLocalEvent('SURAT_REQUEST_CREATED', json.request);
          this._sendToGoogleDrive('surat', json.request);
          return json.request;
        }
      }
    } catch (e) {}

    // Fallback to local
    if (!this.data) await this.loadData();
    if (!this.data.suratRequests) this.data.suratRequests = [];

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const requestCode = `SRT-${now.getFullYear()}-${randomNum}`;

    const newRequest = {
      id: 'req_' + Date.now(),
      requestCode,
      nama: requestData.nama || 'Warga Desa',
      nik: requestData.nik || '-',
      dusun: requestData.dusun || 'Ngawen',
      nohp: requestData.nohp || '',
      jenisSurat: requestData.jenisSurat || 'Surat Keterangan',
      kodeSurat: requestData.kodeSurat || 'SK',
      keperluan: requestData.keperluan || 'Persyaratan Administrasi',
      detail: requestData.detail || '',
      tanggal: formattedDate,
      status: 'Menunggu Memproses',
      nomorSuratResmi: '',
      catatanAdmin: '',
      tanggalProses: ''
    };

    this.data.suratRequests.unshift(newRequest);
    await this.saveData(this.data);
    this.broadcastLocalEvent('SURAT_REQUEST_CREATED', newRequest);
    this._sendToGoogleDrive('surat', newRequest);
    return newRequest;
  }

  getSuratRequests() {
    if (!this.data) return [];
    return this.data.suratRequests || [];
  }

  async updateSuratRequest(requestId, updates) {
    if (!this.data || !this.data.suratRequests) return false;
    const reqItem = this.data.suratRequests.find(r => r.id === requestId);
    if (!reqItem) return false;

    Object.assign(reqItem, updates);
    await this.saveData(this.data);
    this.broadcastLocalEvent('SURAT_REQUEST_UPDATED', reqItem);
    return true;
  }

  getLaporanByTracking(trackingCode) {
    if (!this.data || !this.data.laporan) return null;
    const cleanCode = trackingCode.trim().toUpperCase();
    return this.data.laporan.find(l => l.trackingCode.toUpperCase() === cleanCode) || null;
  }

  exportLaporanCSV() {
    if (!this.data || !this.data.laporan || this.data.laporan.length === 0) return alert('Tidak ada data laporan.');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Kode Tracking,Tanggal,Nama Warga,Dusun,Kategori,Prioritas,Status,Isi Laporan,Tanggapan Pemdes\n";

    this.data.laporan.forEach(item => {
      const row = [
        `"${item.trackingCode}"`,
        `"${item.tanggal}"`,
        `"${item.nama.replace(/"/g, '""')}"`,
        `"${item.dusun}"`,
        `"${item.kategori}"`,
        `"${item.prioritas || 'Biasa'}"`,
        `"${item.status}"`,
        `"${item.isi.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${(item.tanggapanAdmin || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_warga_desa_ngawen_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // JSON Import & Export
  exportJSON() {
    if (!this.data) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cms_backup_desa_ngawen_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.siteInfo && parsed.profil) {
        this.saveData(parsed);
        return true;
      }
      throw new Error('Format JSON tidak valid untuk CMS Desa Ngawen.');
    } catch (err) {
      alert('Error Import JSON: ' + err.message);
      return false;
    }
  }
}

// Global instance
window.cmsEngine = new CMSEngine();
window.GOOGLE_FONTS = GOOGLE_FONTS;
