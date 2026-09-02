/* ----------------------------------------------------
   Desa Ngawen - CMS Admin Dashboard Logic (admin.js)
   Full Base CRUD, Font Customizer, Logo Manager & Image Upload
   Auth: JWT-based via Security module
---------------------------------------------------- */

// ─────────────────────────────────────────────────────────────────
// GLOBAL LOGIN HANDLERS — called directly from HTML onclick attrs
// Must be self-contained (no references to variables outside scope)
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// GLOBAL LOGIN HANDLERS — Fallback & programmatic API
// ─────────────────────────────────────────────────────────────────
window.doGlobalQuickLogin = function (role) {
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  if (role === 'admin') {
    if (uInput) uInput.value = 'admin';
    if (pInput) pInput.value = 'admin123';
  } else {
    if (uInput) uInput.value = 'operator';
    if (pInput) pInput.value = 'operator123';
  }
  window.doGlobalLogin();
};

window.doGlobalLogin = async function () {
  const uEl = document.getElementById('loginUsername');
  const pEl = document.getElementById('loginPassword');
  const errEl = document.getElementById('loginErrorMsg');
  const overlay = document.getElementById('authOverlay');
  const card = document.getElementById('authCard');
  const submitBtn = document.getElementById('submitLoginBtn');

  const sec = window.Security;
  const cms = window.cmsEngine;

  if (!uEl || !pEl) return;
  if (!cms) {
    if (errEl) errEl.textContent = 'Sistem CMS belum siap, silakan muat ulang halaman.';
    return;
  }

  const user = uEl.value.trim().toLowerCase();
  const pass = pEl.value;

  if (!user || !pass) {
    if (errEl) errEl.textContent = 'Username dan password wajib diisi.';
    if (card) {
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 500);
    }
    return;
  }

  if (errEl) errEl.textContent = '';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi...';
  }

  try {
    const result = await cms.login(user, pass);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk Ke Panel CMS';
    }

    if (result && result.ok) {
      if (overlay) {
        overlay.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
        overlay.classList.add('hidden');
        overlay.setAttribute('hidden', 'true');
      }

      // Welcome Toast
      const name = result.user ? (result.user.namaLengkap || result.user.username || 'Admin') : 'Admin';
      if (typeof window._showToast === 'function') {
        window._showToast(`Selamat datang kembali, ${name}!`, 'success');
      }

      // Update session status bar
      if (typeof window._updateSessionBar === 'function') {
        window._updateSessionBar();
      }

      // Load & populate CMS data
      try {
        const freshData = await cms.loadData();
        if (typeof window._populateForms === 'function') {
          window._populateForms(freshData);
        }
      } catch (dataErr) {
        console.warn('Post-login data load warning:', dataErr);
      }

    } else {
      const errTxt = (result && result.error) ? result.error : 'Username atau password salah.';
      if (errEl) errEl.textContent = errTxt;
      pEl.value = '';
      pEl.focus();

      if (card) {
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
        setTimeout(() => card.classList.remove('shake'), 500);
      }
    }

  } catch (err) {
    console.error('Login submit exception:', err);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk Ke Panel CMS';
    }
    if (errEl) errEl.textContent = 'Gagal terhubung ke server autentikasi.';
  }
};

async function initAdmin() {
  const cms = window.cmsEngine;
  const sec = window.Security;

  // Initialize Security module
  if (sec) sec.init();

  // Core Elements
  const authOverlay = document.getElementById('authOverlay');
  const authCard = document.getElementById('authCard');
  const loginForm = document.getElementById('loginForm');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const togglePasswordIcon = document.getElementById('togglePasswordIcon');
  const loginErrorMsg = document.getElementById('loginErrorMsg');
  const quickLoginAdmin = document.getElementById('quickLoginAdmin');
  const quickLoginOperator = document.getElementById('quickLoginOperator');

  // Logout elements
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutModalOverlay = document.getElementById('logoutModalOverlay');
  const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
  const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');

  const saveAllBtn = document.getElementById('saveAllBtn');
  const navTabBtns = document.querySelectorAll('.sidebar-nav .nav-item-btn');
  const tabPanes = document.querySelectorAll('.admin-tab-pane');
  const currentTabTitle = document.getElementById('currentTabTitle');

  // CRUD Modal Elements
  const crudModalOverlay = document.getElementById('crudModalOverlay');
  const crudModalTitle = document.getElementById('crudModalTitle');
  const crudModalBody = document.getElementById('crudModalBody');
  const crudModalCloseBtn = document.getElementById('crudModalCloseBtn');
  const crudModalCancelBtn = document.getElementById('crudModalCancelBtn');
  const crudModalSaveBtn = document.getElementById('crudModalSaveBtn');

  let activeCrudCallback = null;
  let currentData = null;

  // ── Password Visibility Toggle ──────────────────────────────
  if (togglePasswordBtn && loginPassword && togglePasswordIcon) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = loginPassword.type === 'password';
      loginPassword.type = isPassword ? 'text' : 'password';
      togglePasswordIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      loginPassword.focus();
    });
  }

  // ── Quick Login Buttons ─────────────────────────────────────
  if (quickLoginAdmin) {
    quickLoginAdmin.addEventListener('click', () => window.doGlobalQuickLogin('admin'));
  }
  if (quickLoginOperator) {
    quickLoginOperator.addEventListener('click', () => window.doGlobalQuickLogin('operator'));
  }

  // ── Form Submit Listener ────────────────────────────────────
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      window.doGlobalLogin();
    });
  }

  // ── Check Login State ───────────────────────────────────────
  function isLoggedIn() {
    if (sec && sec.isLoggedIn()) return true;
    const token = sessionStorage.getItem('desa_ngawen_jwt_token');
    return !!token;
  }

  function checkAuth() {
    if (isLoggedIn()) {
      if (authOverlay) {
        authOverlay.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
        authOverlay.classList.add('hidden');
        authOverlay.setAttribute('hidden', 'true');
      }
      updateSessionBar();
    } else {
      if (authOverlay) {
        authOverlay.style.cssText = '';
        authOverlay.classList.remove('hidden');
        authOverlay.removeAttribute('hidden');
        if (loginUsername) loginUsername.focus();
      }
    }
  }
  checkAuth();

  // Load CMS data
  currentData = await cms.loadData();
  if (isLoggedIn()) {
    populateForms(currentData);
  }

  // Update sidebar session info bar
  function updateSessionBar() {
    const el = document.getElementById('sessionInfoBar');
    if (!el) return;

    if (sec && sec.isLoggedIn()) {
      const info = sec.getSessionInfo();
      if (info && info.user) {
        const exp = info.expiry ? info.expiry.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
        el.innerHTML = `
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
            <i class="fa-solid fa-circle-dot" style="color:#22c55e;font-size:0.6rem;"></i>
            <strong style="color:var(--admin-text); font-size:0.8rem;">${sec.sanitizeHTML(info.user.namaLengkap || info.user.username)}</strong>
          </div>
          <span style="opacity:0.65;font-size:0.7rem;">Sesi aktif s.d. ${exp}</span>
        `;
        return;
      }
    }
    el.innerHTML = `
      <span class="session-label">Status Sesi</span>
      <span>— Belum Login —</span>
    `;
  }
  window._updateSessionBar = updateSessionBar;

  // Register session-expired callback
  if (sec) {
    sec.onSessionExpired((reason) => {
      showToast(`🔐 ${reason || 'Sesi berakhir. Silakan login kembali.'}`, 'error');
      if (authOverlay) {
        authOverlay.style.cssText = '';
        authOverlay.classList.remove('hidden');
        authOverlay.removeAttribute('hidden');
      }
      if (loginErrorMsg) loginErrorMsg.textContent = reason || 'Sesi berakhir.';
    });
  }

  // ── Logout Modal Flow ───────────────────────────────────────
  function openLogoutModal() {
    if (logoutModalOverlay) logoutModalOverlay.classList.add('active');
  }

  function closeLogoutModal() {
    if (logoutModalOverlay) logoutModalOverlay.classList.remove('active');
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openLogoutModal();
    });
  }

  if (cancelLogoutBtn) {
    cancelLogoutBtn.addEventListener('click', closeLogoutModal);
  }

  if (logoutModalOverlay) {
    logoutModalOverlay.addEventListener('click', (e) => {
      if (e.target === logoutModalOverlay) closeLogoutModal();
    });
  }

  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener('click', async () => {
      closeLogoutModal();
      await cms.logout();
      checkAuth();
      updateSessionBar();
      showToast('Anda telah keluar dari panel CMS.', 'info');
    });
  }

  // ── Dark / Light Theme Manager ─────────────────────────────
  const adminThemeToggle = document.getElementById('adminThemeToggle');
  const adminThemeIcon = document.getElementById('adminThemeIcon');

  function updateThemeUI(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (adminThemeIcon) adminThemeIcon.className = 'fa-solid fa-sun';
      if (adminThemeToggle) {
        adminThemeToggle.setAttribute('title', 'Beralih ke Mode Terang');
        adminThemeToggle.setAttribute('aria-label', 'Mode Terang');
      }
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      if (adminThemeIcon) adminThemeIcon.className = 'fa-solid fa-moon';
      if (adminThemeToggle) {
        adminThemeToggle.setAttribute('title', 'Beralih ke Mode Gelap');
        adminThemeToggle.setAttribute('aria-label', 'Mode Gelap');
      }
    }
  }

  // Initialize theme UI on startup
  const savedAdminTheme = localStorage.getItem('desa_theme');
  if (savedAdminTheme === 'dark' || savedAdminTheme === 'light') {
    updateThemeUI(savedAdminTheme === 'dark');
  } else {
    const isCurrentlyDark = document.documentElement.getAttribute('data-theme') === 'dark';
    updateThemeUI(isCurrentlyDark);
  }

  if (adminThemeToggle) {
    adminThemeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const isDark = (currentTheme === 'dark');
      const newMode = isDark ? 'light' : 'dark';
      localStorage.setItem('desa_theme', newMode);
      updateThemeUI(!isDark);
      if (typeof showToast === 'function') {
        showToast(!isDark ? 'Mode Gelap diaktifkan 🌙' : 'Mode Terang diaktifkan ☀️', 'info');
      }
    });
  }

  // ── Mobile Sidebar Toggle ─────────────────────────────────
  const adminSidebar = document.getElementById('adminSidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const toggleBtn = document.getElementById('mobileSidebarToggle');

  function openMobileSidebar() {
    adminSidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileSidebar() {
    adminSidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      openMobileSidebar();
      toggleBtn.setAttribute('aria-expanded', 'true');
    });
  }
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileSidebar);

  function closeMobileSidebarWithAria() {
    closeMobileSidebar();
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
  }

  // Patch closeMobileSidebar calls to also update aria
  if (sidebarCloseBtn) sidebarCloseBtn.onclick = closeMobileSidebarWithAria;
  if (sidebarOverlay) sidebarOverlay.onclick = closeMobileSidebarWithAria;

  // Close sidebar on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && adminSidebar.classList.contains('active')) {
      closeMobileSidebar();
    }
  });

  // Tab Navigation
  navTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navTabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = btn.getAttribute('data-tab');
      document.getElementById(targetTab).classList.add('active');
      currentTabTitle.innerText = btn.innerText.trim();

      // Auto-close sidebar on mobile after tab selection
      if (window.innerWidth <= 768) {
        closeMobileSidebar();
      }
    });
  });

  // Toast Function
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  // Universal CRUD Modal Controls
  function openCRUDModal(title, formHTML, onSave) {
    crudModalTitle.innerText = title;
    crudModalBody.innerHTML = formHTML;
    activeCrudCallback = onSave;
    crudModalOverlay.classList.add('active');
  }

  function closeCRUDModal() {
    crudModalOverlay.classList.remove('active');
    crudModalBody.innerHTML = '';
    activeCrudCallback = null;
  }

  crudModalCloseBtn.addEventListener('click', closeCRUDModal);
  crudModalCancelBtn.addEventListener('click', closeCRUDModal);
  crudModalSaveBtn.addEventListener('click', () => {
    if (typeof activeCrudCallback === 'function') {
      const success = activeCrudCallback();
      if (success !== false) {
        closeCRUDModal();
      }
    }
  });

  // Render Font Picker Grid
  function renderFontPicker(selectedFontName) {
    const grid = document.getElementById('fontPickerGrid');
    if (!grid) return;
    grid.innerHTML = '';

    window.GOOGLE_FONTS.forEach(font => {
      const card = document.createElement('div');
      card.className = `font-card-item ${font.name === selectedFontName ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="font-selected-badge"><i class="fa-solid fa-circle-check"></i></div>
        <div class="font-card-name" style="font-family:${font.family}">${font.name}</div>
        <div class="font-card-sample" style="font-family:${font.family}">Portal Resmi Desa Ngawen — Membangun Desa, Merawat Tradisi.</div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.font-card-item').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (!currentData.themeConfig) currentData.themeConfig = {};
        currentData.themeConfig.fontFamily = font.name;
        cms.applyThemeAndFonts(currentData);
        showToast(`Font website diubah ke: ${font.name}`, 'success');
      });

      grid.appendChild(card);
    });
  }

  // Bind Image File Inputs to Base64 & Preview
  function bindImageInput(fileInputId, urlInputId, previewImgId) {
    const fileInput = document.getElementById(fileInputId);
    const urlInput = document.getElementById(urlInputId);
    const previewImg = document.getElementById(previewImgId);

    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const base64 = await cms.readFileAsBase64(file);
            if (previewImg) previewImg.src = base64;
            if (urlInput) urlInput.value = base64;
            showToast('Gambar berhasil diunggah!', 'success');
          } catch (err) {
            showToast('Gagal membaca file gambar.', 'error');
          }
        }
      });
    }

    if (urlInput && previewImg) {
      urlInput.addEventListener('input', () => {
        previewImg.src = urlInput.value.trim() || 'assets/candi.png';
      });
    }
  }

  // Safe DOM Element Setters (prevents null element crashes)
  function safeSetVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = (val !== undefined && val !== null) ? val : '';
  }

  function safeSetText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.innerText = (txt !== undefined && txt !== null) ? txt : '';
  }

  function safeSetSrc(id, src) {
    const el = document.getElementById(id);
    if (el) el.src = src || '';
  }

  // Setup Edit Teks (Posisi, Warna, Pilihan Font)
  function setupTextCustomizer(data) {
    const headingFontSelect = document.getElementById('headingFontSelect');
    const bodyFontSelect = document.getElementById('bodyFontSelect');

    const headingColorPicker = document.getElementById('headingColorPicker');
    const headingColorInput = document.getElementById('headingColorInput');
    const textColorPicker = document.getElementById('textColorPicker');
    const textColorInput = document.getElementById('textColorInput');
    const accentTextColorPicker = document.getElementById('accentTextColorPicker');
    const accentTextColorInput = document.getElementById('accentTextColorInput');
    const subtitleTextColorPicker = document.getElementById('subtitleTextColorPicker');
    const subtitleTextColorInput = document.getElementById('subtitleTextColorInput');
    const darkCardTextColorPicker = document.getElementById('darkCardTextColorPicker');
    const darkCardTextColorInput = document.getElementById('darkCardTextColorInput');

    const heroTextAlignSelect = document.getElementById('heroTextAlignSelect');
    const bodyTextAlignSelect = document.getElementById('bodyTextAlignSelect');

    if (headingFontSelect && headingFontSelect.children.length === 0 && window.GOOGLE_FONTS) {
      window.GOOGLE_FONTS.forEach(f => {
        headingFontSelect.appendChild(new Option(f.name, f.name));
      });
    }
    if (bodyFontSelect && bodyFontSelect.children.length === 0 && window.GOOGLE_FONTS) {
      window.GOOGLE_FONTS.forEach(f => {
        bodyFontSelect.appendChild(new Option(f.name, f.name));
      });
    }

    if (data && data.themeConfig) {
      if (headingFontSelect) headingFontSelect.value = data.themeConfig.headingFont || data.themeConfig.fontFamily || 'Outfit';
      if (bodyFontSelect) bodyFontSelect.value = data.themeConfig.bodyFont || 'Plus Jakarta Sans';

      if (headingColorPicker) headingColorPicker.value = data.themeConfig.headingColor || '#0f3822';
      if (headingColorInput) headingColorInput.value = data.themeConfig.headingColor || '#0f3822';

      if (textColorPicker) textColorPicker.value = data.themeConfig.textColor || '#1e293b';
      if (textColorInput) textColorInput.value = data.themeConfig.textColor || '#1e293b';

      if (accentTextColorPicker) accentTextColorPicker.value = data.themeConfig.accentTextColor || '#d97706';
      if (accentTextColorInput) accentTextColorInput.value = data.themeConfig.accentTextColor || '#d97706';

      if (subtitleTextColorPicker) subtitleTextColorPicker.value = data.themeConfig.subtitleTextColor || '#64748b';
      if (subtitleTextColorInput) subtitleTextColorInput.value = data.themeConfig.subtitleTextColor || '#64748b';

      if (darkCardTextColorPicker) darkCardTextColorPicker.value = data.themeConfig.darkCardTextColor || '#ffffff';
      if (darkCardTextColorInput) darkCardTextColorInput.value = data.themeConfig.darkCardTextColor || '#ffffff';

      if (heroTextAlignSelect) heroTextAlignSelect.value = data.themeConfig.heroTextAlign || 'left';
      if (bodyTextAlignSelect) bodyTextAlignSelect.value = data.themeConfig.bodyTextAlign || 'left';
    }

    // Sync Color Pickers
    const syncPair = (picker, input) => {
      if (picker && input && !picker._boundTextSync) {
        picker._boundTextSync = true;
        picker.addEventListener('input', () => { input.value = picker.value; updatePreview(); });
        input.addEventListener('input', () => { picker.value = input.value; updatePreview(); });
      }
    };
    syncPair(headingColorPicker, headingColorInput);
    syncPair(textColorPicker, textColorInput);
    syncPair(accentTextColorPicker, accentTextColorInput);
    syncPair(subtitleTextColorPicker, subtitleTextColorInput);
    syncPair(darkCardTextColorPicker, darkCardTextColorInput);

    // Event listeners for fonts & alignment
    const bindChange = (el) => {
      if (el && !el._boundTextSync) {
        el._boundTextSync = true;
        el.addEventListener('change', updatePreview);
      }
    };
    bindChange(headingFontSelect);
    bindChange(bodyFontSelect);
    bindChange(heroTextAlignSelect);
    bindChange(bodyTextAlignSelect);

    function updatePreview() {
      const previewBox = document.getElementById('brandingTextPreview');
      const previewHeading = document.getElementById('previewHeadingText');
      const previewBody = document.getElementById('previewBodyText');
      const previewBadge = document.getElementById('previewAccentBadge');

      const hFont = headingFontSelect?.value || 'Outfit';
      const bFont = bodyFontSelect?.value || 'Plus Jakarta Sans';
      const hColor = headingColorInput?.value || '#0f3822';
      const bColor = textColorInput?.value || '#1e293b';
      const aColor = accentTextColorInput?.value || '#d97706';
      const bAlign = bodyTextAlignSelect?.value || 'left';

      const fonts = window.GOOGLE_FONTS || [];
      const hFontObj = fonts.find(f => f.name === hFont);
      const bFontObj = fonts.find(f => f.name === bFont);

      if (previewHeading) {
        previewHeading.style.color = hColor;
        if (hFontObj) previewHeading.style.fontFamily = hFontObj.family;
      }

      if (previewBody) {
        previewBody.style.color = bColor;
        previewBody.style.textAlign = bAlign;
        if (bFontObj) previewBody.style.fontFamily = bFontObj.family;
      }

      if (previewBadge) {
        previewBadge.style.color = aColor;
        previewBadge.style.backgroundColor = aColor + '20';
      }

      if (previewBox) {
        previewBox.style.textAlign = bAlign;
      }

      // Optionally update cms engine dynamic tokens live
      if (!currentData.themeConfig) currentData.themeConfig = {};
      currentData.themeConfig.headingFont = hFont;
      currentData.themeConfig.bodyFont = bFont;
      currentData.themeConfig.headingColor = hColor;
      currentData.themeConfig.textColor = bColor;
      currentData.themeConfig.accentTextColor = aColor;
      currentData.themeConfig.subtitleTextColor = subtitleTextColorInput?.value || '#64748b';
      currentData.themeConfig.darkCardTextColor = darkCardTextColorInput?.value || '#ffffff';
      currentData.themeConfig.heroTextAlign = heroTextAlignSelect?.value || 'left';
      currentData.themeConfig.bodyTextAlign = bAlign;

      if (typeof cms.applyThemeAndFonts === 'function') {
        cms.applyThemeAndFonts(currentData);
      }
    }

    updatePreview();
  }

  // Populate Forms with Data
  function populateForms(data) {
    if (!data) return;

    try {
      // Dashboard Stats
      if (data.profil && data.profil.stats) {
        safeSetText('dashStatPenduduk', (data.profil.stats.totalPenduduk || 4062).toLocaleString());
      }
      safeSetText('dashStatLaporan', (data.laporan || []).length);
      safeSetText('dashStatPending', (data.laporan || []).filter(l => l.status === 'Menunggu Verifikasi').length);
      if (data.potensi && data.potensi.list) {
        safeSetText('dashStatPotensi', data.potensi.list.length);
      }

      // Tab 2: Branding (Font & Logo & UI Customizer & Site Images)
      const fontName = (data.themeConfig && data.themeConfig.fontFamily) ? data.themeConfig.fontFamily : 'Outfit';
      renderFontPicker(fontName);

      const logoTypeSelect = document.getElementById('logoTypeSelect');
      const logoIconInput = document.getElementById('logoIconInput');
      const logoIconGroup = document.getElementById('logoIconGroup');
      const logoImageGroup = document.getElementById('logoImageGroup');
      const logoImageUrlInput = document.getElementById('logoImageUrlInput');
      const logoImagePreview = document.getElementById('logoImagePreview');

      const primaryPicker = document.getElementById('primaryColorPicker');
      const primaryInput = document.getElementById('primaryColorInput');
      const accentPicker = document.getElementById('accentColorPicker');
      const accentInput = document.getElementById('accentColorInput');

      if (data.themeConfig) {
        if (logoTypeSelect) logoTypeSelect.value = data.themeConfig.logoType || 'icon';
        if (logoIconInput) logoIconInput.value = data.themeConfig.logoIcon || 'fa-solid fa-mountain-sun';
        if (logoImageUrlInput) logoImageUrlInput.value = data.themeConfig.logoImage || 'assets/candi.png';
        if (logoImagePreview) logoImagePreview.src = data.themeConfig.logoImage || 'assets/candi.png';

        if (primaryPicker) primaryPicker.value = data.themeConfig.primaryColor || '#0f3822';
        if (primaryInput) primaryInput.value = data.themeConfig.primaryColor || '#0f3822';
        if (accentPicker) accentPicker.value = data.themeConfig.accentColor || '#fbbf24';
        if (accentInput) accentInput.value = data.themeConfig.accentColor || '#fbbf24';

        safeSetVal('cardStyleSelect', data.themeConfig.cardStyle || 'rounded-xl');
        safeSetVal('layoutSpacingSelect', data.themeConfig.layoutSpacing || 'default');

        if (data.themeConfig.logoType === 'image') {
          if (logoIconGroup) logoIconGroup.style.display = 'none';
          if (logoImageGroup) logoImageGroup.style.display = 'block';
        } else {
          if (logoIconGroup) logoIconGroup.style.display = 'block';
          if (logoImageGroup) logoImageGroup.style.display = 'none';
        }
      }

      // Setup Edit Teks (Posisi, Warna, Pilihan Font)
      setupTextCustomizer(data);

      // Sync Color Pickers
      if (primaryPicker && primaryInput && !primaryPicker._bound) {
        primaryPicker._bound = true;
        primaryPicker.addEventListener('input', () => primaryInput.value = primaryPicker.value);
        primaryInput.addEventListener('input', () => primaryPicker.value = primaryInput.value);
      }
      if (accentPicker && accentInput && !accentPicker._bound) {
        accentPicker._bound = true;
        accentPicker.addEventListener('input', () => accentInput.value = accentPicker.value);
        accentInput.addEventListener('input', () => accentPicker.value = accentInput.value);
      }

      if (logoTypeSelect && !logoTypeSelect._bound) {
        logoTypeSelect._bound = true;
        logoTypeSelect.addEventListener('change', () => {
          if (logoTypeSelect.value === 'image') {
            if (logoIconGroup) logoIconGroup.style.display = 'none';
            if (logoImageGroup) logoImageGroup.style.display = 'block';
          } else {
            if (logoIconGroup) logoIconGroup.style.display = 'block';
            if (logoImageGroup) logoImageGroup.style.display = 'none';
          }
        });
      }

      bindImageInput('logoFileInput', 'logoImageUrlInput', 'logoImagePreview');
      bindImageInput('fileInputBalaiDesa', 'urlInputBalaiDesa', 'imgPreviewBalaiDesa');
      bindImageInput('fileInputCandi', 'urlInputCandi', 'imgPreviewCandi');
      bindImageInput('fileInputDemografi', 'urlInputDemografi', 'imgPreviewDemografi');
      bindImageInput('fileInputPkk', 'urlInputPkk', 'imgPreviewPkk');
      bindImageInput('fileInputProfil', 'urlInputProfil', 'imgPreviewProfil');

      if (data.siteImages) {
        if (data.siteImages.balaiDesa) {
          safeSetVal('urlInputBalaiDesa', data.siteImages.balaiDesa);
          safeSetSrc('imgPreviewBalaiDesa', data.siteImages.balaiDesa);
        }
        if (data.siteImages.candiNgawen) {
          safeSetVal('urlInputCandi', data.siteImages.candiNgawen);
          safeSetSrc('imgPreviewCandi', data.siteImages.candiNgawen);
        }
        if (data.siteImages.demografi) {
          safeSetVal('urlInputDemografi', data.siteImages.demografi);
          safeSetSrc('imgPreviewDemografi', data.siteImages.demografi);
        }
        if (data.siteImages.pkk) {
          safeSetVal('urlInputPkk', data.siteImages.pkk);
          safeSetSrc('imgPreviewPkk', data.siteImages.pkk);
        }
        if (data.siteImages.profil) {
          safeSetVal('urlInputProfil', data.siteImages.profil);
          safeSetSrc('imgPreviewProfil', data.siteImages.profil);
        }
      }

      // Tab 3: Profil & Visi Misi
      if (data.profil) {
        safeSetVal('profHeroPill', data.profil.heroPill || '');
        safeSetVal('profHeroTitle', data.profil.heroTitle || '');
        safeSetVal('profHeroDesc', data.profil.heroDesc || '');
        safeSetVal('profVisi', data.profil.visi || '');
        safeSetVal('profMisi', (data.profil.misi || []).join('\n'));
        if (data.profil.stats) {
          safeSetVal('profStatPenduduk', data.profil.stats.totalPenduduk || 4062);
          safeSetVal('profStatKK', data.profil.stats.totalKK || 1363);
          safeSetVal('profStatLuas', data.profil.stats.luasWilayah || 202.8);
          safeSetVal('profStatDusun', data.profil.stats.totalDusun || 10);
        }
      }

      // Tab 4: Pemerintahan
      if (data.pemerintahan && data.pemerintahan.kepalaDesa) {
        safeSetVal('kadesNama', data.pemerintahan.kepalaDesa.nama || '');
        safeSetVal('kadesDesc', data.pemerintahan.kepalaDesa.deskripsi || '');
      }

      if (data.pemerintahan && data.pemerintahan.perangkat) renderPerangkatTable(data.pemerintahan.perangkat);
      if (data.pemerintahan && data.pemerintahan.kadus) {
        renderKadusGrid(data.pemerintahan.kadus);
        renderDusunsAdminTable(data.pemerintahan.kadus);
      }

      // Tab 5: Potensi
      if (data.potensi && data.potensi.list) renderPotensiTable(data.potensi.list);

      // Tab 6: Kelompok
      if (data.kemasyarakatan && data.kemasyarakatan.pkk) {
        safeSetVal('pkkPokja', data.kemasyarakatan.pkk.pokjaCount || 4);
        safeSetVal('pkkAnggota', data.kemasyarakatan.pkk.anggotaCount || 461);
        safeSetVal('pkkDesc', data.kemasyarakatan.pkk.deskripsi || '');
      }
      if (data.kelompok) renderKelompokTable(data.kelompok);

      // Tab 7: Wilayah & Dusun
      if (data.wilayah) {
        if (data.wilayah.batas) {
          safeSetVal('batasUtara', data.wilayah.batas.utara || '');
          safeSetVal('batasSelatan', data.wilayah.batas.selatan || '');
          safeSetVal('batasBarat', data.wilayah.batas.barat || '');
          safeSetVal('batasTimur', data.wilayah.batas.timur || '');
        }
        safeSetVal('wilayahLuasTotal', data.wilayah.luasTotal || 202.8);
        safeSetVal('wilayahKetinggian', data.wilayah.ketinggian || '± 320 m dpl');
        safeSetVal('wilayahKepadatan', data.wilayah.kepadatan || '± 138.9 jiwa/Ha');
        safeSetVal('wilayahIrigasi', data.wilayah.irigasi || 'Irigasi Teknis');
      }

      // Tab 8: Berita
      if (data.berita) renderBeritaTable(data.berita);

      // Tab 9 & 10: Laporan Warga & Layanan Surat Digital
      if (!data.laporan) data.laporan = [];
      if (!data.layananSurat) data.layananSurat = [];

      renderLaporanTable();
      renderLayananSuratTable(data.layananSurat);
      renderSuratRequestTable();
      renderDashRecentLaporan();
    } catch (e) {
      console.warn('Form population completed with safe notices:', e);
    }
  }
  // Bridge: make populateForms accessible to global doGlobalLogin
  window._populateForms = populateForms;

  // --- FULL BASE CRUD RENDERERS & MODALS ---

  // 1. Perangkat Desa CRUD
  function renderPerangkatTable(perangkatList) {
    const tbody = document.getElementById('perangkatTableBody');
    tbody.innerHTML = '';
    perangkatList.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${item.nama}</strong></td>
        <td>${item.jabatan}</td>
        <td>${item.deskripsi}</td>
        <td>
          <button class="btn-admin btn-admin-outline btn-admin-sm edit-perangkat" data-index="${index}">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button class="btn-admin btn-admin-danger btn-admin-sm del-perangkat" data-index="${index}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.edit-perangkat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        const item = currentData.pemerintahan.perangkat[idx];
        const html = `
          <div class="form-group">
            <label>Nama Perangkat Desa</label>
            <input type="text" id="mPerangkatNama" class="form-control" value="${item.nama}">
          </div>
          <div class="form-group">
            <label>Jabatan</label>
            <input type="text" id="mPerangkatJabatan" class="form-control" value="${item.jabatan}">
          </div>
          <div class="form-group">
            <label>Deskripsi Tugas</label>
            <input type="text" id="mPerangkatDesc" class="form-control" value="${item.deskripsi}">
          </div>
        `;
        openCRUDModal('Edit Data Perangkat Desa', html, () => {
          item.nama = document.getElementById('mPerangkatNama').value;
          item.jabatan = document.getElementById('mPerangkatJabatan').value;
          item.deskripsi = document.getElementById('mPerangkatDesc').value;
          renderPerangkatTable(currentData.pemerintahan.perangkat);
          showToast('Data Perangkat Desa berhasil diperbarui.', 'success');
        });
      });
    });

    document.querySelectorAll('.del-perangkat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        if (confirm('Hapus perangkat desa ini?')) {
          currentData.pemerintahan.perangkat.splice(idx, 1);
          renderPerangkatTable(currentData.pemerintahan.perangkat);
          showToast('Perangkat desa dihapus.', 'success');
        }
      });
    });
  }

  document.getElementById('btnAddPerangkat').addEventListener('click', () => {
    const html = `
      <div class="form-group">
        <label>Nama Perangkat Desa</label>
        <input type="text" id="mPerangkatNama" class="form-control" placeholder="misal: Bambang Susilo">
      </div>
      <div class="form-group">
        <label>Jabatan</label>
        <input type="text" id="mPerangkatJabatan" class="form-control" placeholder="misal: Kasi Kesejahteraan">
      </div>
      <div class="form-group">
        <label>Deskripsi Tugas</label>
        <input type="text" id="mPerangkatDesc" class="form-control" placeholder="misal: Program Pembangunan & Kesejahteraan">
      </div>
    `;
    openCRUDModal('Tambah Perangkat Desa Baru', html, () => {
      const nama = document.getElementById('mPerangkatNama').value.trim();
      if (!nama) { showToast('Nama wajib diisi!', 'error'); return false; }
      currentData.pemerintahan.perangkat.push({
        id: 'p_' + Date.now(),
        nama: nama,
        jabatan: document.getElementById('mPerangkatJabatan').value || 'Perangkat Desa',
        deskripsi: document.getElementById('mPerangkatDesc').value || '-',
        tagClass: '',
        iconClass: 'fa-solid fa-user-check'
      });
      renderPerangkatTable(currentData.pemerintahan.perangkat);
      showToast('Perangkat Desa baru ditambahkan.', 'success');
    });
  });

  function renderKadusGrid(kadusList) {
    const container = document.getElementById('kadusFormGrid');
    if (!container) return;
    container.innerHTML = '';
    kadusList.forEach((k, idx) => {
      const div = document.createElement('div');
      div.className = 'form-group';
      div.innerHTML = `
        <label>Dusun ${k.dusun}</label>
        <input type="text" class="form-control kadus-input" data-idx="${idx}" value="${k.nama}">
      `;
      container.appendChild(div);
    });
  }

  function renderDusunsAdminTable(kadusList) {
    const tbody = document.getElementById('dusunsAdminTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    kadusList.forEach((k, idx) => {
      const lVal = k.lakiLaki || 200;
      const pVal = k.perempuan || 210;
      const totalJiwa = (k.totalPenduduk || (lVal + pVal)).toLocaleString();

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>Dusun ${k.dusun}</strong></td>
        <td>
          <input type="text" class="form-control form-control-sm kadus-input" data-idx="${idx}" value="${k.nama || ''}">
        </td>
        <td><input type="number" class="form-control form-control-sm dusun-rw-input" data-idx="${idx}" value="${k.rwCount || 2}" style="width:65px;"></td>
        <td><input type="number" class="form-control form-control-sm dusun-rt-input" data-idx="${idx}" value="${k.rtCount || 4}" style="width:65px;"></td>
        <td><input type="number" class="form-control form-control-sm dusun-kk-input" data-idx="${idx}" value="${k.kkCount || 135}" style="width:75px;"></td>
        <td><input type="number" class="form-control form-control-sm dusun-l-input" data-idx="${idx}" value="${lVal}" style="width:75px;"></td>
        <td><input type="number" class="form-control form-control-sm dusun-p-input" data-idx="${idx}" value="${pVal}" style="width:75px;"></td>
        <td style="font-weight:700; color:var(--admin-primary);">${totalJiwa}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 2. Potensi Desa CRUD
  function renderPotensiTable(potensiList) {
    const tbody = document.getElementById('potensiTableBody');
    tbody.innerHTML = '';
    potensiList.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${item.gambar}" class="img-preview-box" alt="preview"></td>
        <td><strong>${item.judul}</strong></td>
        <td><span class="btn-admin btn-admin-outline btn-admin-sm">${item.kategori}</span></td>
        <td>${item.deskripsi}</td>
        <td>
          <button class="btn-admin btn-admin-outline btn-admin-sm edit-potensi" data-index="${index}">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button class="btn-admin btn-admin-danger btn-admin-sm del-potensi" data-index="${index}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.edit-potensi').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        const item = currentData.potensi.list[idx];
        const html = `
          <div class="form-group">
            <label>Judul Potensi</label>
            <input type="text" id="mPotensiJudul" class="form-control" value="${item.judul}">
          </div>
          <div class="form-group">
            <label>Kategori</label>
            <input type="text" id="mPotensiKategori" class="form-control" value="${item.kategori}">
          </div>
          <div class="form-group">
            <label>Deskripsi Lengkap</label>
            <textarea id="mPotensiDesc" class="form-control">${item.deskripsi}</textarea>
          </div>
          <div class="form-group">
            <label>Gambar Potensi</label>
            <div class="image-upload-wrapper">
              <img id="mPotensiPreview" src="${item.gambar}" class="img-preview-box" alt="Preview">
              <div style="flex:1;">
                <input type="file" id="mPotensiFile" accept="image/*" class="form-control" style="margin-bottom:6px;">
                <input type="text" id="mPotensiUrl" class="form-control" value="${item.gambar}">
              </div>
            </div>
          </div>
        `;
        openCRUDModal('Edit Data Potensi Desa', html, () => {
          item.judul = document.getElementById('mPotensiJudul').value;
          item.kategori = document.getElementById('mPotensiKategori').value;
          item.deskripsi = document.getElementById('mPotensiDesc').value;
          item.gambar = document.getElementById('mPotensiUrl').value;
          renderPotensiTable(currentData.potensi.list);
          showToast('Data Potensi Desa diperbarui.', 'success');
        });
        bindImageInput('mPotensiFile', 'mPotensiUrl', 'mPotensiPreview');
      });
    });

    document.querySelectorAll('.del-potensi').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        if (confirm('Hapus potensi ini?')) {
          currentData.potensi.list.splice(idx, 1);
          renderPotensiTable(currentData.potensi.list);
          showToast('Potensi desa dihapus.', 'success');
        }
      });
    });
  }

  document.getElementById('btnAddPotensi').addEventListener('click', () => {
    const html = `
      <div class="form-group">
        <label>Judul Potensi</label>
        <input type="text" id="mPotensiJudul" class="form-control" placeholder="misal: Kerajinan Batu Muntilan">
      </div>
      <div class="form-group">
        <label>Kategori</label>
        <input type="text" id="mPotensiKategori" class="form-control" placeholder="misal: Pariwisata / Agrowisata / UMKM">
      </div>
      <div class="form-group">
        <label>Deskripsi</label>
        <textarea id="mPotensiDesc" class="form-control" placeholder="Deskripsi singkat potensi..."></textarea>
      </div>
      <div class="form-group">
        <label>Gambar Potensi</label>
        <div class="image-upload-wrapper">
          <img id="mPotensiPreview" src="assets/candi.png" class="img-preview-box" alt="Preview">
          <div style="flex:1;">
            <input type="file" id="mPotensiFile" accept="image/*" class="form-control" style="margin-bottom:6px;">
            <input type="text" id="mPotensiUrl" class="form-control" value="assets/candi.png">
          </div>
        </div>
      </div>
    `;
    openCRUDModal('Tambah Potensi Desa Baru', html, () => {
      const judul = document.getElementById('mPotensiJudul').value.trim();
      if (!judul) { showToast('Judul wajib diisi!', 'error'); return false; }
      currentData.potensi.list.push({
        id: 'pot_' + Date.now(),
        judul: judul,
        kategori: document.getElementById('mPotensiKategori').value || 'Potensi Desa',
        deskripsi: document.getElementById('mPotensiDesc').value || '-',
        gambar: document.getElementById('mPotensiUrl').value || 'assets/candi.png',
        tags: ['Unggulan']
      });
      renderPotensiTable(currentData.potensi.list);
      showToast('Potensi desa baru berhasil ditambahkan.', 'success');
    });
    bindImageInput('mPotensiFile', 'mPotensiUrl', 'mPotensiPreview');
  });

  // 3. Kelompok CRUD
  function renderKelompokTable(kelompokList) {
    const tbody = document.getElementById('kelompokTableBody');
    tbody.innerHTML = '';
    kelompokList.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${item.nama}</strong></td>
        <td>${item.deskripsi}</td>
        <td>
          <button class="btn-admin btn-admin-outline btn-admin-sm edit-kelompok" data-index="${index}">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button class="btn-admin btn-admin-danger btn-admin-sm del-kelompok" data-index="${index}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.edit-kelompok').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        const item = currentData.kelompok[idx];
        const html = `
          <div class="form-group">
            <label>Nama Kelompok / Organisasi</label>
            <input type="text" id="mKelompokNama" class="form-control" value="${item.nama}">
          </div>
          <div class="form-group">
            <label>Deskripsi</label>
            <textarea id="mKelompokDesc" class="form-control">${item.deskripsi}</textarea>
          </div>
        `;
        openCRUDModal('Edit Kelompok Masyarakat', html, () => {
          item.nama = document.getElementById('mKelompokNama').value;
          item.deskripsi = document.getElementById('mKelompokDesc').value;
          renderKelompokTable(currentData.kelompok);
          showToast('Data kelompok diperbarui.', 'success');
        });
      });
    });

    document.querySelectorAll('.del-kelompok').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        if (confirm('Hapus kelompok ini?')) {
          currentData.kelompok.splice(idx, 1);
          renderKelompokTable(currentData.kelompok);
          showToast('Kelompok dihapus.', 'success');
        }
      });
    });
  }

  document.getElementById('btnAddKelompok').addEventListener('click', () => {
    const html = `
      <div class="form-group">
        <label>Nama Kelompok / Organisasi</label>
        <input type="text" id="mKelompokNama" class="form-control" placeholder="misal: Group Kesenian Badui">
      </div>
      <div class="form-group">
        <label>Deskripsi Kegiatan</label>
        <textarea id="mKelompokDesc" class="form-control" placeholder="Deskripsi organisasi..."></textarea>
      </div>
    `;
    openCRUDModal('Tambah Kelompok Masyarakat Baru', html, () => {
      const nama = document.getElementById('mKelompokNama').value.trim();
      if (!nama) { showToast('Nama kelompok wajib diisi!', 'error'); return false; }
      currentData.kelompok.push({
        id: 'kel_' + Date.now(),
        nama: nama,
        deskripsi: document.getElementById('mKelompokDesc').value || '-',
        icon: 'fa-solid fa-users'
      });
      renderKelompokTable(currentData.kelompok);
      showToast('Kelompok masyarakat baru ditambahkan.', 'success');
    });
  });

  // 4. Berita CRUD
  function renderBeritaTable(beritaList) {
    const tbody = document.getElementById('beritaTableBody');
    tbody.innerHTML = '';
    beritaList.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${item.gambar}" class="img-preview-box" alt="news"></td>
        <td><strong>${item.judul}</strong></td>
        <td>${item.kategori}</td>
        <td>${item.tanggal}</td>
        <td><span style="color:#22c55e; font-weight:700;">${item.status}</span></td>
        <td>
          <button class="btn-admin btn-admin-outline btn-admin-sm edit-berita" data-index="${index}">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button class="btn-admin btn-admin-danger btn-admin-sm del-berita" data-index="${index}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.edit-berita').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        const item = currentData.berita[idx];
        const html = `
          <div class="form-group">
            <label>Judul Berita / Pengumuman</label>
            <input type="text" id="mBeritaJudul" class="form-control" value="${item.judul}">
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Kategori</label>
              <input type="text" id="mBeritaKategori" class="form-control" value="${item.kategori}">
            </div>
            <div class="form-group">
              <label>Tanggal</label>
              <input type="date" id="mBeritaTanggal" class="form-control" value="${item.tanggal}">
            </div>
          </div>
          <div class="form-group">
            <label>Ringkasan Singkat</label>
            <textarea id="mBeritaRingkasan" class="form-control">${item.ringkasan}</textarea>
          </div>
          <div class="form-group">
            <label>Isi Lengkap Berita</label>
            <textarea id="mBeritaIsi" class="form-control" style="min-height:120px;">${item.isi}</textarea>
          </div>
          <div class="form-group">
            <label>Gambar Utama Berita</label>
            <div class="image-upload-wrapper">
              <img id="mBeritaPreview" src="${item.gambar}" class="img-preview-box" alt="Preview">
              <div style="flex:1;">
                <input type="file" id="mBeritaFile" accept="image/*" class="form-control" style="margin-bottom:6px;">
                <input type="text" id="mBeritaUrl" class="form-control" value="${item.gambar}">
              </div>
            </div>
          </div>
        `;
        openCRUDModal('Edit Berita / Pengumuman', html, () => {
          item.judul = document.getElementById('mBeritaJudul').value;
          item.kategori = document.getElementById('mBeritaKategori').value;
          item.tanggal = document.getElementById('mBeritaTanggal').value;
          item.ringkasan = document.getElementById('mBeritaRingkasan').value;
          item.isi = document.getElementById('mBeritaIsi').value;
          item.gambar = document.getElementById('mBeritaUrl').value;
          renderBeritaTable(currentData.berita);
          showToast('Artikel berita diperbarui.', 'success');
        });
        bindImageInput('mBeritaFile', 'mBeritaUrl', 'mBeritaPreview');
      });
    });

    document.querySelectorAll('.del-berita').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        if (confirm('Hapus artikel berita ini?')) {
          currentData.berita.splice(idx, 1);
          renderBeritaTable(currentData.berita);
          showToast('Artikel berita dihapus.', 'success');
        }
      });
    });
  }

  document.getElementById('btnAddBerita').addEventListener('click', () => {
    const html = `
      <div class="form-group">
        <label>Judul Berita / Pengumuman</label>
        <input type="text" id="mBeritaJudul" class="form-control" placeholder="Judul artikel...">
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Kategori</label>
          <input type="text" id="mBeritaKategori" class="form-control" value="Berita">
        </div>
        <div class="form-group">
          <label>Tanggal</label>
          <input type="date" id="mBeritaTanggal" class="form-control" value="${new Date().toISOString().slice(0, 10)}">
        </div>
      </div>
      <div class="form-group">
        <label>Ringkasan Singkat</label>
        <textarea id="mBeritaRingkasan" class="form-control" placeholder="Ringkasan berita..."></textarea>
      </div>
      <div class="form-group">
        <label>Isi Lengkap Berita</label>
        <textarea id="mBeritaIsi" class="form-control" style="min-height:120px;" placeholder="Isi artikel berita lengkap..."></textarea>
      </div>
      <div class="form-group">
        <label>Gambar Utama Berita</label>
        <div class="image-upload-wrapper">
          <img id="mBeritaPreview" src="assets/candi.png" class="img-preview-box" alt="Preview">
          <div style="flex:1;">
            <input type="file" id="mBeritaFile" accept="image/*" class="form-control" style="margin-bottom:6px;">
            <input type="text" id="mBeritaUrl" class="form-control" value="assets/candi.png">
          </div>
        </div>
      </div>
    `;
    openCRUDModal('Tulis Berita / Pengumuman Baru', html, () => {
      const judul = document.getElementById('mBeritaJudul').value.trim();
      if (!judul) { showToast('Judul berita wajib diisi!', 'error'); return false; }
      currentData.berita.unshift({
        id: 'news_' + Date.now(),
        judul: judul,
        kategori: document.getElementById('mBeritaKategori').value || 'Berita',
        tanggal: document.getElementById('mBeritaTanggal').value || new Date().toISOString().slice(0, 10),
        penulis: 'Admin CMS',
        ringkasan: document.getElementById('mBeritaRingkasan').value || judul,
        isi: document.getElementById('mBeritaIsi').value || judul,
        gambar: document.getElementById('mBeritaUrl').value || 'assets/candi.png',
        status: 'published'
      });
      renderBeritaTable(currentData.berita);
      showToast('Artikel berita baru diterbitkan.', 'success');
    });
    bindImageInput('mBeritaFile', 'mBeritaUrl', 'mBeritaPreview');
  });

  // Save All Changes Handler
  saveAllBtn.addEventListener('click', async () => {
    try {
      if (!currentData) currentData = await cms.loadData() || {};

      // Branding & UI Customizer Tokens
      if (!currentData.themeConfig) currentData.themeConfig = {};
      currentData.themeConfig.logoType = document.getElementById('logoTypeSelect')?.value || 'icon';
      currentData.themeConfig.logoIcon = document.getElementById('logoIconInput')?.value || 'fa-solid fa-mountain-sun';
      currentData.themeConfig.logoImage = document.getElementById('logoImageUrlInput')?.value || 'assets/candi.png';
      currentData.themeConfig.primaryColor = document.getElementById('primaryColorInput')?.value || '#0f3822';
      currentData.themeConfig.accentColor = document.getElementById('accentColorInput')?.value || '#fbbf24';
      currentData.themeConfig.cardStyle = document.getElementById('cardStyleSelect')?.value || 'rounded-xl';
      currentData.themeConfig.layoutSpacing = document.getElementById('layoutSpacingSelect')?.value || 'default';

      // Edit Teks Branding (Posisi, Warna, Font)
      currentData.themeConfig.headingFont = document.getElementById('headingFontSelect')?.value || 'Outfit';
      currentData.themeConfig.bodyFont = document.getElementById('bodyFontSelect')?.value || 'Plus Jakarta Sans';
      currentData.themeConfig.headingColor = document.getElementById('headingColorInput')?.value || '#0f3822';
      currentData.themeConfig.textColor = document.getElementById('textColorInput')?.value || '#1e293b';
      currentData.themeConfig.accentTextColor = document.getElementById('accentTextColorInput')?.value || '#d97706';
      currentData.themeConfig.subtitleTextColor = document.getElementById('subtitleTextColorInput')?.value || '#64748b';
      currentData.themeConfig.darkCardTextColor = document.getElementById('darkCardTextColorInput')?.value || '#ffffff';
      currentData.themeConfig.heroTextAlign = document.getElementById('heroTextAlignSelect')?.value || 'left';
      currentData.themeConfig.bodyTextAlign = document.getElementById('bodyTextAlignSelect')?.value || 'left';

      if (!currentData.siteImages) currentData.siteImages = {};
      const imgBalai = document.getElementById('urlInputBalaiDesa')?.value;
      const imgCandi = document.getElementById('urlInputCandi')?.value;
      const imgDemo = document.getElementById('urlInputDemografi')?.value;
      const imgPkk = document.getElementById('urlInputPkk')?.value;
      const imgProf = document.getElementById('urlInputProfil')?.value;

      if (imgBalai) currentData.siteImages.balaiDesa = imgBalai;
      if (imgCandi) currentData.siteImages.candiNgawen = imgCandi;
      if (imgDemo) currentData.siteImages.demografi = imgDemo;
      if (imgPkk) currentData.siteImages.pkk = imgPkk;
      if (imgProf) currentData.siteImages.profil = imgProf;

      // Apply Live Theme Updates
      if (typeof cms.applyThemeAndFonts === 'function') {
        cms.applyThemeAndFonts(currentData);
      }

      // Profil inputs
      if (!currentData.profil) currentData.profil = {};
      if (!currentData.profil.stats) currentData.profil.stats = {};

      const heroPillVal = document.getElementById('profHeroPill')?.value;
      if (heroPillVal !== undefined) currentData.profil.heroPill = heroPillVal;

      const heroTitleVal = document.getElementById('profHeroTitle')?.value;
      if (heroTitleVal !== undefined) currentData.profil.heroTitle = heroTitleVal;

      const heroDescVal = document.getElementById('profHeroDesc')?.value;
      if (heroDescVal !== undefined) currentData.profil.heroDesc = heroDescVal;

      const visiVal = document.getElementById('profVisi')?.value;
      if (visiVal !== undefined) currentData.profil.visi = visiVal;

      const misiVal = document.getElementById('profMisi')?.value;
      if (misiVal !== undefined) {
        currentData.profil.misi = misiVal.split('\n').filter(m => m.trim().length > 0);
      }

      currentData.profil.stats.totalPenduduk = parseInt(document.getElementById('profStatPenduduk')?.value) || currentData.profil.stats.totalPenduduk || 4062;
      currentData.profil.stats.totalKK = parseInt(document.getElementById('profStatKK')?.value) || currentData.profil.stats.totalKK || 1363;
      currentData.profil.stats.luasWilayah = parseFloat(document.getElementById('profStatLuas')?.value) || currentData.profil.stats.luasWilayah || 202.8;
      currentData.profil.stats.totalDusun = parseInt(document.getElementById('profStatDusun')?.value) || currentData.profil.stats.totalDusun || 10;

      // Pemerintahan inputs
      if (!currentData.pemerintahan) currentData.pemerintahan = {};
      if (!currentData.pemerintahan.kepalaDesa) currentData.pemerintahan.kepalaDesa = {};

      const kadesNamaVal = document.getElementById('kadesNama')?.value;
      if (kadesNamaVal !== undefined) currentData.pemerintahan.kepalaDesa.nama = kadesNamaVal;

      const kadesDescVal = document.getElementById('kadesDesc')?.value;
      if (kadesDescVal !== undefined) currentData.pemerintahan.kepalaDesa.deskripsi = kadesDescVal;

      // Kadus & Dusun Table inputs
      if (!currentData.pemerintahan.kadus) currentData.pemerintahan.kadus = [];
      document.querySelectorAll('.kadus-input').forEach(input => {
        const idx = input.getAttribute('data-idx');
        if (currentData.pemerintahan.kadus[idx]) {
          currentData.pemerintahan.kadus[idx].nama = input.value;
        }
      });

      document.querySelectorAll('.dusun-rw-input').forEach(input => {
        const idx = input.getAttribute('data-idx');
        if (currentData.pemerintahan.kadus[idx]) {
          currentData.pemerintahan.kadus[idx].rwCount = parseInt(input.value) || 2;
        }
      });
      document.querySelectorAll('.dusun-rt-input').forEach(input => {
        const idx = input.getAttribute('data-idx');
        if (currentData.pemerintahan.kadus[idx]) {
          currentData.pemerintahan.kadus[idx].rtCount = parseInt(input.value) || 4;
        }
      });
      document.querySelectorAll('.dusun-kk-input').forEach(input => {
        const idx = input.getAttribute('data-idx');
        if (currentData.pemerintahan.kadus[idx]) {
          currentData.pemerintahan.kadus[idx].kkCount = parseInt(input.value) || 135;
        }
      });
      document.querySelectorAll('.dusun-l-input').forEach(input => {
        const idx = input.getAttribute('data-idx');
        if (currentData.pemerintahan.kadus[idx]) {
          currentData.pemerintahan.kadus[idx].lakiLaki = parseInt(input.value) || 200;
          const pVal = currentData.pemerintahan.kadus[idx].perempuan || 210;
          currentData.pemerintahan.kadus[idx].totalPenduduk = currentData.pemerintahan.kadus[idx].lakiLaki + pVal;
        }
      });
      document.querySelectorAll('.dusun-p-input').forEach(input => {
        const idx = input.getAttribute('data-idx');
        if (currentData.pemerintahan.kadus[idx]) {
          currentData.pemerintahan.kadus[idx].perempuan = parseInt(input.value) || 210;
          const lVal = currentData.pemerintahan.kadus[idx].lakiLaki || 200;
          currentData.pemerintahan.kadus[idx].totalPenduduk = lVal + currentData.pemerintahan.kadus[idx].perempuan;
        }
      });

      if (!currentData.kemasyarakatan) currentData.kemasyarakatan = {};
      if (!currentData.kemasyarakatan.pkk) currentData.kemasyarakatan.pkk = {};

      const pkkPokja = document.getElementById('pkkPokja')?.value;
      if (pkkPokja !== undefined) currentData.kemasyarakatan.pkk.pokjaCount = parseInt(pkkPokja) || 4;

      const pkkAnggota = document.getElementById('pkkAnggota')?.value;
      if (pkkAnggota !== undefined) currentData.kemasyarakatan.pkk.anggotaCount = parseInt(pkkAnggota) || 461;

      const pkkDesc = document.getElementById('pkkDesc')?.value;
      if (pkkDesc !== undefined) currentData.kemasyarakatan.pkk.deskripsi = pkkDesc;

      // Wilayah Data
      if (!currentData.wilayah) currentData.wilayah = {};
      if (!currentData.wilayah.batas) currentData.wilayah.batas = {};

      currentData.wilayah.batas.utara = document.getElementById('batasUtara')?.value || currentData.wilayah.batas.utara || '';
      currentData.wilayah.batas.selatan = document.getElementById('batasSelatan')?.value || currentData.wilayah.batas.selatan || '';
      currentData.wilayah.batas.barat = document.getElementById('batasBarat')?.value || currentData.wilayah.batas.barat || '';
      currentData.wilayah.batas.timur = document.getElementById('batasTimur')?.value || currentData.wilayah.batas.timur || '';

      currentData.wilayah.luasTotal = parseFloat(document.getElementById('wilayahLuasTotal')?.value) || currentData.wilayah.luasTotal || 202.8;
      currentData.wilayah.ketinggian = document.getElementById('wilayahKetinggian')?.value || currentData.wilayah.ketinggian || '± 320 m dpl';
      currentData.wilayah.kepadatan = document.getElementById('wilayahKepadatan')?.value || currentData.wilayah.kepadatan || '± 138.9 jiwa/Ha';
      currentData.wilayah.irigasi = document.getElementById('wilayahIrigasi')?.value || currentData.wilayah.irigasi || 'Irigasi Teknis';

      const saved = await cms.saveData(currentData);
      if (saved && saved.success) {
        showToast('✅ Seluruh perubahan data berhasil disimpan permanen ke server CMS!', 'success');
        populateForms(currentData);
      } else {
        const errText = (saved && saved.error) ? saved.error : 'Gagal menyimpan ke file server.';
        showToast(`⚠️ ${errText}`, 'error');
      }
    } catch (err) {
      console.error('Error in saveAllBtn handler:', err);
      showToast(`❌ Terjadi kesalahan saat menyimpan: ${err.message}`, 'error');
    }
  });

  // Export JSON
  document.getElementById('btnExportJSON').addEventListener('click', () => {
    cms.exportJSON();
    showToast('File backup JSON berhasil diunduh.', 'success');
  });

  // Export Excel (.xlsx)
  document.getElementById('btnExportExcel')?.addEventListener('click', () => {
    try {
      const data = currentData || cmsEngine.data || {};

      if (typeof XLSX === 'undefined') {
        showToast('Library Excel sedang dimuat, harap coba 2 detik lagi.', 'warning');
        return;
      }

      const wb = XLSX.utils.book_new();

      // 1. Sheet Profil Desa
      const s1Data = [
        ['INFORMASI PROFIL DESA NGAWEN'],
        ['Judul Portal', data.siteInfo?.title || 'Desa Ngawen'],
        ['Sub-Judul', data.siteInfo?.subtitle || ''],
        ['Nama Desa', data.siteInfo?.namaDesa || 'Ngawen'],
        ['Kecamatan', data.siteInfo?.kecamatan || 'Muntilan'],
        ['Kabupaten', data.siteInfo?.kabupaten || 'Magelang'],
        ['Provinsi', data.siteInfo?.provinsi || 'Jawa Tengah'],
        ['Kode Pos', data.siteInfo?.kodePos || '56451'],
        ['Luas Wilayah Total', `${data.wilayah?.luasTotal || 202.8} Ha`],
        ['Total Penduduk', `${data.pemerintahan?.statistikUtama?.penduduk || 4150} Jiwa`],
        ['Total Kepala Keluarga', `${data.pemerintahan?.statistikUtama?.kk || 1370} KK`],
        ['Alamat Kantor', data.siteInfo?.alamatKantor || ''],
        ['Nomor WhatsApp', data.siteInfo?.kontakResmi?.whatsapp || ''],
        ['Email Resmi', data.siteInfo?.kontakResmi?.email || '']
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(s1Data);
      XLSX.utils.book_append_sheet(wb, ws1, 'Profil Desa');

      // 2. Sheet APBDes 2026
      if (data.keuangan) {
        const k = data.keuangan;
        const s2Data = [
          ['TRANSPARANSI KEUANGAN & APBDES 2026'],
          ['Tahun Anggaran', k.tahunAnggaran || '2026'],
          ['Total Pendapatan', k.pendapatanTotal || ''],
          ['Total Belanja', k.belanjaTotal || ''],
          ['Pembiayaan Netto', k.pembiayaanNetto || ''],
          ['Catatan Transparansi', k.catatan || ''],
          [],
          ['SUMBER PENDAPATAN DESA'],
          ['Kategori Sumber', 'Jumlah (Rp)', 'Persentase (%)']
        ];
        (k.sumberPendapatan || []).forEach(item => {
          s2Data.push([item.kategori, item.jumlah, item.persen]);
        });

        s2Data.push([], ['ALOKASI BELANJA DESA'], ['Bidang Belanja', 'Jumlah Alokasi (Rp)']);
        (k.alokasiBelanja || []).forEach(item => {
          s2Data.push([item.bidang, item.jumlah]);
        });

        const ws2 = XLSX.utils.aoa_to_sheet(s2Data);
        XLSX.utils.book_append_sheet(wb, ws2, 'Keuangan APBDes');
      }

      // 3. Sheet Dokumen Perdes & JDIH
      if (data.jdih && data.jdih.length > 0) {
        const s3Data = [
          ['DOKUMEN HUKUM & PERATURAN DESA (JDIH)'],
          ['Nomor Dokumen', 'Judul Peraturan / Keputusan', 'Kategori', 'Tahun', 'Status Hukum']
        ];
        data.jdih.forEach(doc => {
          s3Data.push([doc.nomor, doc.judul, doc.kategori, doc.tahun, doc.status]);
        });
        const ws3 = XLSX.utils.aoa_to_sheet(s3Data);
        XLSX.utils.book_append_sheet(wb, ws3, 'Dokumen JDIH');
      }

      // 4. Sheet 10 Dusun & Kadus
      if (data.wilayah && data.wilayah.dusun) {
        const s4Data = [
          ['DATA WILAYAH & KEPALA DUSUN (KADUS)'],
          ['Nama Dusun', 'Kepala Dusun (Kadus)', 'Jumlah RW', 'Jumlah RT', 'Jumlah KK']
        ];
        data.wilayah.dusun.forEach(d => {
          s4Data.push([d.nama, d.kadus, d.rw, d.rt, d.kk]);
        });
        const ws4 = XLSX.utils.aoa_to_sheet(s4Data);
        XLSX.utils.book_append_sheet(wb, ws4, 'Data 10 Dusun');
      }

      // 5. Sheet Lokasi Peta Desa
      if (data.wilayah && data.wilayah.lokasiPeta) {
        const s5Data = [
          ['POIN PENTING PETA DESA NGAWEN'],
          ['Nama Lokasi', 'Kategori', 'Latitude', 'Longitude', 'Deskripsi Ringkas']
        ];
        data.wilayah.lokasiPeta.forEach(p => {
          s5Data.push([p.name, p.category, p.lat, p.lng, p.desc]);
        });
        const ws5 = XLSX.utils.aoa_to_sheet(s5Data);
        XLSX.utils.book_append_sheet(wb, ws5, 'Poin Lokasi Peta');
      }

      // 6. Sheet Berita Desa
      if (data.berita && data.berita.length > 0) {
        const s6Data = [
          ['BERITA & PENGUMUMAN DESA NGAWEN'],
          ['ID', 'Judul Artikel', 'Kategori', 'Tanggal', 'Penulis', 'Status', 'Dibaca (Views)', 'Ringkasan']
        ];
        data.berita.forEach(b => {
          s6Data.push([b.id, b.judul, b.kategori, b.tanggal, b.penulis, b.status || 'published', b.views || 0, b.ringkasan]);
        });
        const ws6 = XLSX.utils.aoa_to_sheet(s6Data);
        XLSX.utils.book_append_sheet(wb, ws6, 'Berita & Warta');
      }

      // 7. Sheet Laporan Warga
      if (data.laporanWarga && data.laporanWarga.length > 0) {
        const s7Data = [
          ['REKAPITULASI LAPORAN & PENGADUAN WARGA'],
          ['Kode Tiket', 'Nama Pelapor', 'Dusun', 'Kategori', 'Tanggal', 'Status', 'Isi Laporan', 'Tanggapan Admin']
        ];
        data.laporanWarga.forEach(l => {
          s7Data.push([l.trackingCode, l.nama, l.dusun, l.kategori, l.tanggal, l.status, l.isi, l.tanggapanAdmin || '-']);
        });
        const ws7 = XLSX.utils.aoa_to_sheet(s7Data);
        XLSX.utils.book_append_sheet(wb, ws7, 'Laporan Pengaduan');
      }

      // 8. Sheet Permohonan Surat Online
      if (data.suratRequests && data.suratRequests.length > 0) {
        const s8Data = [
          ['PERMOHONAN SURAT DIGITAL WARGA'],
          ['Kode Tiket', 'Nama Pemohon', 'NIK', 'Dusun', 'Jenis Surat', 'Keperluan', 'Status', 'Nomor Surat Resmi', 'Catatan Admin']
        ];
        data.suratRequests.forEach(s => {
          s8Data.push([s.requestCode, s.nama, s.nik, s.dusun, s.jenisSurat, s.keperluan, s.status, s.nomorSuratResmi || '-', s.catatanAdmin || '-']);
        });
        const ws8 = XLSX.utils.aoa_to_sheet(s8Data);
        XLSX.utils.book_append_sheet(wb, ws8, 'Permohonan Surat');
      }

      const fileName = `Backup_CMS_Desa_Ngawen_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast(`Berhasil mengunduh backup Excel (.xlsx): ${fileName}`, 'success');
    } catch (err) {
      console.error('Export Excel failed:', err);
      showToast('Gagal melakukan export Excel: ' + err.message, 'error');
    }
  });

  // Import JSON
  document.getElementById('btnImportJSON').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const success = cms.importJSON(evt.target.result);
      if (success) {
        currentData = await cms.loadData();
        populateForms(currentData);
        showToast('Data CMS berhasil di-restore dari file JSON!', 'success');
      }
    };
    reader.readAsText(file);
  });

  // Reset CMS
  document.getElementById('btnResetCMS').addEventListener('click', async () => {
    if (confirm('Apakah Anda yakin ingin mengembalikan seluruh data ke default awal?')) {
      currentData = await cms.resetData();
      populateForms(currentData);
      showToast('Data berhasil di-reset ke default.', 'success');
    }
  });

  // =========================================================
  // 5. MANAJEMEN LAPORAN WARGA & PENGADUAN (FULL CRUD & RESPONSE)
  // =========================================================

  function renderDashRecentLaporan() {
    const box = document.getElementById('dashRecentLaporanBox');
    if (!box) return;

    const laporanList = currentData.laporan || [];
    if (laporanList.length === 0) {
      box.innerHTML = '<div style="color:var(--admin-muted); font-size:0.85rem;">Belum ada laporan warga.</div>';
      return;
    }

    let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
    laporanList.slice(0, 3).forEach(item => {
      let badgeClass = 'badge badge-warning';
      if (item.status === 'Diproses') badgeClass = 'badge badge-info';
      else if (item.status === 'Selesai') badgeClass = 'badge badge-success';
      else if (item.status === 'Ditolak') badgeClass = 'badge badge-danger';

      html += `
        <div style="background:var(--admin-bg); padding:12px 14px; border-radius:8px; border:1px solid var(--admin-border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="min-width:0; flex:1;">
            <div style="font-size:0.82rem; font-weight:700; margin-bottom:3px;">
              <span style="background:var(--admin-primary); color:#fff; padding:2px 7px; border-radius:4px; margin-right:6px; font-size:0.72rem;">${item.trackingCode}</span>
              ${item.nama} &mdash; ${item.dusun}
            </div>
            <div style="font-size:0.8rem; color:var(--admin-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">&ldquo;${item.isi.substring(0, 70)}${item.isi.length > 70 ? '...' : ''}&rdquo;</div>
          </div>
          <span class="${badgeClass}">${item.status}</span>
        </div>
      `;
    });
    html += '</div>';
    box.innerHTML = html;
  }

  function renderLaporanTable() {
    const tbody = document.getElementById('laporanTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const laporanList = currentData.laporan || [];

    // Filter controls
    const searchVal = (document.getElementById('searchLaporanInput')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('filterLaporanStatus')?.value || 'Semua';
    const dusunVal = document.getElementById('filterLaporanDusun')?.value || 'Semua';

    // Calculate Stats
    const totalCount = laporanList.length;
    const pendingCount = laporanList.filter(l => l.status === 'Menunggu Verifikasi').length;
    const prosesCount = laporanList.filter(l => l.status === 'Diproses').length;
    const selesaiCount = laporanList.filter(l => l.status === 'Selesai').length;

    // Update UI Stats
    if (document.getElementById('statLapTotal')) document.getElementById('statLapTotal').innerText = totalCount;
    if (document.getElementById('statLapPending')) document.getElementById('statLapPending').innerText = pendingCount;
    if (document.getElementById('statLapProses')) document.getElementById('statLapProses').innerText = prosesCount;
    if (document.getElementById('statLapSelesai')) document.getElementById('statLapSelesai').innerText = selesaiCount;

    if (document.getElementById('dashStatLaporan')) document.getElementById('dashStatLaporan').innerText = totalCount;
    if (document.getElementById('dashStatPending')) document.getElementById('dashStatPending').innerText = pendingCount;

    const badgeNav = document.getElementById('badgePendingLaporanCount');
    if (badgeNav) {
      badgeNav.innerText = pendingCount;
      badgeNav.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }

    // Filter list
    const filtered = laporanList.filter(item => {
      const matchSearch = !searchVal ||
        item.trackingCode.toLowerCase().includes(searchVal) ||
        item.nama.toLowerCase().includes(searchVal) ||
        item.isi.toLowerCase().includes(searchVal) ||
        item.kategori.toLowerCase().includes(searchVal);

      const matchStatus = statusVal === 'Semua' || item.status === statusVal;
      const matchDusun = dusunVal === 'Semua' || item.dusun === dusunVal;

      return matchSearch && matchStatus && matchDusun;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--admin-muted);">Tidak ada laporan yang sesuai filter.</td></tr>';
      return;
    }

    filtered.forEach((item) => {
      const realIndex = currentData.laporan.findIndex(l => l.id === item.id);
      const tr = document.createElement('tr');

      let statusBg = 'background:#fef3c7; color:#92400e; border:1px solid #fcd34d;';
      if (item.status === 'Diproses') statusBg = 'background:#dbeafe; color:#1e40af; border:1px solid #93c5fd;';
      else if (item.status === 'Selesai') statusBg = 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;';
      else if (item.status === 'Ditolak') statusBg = 'background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;';

      let prioBg = 'background:#f1f5f9; color:#475569;';
      if (item.prioritas === 'Penting') prioBg = 'background:#fef3c7; color:#b45309;';
      else if (item.prioritas === 'Mendesak') prioBg = 'background:#fee2e2; color:#b91c1c; font-weight:800;';

      tr.innerHTML = `
        <td>
          <span style="font-weight:800; font-size:0.8rem; background:var(--admin-primary); color:#fff; padding:2px 6px; border-radius:4px; display:inline-block; margin-bottom:4px;">${item.trackingCode}</span>
          <div style="font-size:0.75rem; color:var(--admin-muted);">${item.tanggal}</div>
        </td>
        <td>
          <strong>${item.nama}</strong>
          <div style="font-size:0.78rem; color:var(--admin-muted);"><i class="fa-solid fa-location-dot"></i> Dusun ${item.dusun}</div>
        </td>
        <td>
          <div style="font-size:0.83rem; font-weight:600;">${item.kategori}</div>
          <span style="font-size:0.7rem; padding:2px 6px; border-radius:4px; display:inline-block; margin-top:2px; ${prioBg}">${item.prioritas || 'Biasa'}</span>
        </td>
        <td style="max-width:240px;">
          <div style="font-size:0.83rem; line-height:1.4; max-height:48px; overflow:hidden; text-overflow:ellipsis;">"${item.isi}"</div>
        </td>
        <td>
          <span style="font-size:0.75rem; font-weight:700; padding:4px 8px; border-radius:12px; display:inline-block; ${statusBg}">
            ${item.status}
          </span>
        </td>
        <td style="max-width:180px;">
          ${item.tanggapanAdmin ? `
            <div style="font-size:0.78rem; color:#059669; font-weight:600;"><i class="fa-solid fa-check-double"></i> Sudah Dibalas</div>
            <div style="font-size:0.72rem; color:var(--admin-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.tanggapanAdmin}</div>
          ` : `
            <div style="font-size:0.78rem; color:#94a3b8; font-style:italic;">Belum dibalas</div>
          `}
        </td>
        <td>
          <div style="display:flex; gap:4px;">
            <button class="btn-admin btn-admin-accent btn-admin-sm respond-laporan" data-index="${realIndex}" title="Tanggapi / Ubah Status">
              <i class="fa-solid fa-reply"></i> Tanggapi
            </button>
            <button class="btn-admin btn-admin-outline btn-admin-sm detail-laporan" data-index="${realIndex}" title="Lihat Detail">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn-admin btn-admin-danger btn-admin-sm del-laporan" data-index="${realIndex}" title="Hapus Laporan">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Bind Action Buttons
    document.querySelectorAll('.respond-laporan').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        const item = currentData.laporan[idx];
        if (!item) return;

        const html = `
          <div style="background:var(--admin-bg); padding:12px; border-radius:8px; margin-bottom:16px; border:1px solid var(--admin-border);">
            <div style="font-size:0.8rem; font-weight:700; color:var(--admin-muted); text-transform:uppercase;">Ringkasan Laporan Warga</div>
            <div style="font-size:0.9rem; font-weight:700; margin-top:4px;">${item.nama} (${item.dusun}) — Kode: ${item.trackingCode}</div>
            <div style="font-size:0.85rem; color:var(--admin-text); margin-top:6px; background:var(--admin-surface); padding:10px; border-radius:6px; border:1px solid var(--admin-border);">&ldquo;${item.isi}&rdquo;</div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label>Status Penanganan Laporan</label>
              <select id="mStatusLaporan" class="form-control">
                <option value="Menunggu Verifikasi" ${item.status === 'Menunggu Verifikasi' ? 'selected' : ''}>Menunggu Verifikasi</option>
                <option value="Diproses" ${item.status === 'Diproses' ? 'selected' : ''}>Diproses (Sedang Dikerjakan)</option>
                <option value="Selesai" ${item.status === 'Selesai' ? 'selected' : ''}>Selesai (Tindak Lanjut Tuntas)</option>
                <option value="Ditolak" ${item.status === 'Ditolak' ? 'selected' : ''}>Ditolak (Tidak Valid / Luar Wewenang)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tingkat Prioritas</label>
              <select id="mPrioritasLaporan" class="form-control">
                <option value="Biasa" ${item.prioritas === 'Biasa' ? 'selected' : ''}>Biasa</option>
                <option value="Penting" ${item.prioritas === 'Penting' ? 'selected' : ''}>Penting</option>
                <option value="Mendesak" ${item.prioritas === 'Mendesak' ? 'selected' : ''}>Mendesak</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Tanggapan Resmi Pemerintah Desa Ngawen</label>
            <textarea id="mTanggapanAdmin" class="form-control" rows="4" placeholder="Tuliskan jawaban resmi, solusi, atau instruksi langkah penanganan untuk warga...">${item.tanggapanAdmin || ''}</textarea>
          </div>
        `;

        openCRUDModal(`Tindak Lanjut & Tanggapan Laporan (${item.trackingCode})`, html, async () => {
          const newStatus = document.getElementById('mStatusLaporan').value;
          const newPrioritas = document.getElementById('mPrioritasLaporan').value;
          const newTanggapan = document.getElementById('mTanggapanAdmin').value.trim();

          const now = new Date();
          const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

          item.status = newStatus;
          item.prioritas = newPrioritas;
          item.tanggapanAdmin = newTanggapan;
          item.tanggalTanggapan = formattedDate;

          await cms.saveData(currentData);
          renderLaporanTable();
          renderDashRecentLaporan();
          showToast(`Laporan ${item.trackingCode} berhasil diperbarui!`, 'success');
        });
      });
    });

    document.querySelectorAll('.detail-laporan').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        const item = currentData.laporan[idx];
        if (!item) return;

        const html = `
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:1.1rem; font-weight:800; color:var(--admin-primary);">${item.trackingCode}</span>
              <span style="font-size:0.8rem; font-weight:700; padding:4px 10px; border-radius:12px; background:#e2e8f0; color:#334155;">${item.status}</span>
            </div>
            <hr style="border:none; border-top:1px solid var(--admin-border);">
            <div><strong>Nama Pelapor:</strong> ${item.nama}</div>
            <div><strong>Dusun:</strong> ${item.dusun}</div>
            <div><strong>Kategori:</strong> ${item.kategori}</div>
            <div><strong>Tanggal Masuk:</strong> ${item.tanggal}</div>
            <div><strong>Prioritas:</strong> ${item.prioritas || 'Biasa'}</div>
            <div style="margin-top:8px; font-weight:700;">Isi Laporan / Aspirasi:</div>
            <div style="background:var(--admin-bg); padding:12px; border-radius:8px; font-size:0.9rem; line-height:1.5;">${item.isi}</div>
            
            ${item.tanggapanAdmin ? `
              <div style="margin-top:8px; font-weight:700; color:#065f46;">Tanggapan Resmi Pemdes:</div>
              <div style="background:#ecfdf5; border-left:4px solid #10b981; padding:12px; border-radius:6px; font-size:0.88rem; color:#047857;">
                ${item.tanggapanAdmin}
                <div style="font-size:0.75rem; color:#059669; margin-top:6px; text-align:right;">Dibalas pada: ${item.tanggalTanggapan}</div>
              </div>
            ` : '<div style="font-size:0.85rem; color:#94a3b8; font-style:italic; margin-top:8px;">Belum ada tanggapan resmi dari desa.</div>'}
          </div>
        `;
        openCRUDModal('Detail Lengkap Laporan Warga', html, () => { });
      });
    });

    document.querySelectorAll('.del-laporan').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        if (confirm('Hapus laporan warga ini secara permanen?')) {
          currentData.laporan.splice(idx, 1);
          await cms.saveData(currentData);
          renderLaporanTable();
          renderDashRecentLaporan();
          showToast('Laporan warga berhasil dihapus.', 'success');
        }
      });
    });
  }

  // Filter Event Listeners for Laporan Table
  document.getElementById('searchLaporanInput')?.addEventListener('input', renderLaporanTable);
  document.getElementById('filterLaporanStatus')?.addEventListener('change', renderLaporanTable);
  document.getElementById('filterLaporanDusun')?.addEventListener('change', renderLaporanTable);

  // Button Dashboard Link to Laporan
  document.getElementById('btnDashGoLaporan')?.addEventListener('click', () => {
    document.querySelector('[data-tab=tab-laporan]')?.click();
  });

  // Export CSV Button
  document.getElementById('btnExportLaporanCSV')?.addEventListener('click', () => {
    cms.exportLaporanCSV();
  });

  // Tambah Laporan Manual (Walk-in Citizen)
  document.getElementById('btnAddLaporanManual')?.addEventListener('click', () => {
    const html = `
      <div class="form-group">
        <label>Nama Pelapor</label>
        <input type="text" id="mAddNama" class="form-control" placeholder="Nama warga..." required>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Dusun Tempat Tinggal</label>
          <select id="mAddDusun" class="form-control">
            <option value="Kolokendang">Kolokendang</option>
            <option value="Citromenggalan">Citromenggalan</option>
            <option value="Clapar">Clapar</option>
            <option value="Gejayan">Gejayan</option>
            <option value="Jetis">Jetis</option>
            <option value="Judah">Judah</option>
            <option value="Kemiriombo">Kemiriombo</option>
            <option value="Kesaran">Kesaran</option>
            <option value="Nganten">Nganten</option>
            <option value="Ngawen">Ngawen</option>
          </select>
        </div>
        <div class="form-group">
          <label>Kategori Laporan</label>
          <select id="mAddKategori" class="form-control">
            <option value="Fasilitas Publik & Jalan">Fasilitas Publik & Jalan</option>
            <option value="Pelayanan Administrasi">Pelayanan Administrasi Desa</option>
            <option value="Kesehatan & Posyandu">Kesehatan & Posyandu</option>
            <option value="Kebersihan & Lingkungan">Kebersihan & Lingkungan</option>
            <option value="Saran & Masukan">Saran & Masukan Umum</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Isi Laporan / Pengaduan</label>
        <textarea id="mAddIsi" class="form-control" rows="3" placeholder="Tuliskan uraian laporan warga..."></textarea>
      </div>
    `;

    openCRUDModal('Tambah Laporan Warga Manual (Tatap Muka)', html, async () => {
      const nama = document.getElementById('mAddNama').value.trim();
      const dusun = document.getElementById('mAddDusun').value;
      const kategori = document.getElementById('mAddKategori').value;
      const isi = document.getElementById('mAddIsi').value.trim();

      if (!nama || !isi) {
        showToast('Nama pelapor dan isi laporan wajib diisi!', 'error');
        return false;
      }

      await cms.addLaporan({ nama, dusun, kategori, isi });
      renderLaporanTable();
      renderDashRecentLaporan();
      showToast('Laporan manual baru berhasil ditambahkan.', 'success');
    });
  });

  // =========================================================
  // 6. MANAJEMEN LAYANAN SURAT DIGITAL (FULL CRUD)
  // =========================================================

  function renderLayananSuratTable(layananList) {
    const tbody = document.getElementById('layananSuratTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!layananList || layananList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Belum ada layanan surat digital.</td></tr>';
      return;
    }

    layananList.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="font-weight:700;"><i class="${item.icon}"></i> ${item.nama}</div>
          <span style="font-size:0.75rem; background:var(--admin-primary); color:#fff; padding:2px 6px; border-radius:4px;">${item.kode}</span>
        </td>
        <td>${item.kategori}</td>
        <td><i class="fa-regular fa-clock"></i> ${item.estimasi}</td>
        <td>
          <ul style="margin:0; padding-left:16px; font-size:0.8rem;">
            ${(item.persyaratan || []).map(p => `<li>${p}</li>`).join('')}
          </ul>
        </td>
        <td>
          <button class="btn-admin btn-admin-outline btn-admin-sm edit-surat" data-index="${index}">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button class="btn-admin btn-admin-danger btn-admin-sm del-surat" data-index="${index}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.edit-surat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        const item = currentData.layananSurat[idx];
        const html = `
          <div class="form-grid-2">
            <div class="form-group">
              <label>Kode Surat</label>
              <input type="text" id="mSuratKode" class="form-control" value="${item.kode}">
            </div>
            <div class="form-group">
              <label>Nama Layanan Surat</label>
              <input type="text" id="mSuratNama" class="form-control" value="${item.nama}">
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Kategori</label>
              <input type="text" id="mSuratKategori" class="form-control" value="${item.kategori}">
            </div>
            <div class="form-group">
              <label>Estimasi Waktu Proses</label>
              <input type="text" id="mSuratEstimasi" class="form-control" value="${item.estimasi}">
            </div>
          </div>
          <div class="form-group">
            <label>Persyaratan Dokumen (1 syarat per baris)</label>
            <textarea id="mSuratSyarat" class="form-control" rows="4">${(item.persyaratan || []).join('\n')}</textarea>
          </div>
        `;
        openCRUDModal('Edit Layanan Surat Digital', html, async () => {
          item.kode = document.getElementById('mSuratKode').value;
          item.nama = document.getElementById('mSuratNama').value;
          item.kategori = document.getElementById('mSuratKategori').value;
          item.estimasi = document.getElementById('mSuratEstimasi').value;
          item.persyaratan = document.getElementById('mSuratSyarat').value.split('\n').filter(s => s.trim().length > 0);

          await cms.saveData(currentData);
          renderLayananSuratTable(currentData.layananSurat);
          showToast('Layanan surat digital diperbarui.', 'success');
        });
      });
    });

    document.querySelectorAll('.del-surat').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        if (confirm('Hapus layanan surat ini?')) {
          currentData.layananSurat.splice(idx, 1);
          await cms.saveData(currentData);
          renderLayananSuratTable(currentData.layananSurat);
          showToast('Layanan surat dihapus.', 'success');
        }
      });
    });
  }

  document.getElementById('btnAddLayananSurat')?.addEventListener('click', () => {
    const html = `
      <div class="form-grid-2">
        <div class="form-group">
          <label>Kode Surat</label>
          <input type="text" id="mSuratKode" class="form-control" placeholder="misal: SKU / SKTM">
        </div>
        <div class="form-group">
          <label>Nama Layanan Surat</label>
          <input type="text" id="mSuratNama" class="form-control" placeholder="misal: Surat Keterangan Usaha">
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Kategori</label>
          <input type="text" id="mSuratKategori" class="form-control" value="Kependudukan">
        </div>
        <div class="form-group">
          <label>Estimasi Waktu Proses</label>
          <input type="text" id="mSuratEstimasi" class="form-control" value="15 - 30 Menit">
        </div>
      </div>
      <div class="form-group">
        <label>Persyaratan Dokumen (1 syarat per baris)</label>
        <textarea id="mSuratSyarat" class="form-control" rows="4" placeholder="Surat Pengantar RT/RW&#10;Fotokopi KTP&#10;Fotokopi KK"></textarea>
      </div>
    `;

    openCRUDModal('Tambah Layanan Surat Digital Baru', html, async () => {
      const nama = document.getElementById('mSuratNama').value.trim();
      const kode = document.getElementById('mSuratKode').value.trim();

      if (!nama || !kode) {
        showToast('Kode & nama surat wajib diisi!', 'error');
        return false;
      }

      currentData.layananSurat.push({
        id: 'surat_' + Date.now(),
        kode: kode,
        nama: nama,
        kategori: document.getElementById('mSuratKategori').value || 'Kependudukan',
        estimasi: document.getElementById('mSuratEstimasi').value || '15 Menit',
        persyaratan: document.getElementById('mSuratSyarat').value.split('\n').filter(s => s.trim().length > 0),
        icon: 'fa-solid fa-file-lines'
      });

      await cms.saveData(currentData);
      renderLayananSuratTable(currentData.layananSurat);
      showToast('Layanan surat baru berhasil ditambahkan.', 'success');
    });
  });

  // Permohonan Surat Online Masuk & Digital Letter Generator Preview
  function renderSuratRequestTable() {
    const tbody = document.getElementById('suratRequestTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!currentData.suratRequests) currentData.suratRequests = [];
    const list = currentData.suratRequests;

    const totalCount = list.length;
    const pendingCount = list.filter(r => r.status === 'Menunggu Memproses').length;
    const prosesCount = list.filter(r => r.status === 'Diproses').length;
    const selesaiCount = list.filter(r => r.status === 'Disetujui' || r.status === 'Siap Diambil' || r.status === 'Selesai').length;

    safeSetText('statSuratTotal', totalCount);
    safeSetText('statSuratPending', pendingCount);
    safeSetText('statSuratProses', prosesCount);
    safeSetText('statSuratSelesai', selesaiCount);

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--admin-muted);">Belum ada permohonan surat masuk dari warga.</td></tr>';
      return;
    }

    list.forEach((item, index) => {
      const tr = document.createElement('tr');

      let statusBg = 'background:#fef3c7; color:#92400e; border:1px solid #fcd34d;';
      if (item.status === 'Diproses') statusBg = 'background:#dbeafe; color:#1e40af; border:1px solid #93c5fd;';
      else if (item.status === 'Disetujui' || item.status === 'Siap Diambil' || item.status === 'Selesai') statusBg = 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;';
      else if (item.status === 'Ditolak') statusBg = 'background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;';

      tr.innerHTML = `
        <td>
          <span style="font-weight:800; font-size:0.8rem; background:var(--admin-primary); color:#fff; padding:2px 6px; border-radius:4px;">${item.requestCode}</span>
          <div style="font-size:0.75rem; color:var(--admin-muted); margin-top:2px;">${item.tanggal}</div>
        </td>
        <td>
          <strong>${item.nama}</strong>
          <div style="font-size:0.78rem; color:var(--admin-muted);">NIK: ${item.nik} &bull; Dusun ${item.dusun}</div>
        </td>
        <td>
          <div style="font-weight:700; font-size:0.85rem;">${item.jenisSurat}</div>
          <span style="font-size:0.72rem; background:var(--admin-bg); padding:1px 6px; border-radius:4px;">${item.kodeSurat}</span>
        </td>
        <td style="max-width:200px;">
          <div style="font-size:0.82rem; line-height:1.3;">${item.keperluan}</div>
        </td>
        <td>
          <span style="font-size:0.75rem; font-weight:700; padding:4px 8px; border-radius:12px; display:inline-block; ${statusBg}">
            ${item.status}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:4px; flex-wrap:wrap;">
            <button class="btn-admin btn-admin-accent btn-admin-sm process-surat" data-index="${index}" title="Proses / Ubah Status">
              <i class="fa-solid fa-gears"></i> Proses
            </button>
            <button class="btn-admin btn-admin-outline btn-admin-sm print-surat" data-index="${index}" title="Cetak / Preview Draft Surat Digital">
              <i class="fa-solid fa-print"></i> Preview
            </button>
            <button class="btn-admin btn-admin-danger btn-admin-sm del-surat-req" data-index="${index}" title="Hapus Permohonan">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Action handlers for surat requests
    document.querySelectorAll('.process-surat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        const item = currentData.suratRequests[idx];
        if (!item) return;

        const html = `
          <div style="background:var(--admin-bg); padding:12px; border-radius:8px; margin-bottom:14px; border:1px solid var(--admin-border);">
            <div style="font-size:0.82rem; font-weight:700; color:var(--admin-primary);">Permohonan: ${item.jenisSurat} (${item.requestCode})</div>
            <div style="font-size:0.85rem; margin-top:4px;">Pemohon: <strong>${item.nama}</strong> (NIK: ${item.nik}, Dusun ${item.dusun})</div>
            <div style="font-size:0.82rem; color:var(--admin-muted); margin-top:4px;">Keperluan: &ldquo;${item.keperluan}&rdquo;</div>
          </div>

          <div class="form-group">
            <label>Status Permohonan Surat</label>
            <select id="mSuratReqStatus" class="form-control">
              <option value="Menunggu Memproses" ${item.status === 'Menunggu Memproses' ? 'selected' : ''}>Menunggu Memproses</option>
              <option value="Diproses" ${item.status === 'Diproses' ? 'selected' : ''}>Diproses (Pengecekan Berkas)</option>
              <option value="Siap Diambil" ${item.status === 'Siap Diambil' ? 'selected' : ''}>Siap Diambil di Balai Desa</option>
              <option value="Selesai" ${item.status === 'Selesai' ? 'selected' : ''}>Selesai / Terbit</option>
              <option value="Ditolak" ${item.status === 'Ditolak' ? 'selected' : ''}>Ditolak (Berkas Tidak Lengkap)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Nomor Surat Resmi Pemdes (Contoh: 470/102/2026/NGW)</label>
            <input type="text" id="mSuratReqNomor" class="form-control" value="${item.nomorSuratResmi || '470/' + Math.floor(100 + Math.random() * 900) + '/2026/NGW'}">
          </div>

          <div class="form-group">
            <label>Catatan / Instruksi Tambahan Admin</label>
            <textarea id="mSuratReqCatatan" class="form-control" rows="3" placeholder="misal: Harap membawa KTP asli saat mengambil surat di kantor balai desa.">${item.catatanAdmin || ''}</textarea>
          </div>
        `;

        openCRUDModal(`Proses Permohonan Surat (${item.requestCode})`, html, async () => {
          const newStatus = document.getElementById('mSuratReqStatus').value;
          const newNomor = document.getElementById('mSuratReqNomor').value.trim();
          const newCatatan = document.getElementById('mSuratReqCatatan').value.trim();

          item.status = newStatus;
          item.nomorSuratResmi = newNomor;
          item.catatanAdmin = newCatatan;
          item.tanggalProses = new Date().toLocaleString('id-ID');

          await cms.saveData(currentData);
          renderSuratRequestTable();
          showToast(`Status permohonan surat ${item.requestCode} diperbarui.`, 'success');
        });
      });
    });

    document.querySelectorAll('.print-surat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        const item = currentData.suratRequests[idx];
        if (!item) return;

        const kadesNama = currentData.pemerintahan?.kepalaDesa?.nama || 'Kepala Desa Ngawen';
        const nomorSurat = item.nomorSuratResmi || `470/${Math.floor(100 + Math.random() * 900)}/2026/NGW`;

        const letterHTML = `
          <div id="printableLetterContainer" style="background:#ffffff; color:#000000; padding:24px; font-family:'Times New Roman', Times, serif; font-size:12pt; line-height:1.5; border:1px solid #cbd5e1; border-radius:8px;">
            <!-- Kop Surat -->
            <div style="display:flex; align-items:center; border-bottom:3px double #000000; padding-bottom:10px; margin-bottom:16px;">
              <div style="width:60px; height:60px; background:#0f3822; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fbbf24; font-size:1.6rem; flex-shrink:0; margin-right:16px;">
                <i class="fa-solid fa-mountain-sun"></i>
              </div>
              <div style="text-align:center; flex:1;">
                <h4 style="margin:0; font-size:12pt; font-weight:bold; text-transform:uppercase; font-family:'Times New Roman', serif;">PEMERINTAH KABUPATEN MAGELANG</h4>
                <h3 style="margin:0; font-size:13pt; font-weight:bold; text-transform:uppercase;">KECAMATAN MUNTILAN &bull; KEPALA DESA NGAWEN</h3>
                <div style="font-size:9pt; margin-top:2px;">Alamat: Ngawen, Kec. Muntilan, Kab. Magelang, Jawa Tengah 56451 &bull; Email: Pemdesangawen@gmail.com</div>
              </div>
            </div>

            <!-- Judul Surat -->
            <div style="text-align:center; margin-bottom:20px;">
              <h3 style="margin:0; font-size:12pt; font-weight:bold; text-decoration:underline; text-transform:uppercase;">${item.jenisSurat}</h3>
              <div style="font-size:10pt;">Nomor: ${nomorSurat}</div>
            </div>

            <!-- Isi Surat -->
            <p style="text-align:justify; text-indent:30px; margin-bottom:12px;">
              Yang bertanda tangan di bawah ini Kepala Desa Ngawen, Kecamatan Muntilan, Kabupaten Magelang, Provinsi Jawa Tengah, menerangkan dengan sebenarnya bahwa:
            </p>

            <table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:11pt; line-height:1.6; margin-left:20px;">
              <tr><td style="width:160px; font-weight:bold;">Nama Lengkap</td><td>: ${item.nama}</td></tr>
              <tr><td style="font-weight:bold;">NIK</td><td>: ${item.nik}</td></tr>
              <tr><td style="font-weight:bold;">Tempat Tinggal / Dusun</td><td>: Dusun ${item.dusun}, Desa Ngawen, Muntilan</td></tr>
              <tr><td style="font-weight:bold;">No. Kontak / WA</td><td>: ${item.nohp || '-'}</td></tr>
              <tr><td style="font-weight:bold;">Maksud / Keperluan</td><td>: ${item.keperluan}</td></tr>
            </table>

            <p style="text-align:justify; text-indent:30px; margin-bottom:12px;">
              Orang tersebut di atas adalah benar-benar warga penduduk berdomisili di Desa Ngawen, Kecamatan Muntilan, Kabupaten Magelang yang berkelakuan baik dan Surat Keterangan ini dibuat untuk keperluan <strong>${item.keperluan}</strong>.
            </p>

            <p style="text-align:justify; text-indent:30px; margin-bottom:24px;">
              Demikian Surat Keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
            </p>

            <!-- Tanda Tangan -->
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:30px; font-size:11pt;">
              <div style="text-align:center; min-width:180px;">
                <div style="font-size:8pt; color:#64748b; margin-bottom:6px;">Verifikasi Digital SID Ngawen:</div>
                <div style="padding:6px; border:1px dashed #000; border-radius:6px; display:inline-block; font-size:7.5pt;">
                  <i class="fa-solid fa-qrcode" style="font-size:1.8rem; display:block; margin-bottom:4px;"></i>
                  ${item.requestCode}
                </div>
              </div>
              <div style="text-align:center; min-width:200px;">
                <div>Ngawen, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div style="font-weight:bold;">Kepala Desa Ngawen</div>
                <div style="height:55px;"></div>
                <div style="font-weight:bold; text-decoration:underline;">${kadesNama}</div>
              </div>
            </div>
          </div>
          <div style="margin-top:14px; text-align:right;">
            <button type="button" class="btn-admin btn-admin-accent" id="btnPrintModalLetter">
              <i class="fa-solid fa-print"></i> Cetak / Print Surat Ini
            </button>
          </div>
        `;

        openCRUDModal(`Draft Preview Surat Resmi (${item.requestCode})`, letterHTML, () => { });

        document.getElementById('btnPrintModalLetter')?.addEventListener('click', () => {
          const printWindow = window.open('', '_blank');
          printWindow.document.write(`
            <html>
              <head>
                <title>Cetak Surat ${item.requestCode}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <style>body { font-family: 'Times New Roman', serif; margin: 20px; }</style>
              </head>
              <body>
                ${document.getElementById('printableLetterContainer').outerHTML}
                <script>window.print(); setTimeout(() => window.close(), 500);</script>
              </body>
            </html>
          `);
          printWindow.document.close();
        });
      });
    });

    document.querySelectorAll('.del-surat-req').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        if (confirm('Hapus permohonan surat ini?')) {
          currentData.suratRequests.splice(idx, 1);
          await cms.saveData(currentData);
          renderSuratRequestTable();
          showToast('Permohonan surat dihapus.', 'success');
        }
      });
    });
  }

  // Register Real-time Sync Event Listener
  cms.onRealtimeEvent((evt) => {
    console.log('⚡ Admin received real-time event:', evt);
    if (evt.type === 'LAPORAN_CREATED' || evt.type === 'LAPORAN_SYNC') {
      showToast(`📢 Laporan Warga Baru Masuk! (${evt.payload?.trackingCode || 'Baru'})`, 'info');
      if (cms.data) currentData = cms.data;
      renderLaporanTable();
      renderDashRecentLaporan();
    } else if (evt.type === 'SURAT_REQUEST_CREATED' || evt.type === 'SURAT_REQUEST_SYNC') {
      showToast(`📄 Permohonan Surat Online Masuk! (${evt.payload?.requestCode || 'Baru'})`, 'info');
      if (cms.data) currentData = cms.data;
      renderSuratRequestTable();
    } else if (evt.type === 'CMS_UPDATED' || evt.type === 'CMS_STORAGE_UPDATED') {
      if (cms.data) currentData = cms.data;
      populateForms(currentData);
    }
  });

  // =========================================================
  // 7. PENGATURAN USER — Profil, Keamanan & Multi-User
  // =========================================================

  // -- A. Populate profil admin --
  async function populateUserSettings() {
    const profile = cms.getProfile();

    const profNama = document.getElementById('profNamaAdmin');
    const profJabatan = document.getElementById('profJabatanAdmin');
    const profEmail = document.getElementById('profEmailAdmin');
    const profNohp = document.getElementById('profNohpAdmin');

    if (profNama) profNama.value = profile.namaLengkap || '';
    if (profJabatan) profJabatan.value = profile.jabatan || '';
    if (profEmail) profEmail.value = profile.email || '';
    if (profNohp) profNohp.value = profile.nohp || '';

    // Pre-fill username from auth
    try {
      const user = sec ? sec.getCurrentUser() : null;
      const unEl = document.getElementById('setNewUsername');
      if (unEl && user) unEl.value = user.username || '';

      // Session widget
      const sessUser = document.getElementById('sessionUsername');
      const sessTime = document.getElementById('sessionLoginTime');
      if (sessUser && user) sessUser.textContent = user.username || '-';
      if (sessTime && user && user.lastLogin) {
        const d = new Date(user.lastLogin);
        sessTime.textContent = 'Login sejak: ' + d.toLocaleDateString('id-ID', {
          day: '2-digit', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
      }
    } catch { }

    // Avatar
    if (profile.avatar) {
      const img = document.getElementById('avatarPreviewImg');
      const ico = document.getElementById('avatarIconPlaceholder');
      const rmv = document.getElementById('btnRemoveAvatar');
      if (img) { img.src = profile.avatar; img.style.display = 'block'; }
      if (ico) ico.style.display = 'none';
      if (rmv) rmv.style.display = 'inline-flex';
    }

    await renderUsersTable();
    await renderLoginHistory();
  }

  // -- B. Avatar File Input --
  const avatarInput = document.getElementById('avatarFileInput');
  if (avatarInput) {
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const b64 = await cms.readFileAsBase64(file);
      const img = document.getElementById('avatarPreviewImg');
      const ico = document.getElementById('avatarIconPlaceholder');
      const rmv = document.getElementById('btnRemoveAvatar');
      if (img) { img.src = b64; img.style.display = 'block'; }
      if (ico) ico.style.display = 'none';
      if (rmv) rmv.style.display = 'inline-flex';
      showToast('Foto avatar dipilih. Klik "Simpan Profil" untuk menyimpan.', 'success');
    });
  }

  document.getElementById('btnRemoveAvatar')?.addEventListener('click', () => {
    const img = document.getElementById('avatarPreviewImg');
    const ico = document.getElementById('avatarIconPlaceholder');
    const rmv = document.getElementById('btnRemoveAvatar');
    if (img) { img.src = ''; img.style.display = 'none'; }
    if (ico) ico.style.display = 'block';
    if (rmv) rmv.style.display = 'none';
  });

  // -- C. Simpan Profil --
  document.getElementById('btnSaveProfile')?.addEventListener('click', async () => {
    const namaLengkap = document.getElementById('profNamaAdmin')?.value.trim();
    const jabatan = document.getElementById('profJabatanAdmin')?.value.trim();
    const email = document.getElementById('profEmailAdmin')?.value.trim();
    const nohp = document.getElementById('profNohpAdmin')?.value.trim();
    const avatar = document.getElementById('avatarPreviewImg')?.src || '';

    if (!namaLengkap) {
      showToast('Nama lengkap tidak boleh kosong!', 'error');
      return;
    }

    await cms.saveProfile({ namaLengkap, jabatan, email, nohp, avatar });
    showToast('Profil admin berhasil disimpan!', 'success');
  });

  // -- D. Password strength meter + toggle visibility --
  const pwdInput = document.getElementById('setNewPassword');
  if (pwdInput) {
    pwdInput.addEventListener('input', () => {
      const val = pwdInput.value;
      let score = 0;
      if (val.length >= 6) score++;
      if (val.length >= 10) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      const bar = document.getElementById('pwdStrengthBar');
      const label = document.getElementById('pwdStrengthLabel');
      const widths = ['0%', '20%', '40%', '65%', '85%', '100%'];
      const colors = ['#e5e7eb', '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#16a34a'];
      const labels = ['—', 'Sangat Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'];
      const clrs = ['#94a3b8', '#ef4444', '#f59e0b', '#ca8a04', '#22c55e', '#16a34a'];

      if (bar) { bar.style.width = widths[score]; bar.style.background = colors[score]; }
      if (label) { label.textContent = labels[score]; label.style.color = clrs[score]; }
    });
  }

  document.getElementById('btnTogglePwd')?.addEventListener('click', () => {
    const input = document.getElementById('setNewPassword');
    const icon = document.querySelector('#btnTogglePwd i');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (icon) { icon.className = 'fa-regular fa-eye-slash'; }
    } else {
      input.type = 'password';
      if (icon) { icon.className = 'fa-regular fa-eye'; }
    }
  });

  // -- E. Ganti Username & Password --
  document.getElementById('formChangePassword')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUser = document.getElementById('setNewUsername')?.value.trim();
    const newPass = document.getElementById('setNewPassword')?.value.trim();
    const confPass = document.getElementById('setConfirmPassword')?.value.trim();

    if (!newUser || !newPass) {
      showToast('Username dan password tidak boleh kosong!', 'error');
      return;
    }
    if (newPass.length < 6) {
      showToast('Password minimal 6 karakter!', 'error');
      return;
    }
    if (newPass !== confPass) {
      showToast('Konfirmasi password tidak cocok!', 'error');
      return;
    }

    const res = await cms.setCredentials(newUser, newPass);
    if (res && !res.ok) {
      showToast(res.msg || 'Gagal mengubah password.', 'error');
      return;
    }

    if (document.getElementById('setNewPassword')) document.getElementById('setNewPassword').value = '';
    if (document.getElementById('setConfirmPassword')) document.getElementById('setConfirmPassword').value = '';
    const bar = document.getElementById('pwdStrengthBar');
    const lbl = document.getElementById('pwdStrengthLabel');
    if (bar) { bar.style.width = '0%'; }
    if (lbl) lbl.textContent = '—';

    showToast(`Akun berhasil diperbarui! Username: ${newUser}`, 'success');
    await renderUsersTable();
  });

  // -- F. Render Users Table --
  async function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const usersData = await cms.getUsers();
    const users = Array.isArray(usersData) ? usersData : [];

    const roleLabels = {
      superadmin: { label: 'Super Admin', color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
      admin: { label: 'Admin', color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
      operator: { label: 'Operator', color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
      viewer: { label: 'Viewer', color: '#92400e', bg: '#fef3c7', border: '#fcd34d' }
    };

    users.forEach(user => {
      const role = roleLabels[user.role] || roleLabels.operator;
      const initials = (user.namaLengkap || user.username).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const isActive = user.aktif !== false;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            ${user.avatar
          ? `<img src="${user.avatar}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:2px solid var(--admin-border);">`
          : `<div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#0f3822,#1a5c38); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.75rem; color:#fff; flex-shrink:0;">${initials}</div>`
        }
            <div>
              <div style="font-weight:700; font-size:0.9rem;">${user.namaLengkap || '-'}</div>
              <div style="font-size:0.75rem; color:var(--admin-muted);">${user.jabatan || '-'}</div>
            </div>
          </div>
        </td>
        <td><code style="background:var(--admin-bg); padding:2px 8px; border-radius:4px; font-size:0.82rem;">${user.username}</code></td>
        <td>
          <span style="font-size:0.75rem; font-weight:700; padding:3px 8px; border-radius:20px; background:${role.bg}; color:${role.color}; border:1px solid ${role.border};">
            ${role.label}
          </span>
        </td>
        <td style="font-size:0.85rem;">${user.email || '<span style="color:#94a3b8;">-</span>'}</td>
        <td>
          <span style="font-size:0.75rem; font-weight:700; padding:3px 8px; border-radius:20px; ${isActive
          ? 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;'
          : 'background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;'}">
            ${isActive ? '<i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> Aktif' : '<i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> Nonaktif'}
          </span>
        </td>
        <td style="font-size:0.78rem; color:var(--admin-muted);">${user.dibuat ? user.dibuat.slice(0, 10) : '-'}</td>
        <td>
          <div style="display:flex; gap:4px; flex-wrap:wrap;">
            <button class="btn-admin btn-admin-outline btn-admin-sm edit-user" data-uid="${user.id}" title="Edit Pengguna">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-admin btn-admin-outline btn-admin-sm toggle-user" data-uid="${user.id}" data-active="${isActive}" title="${isActive ? 'Nonaktifkan' : 'Aktifkan'}">
              <i class="fa-solid ${isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
            </button>
            <button class="btn-admin btn-admin-danger btn-admin-sm del-user" data-uid="${user.id}" title="Hapus Pengguna">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Edit User
    document.querySelectorAll('.edit-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const currentUsers = await cms.getUsers();
        const user = currentUsers.find(u => u.id === uid);
        if (!user) return;

        const html = `
          <div class="form-grid-2">
            <div class="form-group">
              <label>Nama Lengkap</label>
              <input type="text" id="mUserNama" class="form-control" value="${user.namaLengkap || ''}">
            </div>
            <div class="form-group">
              <label>Jabatan</label>
              <input type="text" id="mUserJabatan" class="form-control" value="${user.jabatan || ''}">
            </div>
            <div class="form-group">
              <label>Username</label>
              <input type="text" id="mUserUsername" class="form-control" value="${user.username}">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="mUserEmail" class="form-control" value="${user.email || ''}">
            </div>
            <div class="form-group">
              <label>Role / Hak Akses</label>
              <select id="mUserRole" class="form-control">
                <option value="superadmin" ${user.role === 'superadmin' ? 'selected' : ''}>Super Admin</option>
                <option value="admin"      ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                <option value="operator"   ${user.role === 'operator' ? 'selected' : ''}>Operator</option>
                <option value="viewer"     ${user.role === 'viewer' ? 'selected' : ''}>Viewer</option>
              </select>
            </div>
            <div class="form-group">
              <label>Password Baru <span style="font-size:0.75rem; color:var(--admin-muted);">(kosongkan jika tidak diubah)</span></label>
              <input type="password" id="mUserPassword" class="form-control" placeholder="Kosongkan = tidak berubah">
            </div>
          </div>
        `;

        openCRUDModal(`Edit Pengguna: ${user.username}`, html, async () => {
          const changes = {
            namaLengkap: document.getElementById('mUserNama').value.trim(),
            jabatan: document.getElementById('mUserJabatan').value.trim(),
            username: document.getElementById('mUserUsername').value.trim(),
            email: document.getElementById('mUserEmail').value.trim(),
            role: document.getElementById('mUserRole').value
          };
          const pwd = document.getElementById('mUserPassword').value.trim();
          if (pwd) changes.password = pwd;

          const res = await cms.updateUser(uid, changes);
          if (res && !res.ok) { showToast(res.msg, 'error'); return false; }
          await renderUsersTable();
          showToast('Data pengguna berhasil diperbarui.', 'success');
        });
      });
    });

    // Toggle Active Status
    document.querySelectorAll('.toggle-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const isActive = btn.dataset.active === 'true';
        await cms.updateUser(uid, { aktif: !isActive });
        await renderUsersTable();
        showToast(`Pengguna berhasil di${!isActive ? 'aktif' : 'nonaktif'}kan.`, 'success');
      });
    });

    // Delete User
    document.querySelectorAll('.del-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        if (!confirm('Hapus pengguna ini secara permanen?')) return;
        const res = await cms.deleteUser(uid);
        if (res && !res.ok) { showToast(res.msg, 'error'); return; }
        await renderUsersTable();
        showToast('Pengguna berhasil dihapus.', 'success');
      });
    });
  }

  // -- G. Tambah Pengguna Baru --
  document.getElementById('btnAddUser')?.addEventListener('click', () => {
    const html = `
      <div class="form-grid-2">
        <div class="form-group">
          <label>Nama Lengkap <span style="color:#ef4444;">*</span></label>
          <input type="text" id="mUserNama" class="form-control" placeholder="Nama lengkap pengguna...">
        </div>
        <div class="form-group">
          <label>Jabatan</label>
          <input type="text" id="mUserJabatan" class="form-control" placeholder="misal: Operator, Sekretaris...">
        </div>
        <div class="form-group">
          <label>Username <span style="color:#ef4444;">*</span></label>
          <input type="text" id="mUserUsername" class="form-control" placeholder="Username unik...">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="mUserEmail" class="form-control" placeholder="email@desangawen.id">
        </div>
        <div class="form-group">
          <label>Password <span style="color:#ef4444;">*</span></label>
          <input type="password" id="mUserPassword" class="form-control" placeholder="Minimal 6 karakter">
        </div>
        <div class="form-group">
          <label>Role / Hak Akses</label>
          <select id="mUserRole" class="form-control">
            <option value="operator">Operator</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
            <option value="viewer">Viewer (Hanya Lihat)</option>
          </select>
        </div>
      </div>
    `;

    openCRUDModal('Tambah Pengguna CMS Baru', html, async () => {
      const nama = document.getElementById('mUserNama').value.trim();
      const username = document.getElementById('mUserUsername').value.trim();
      const password = document.getElementById('mUserPassword').value.trim();
      const jabatan = document.getElementById('mUserJabatan').value.trim();
      const email = document.getElementById('mUserEmail').value.trim();
      const role = document.getElementById('mUserRole').value;

      if (!nama || !username || !password) {
        showToast('Nama, username, dan password wajib diisi!', 'error');
        return false;
      }
      if (password.length < 6) {
        showToast('Password minimal 6 karakter!', 'error');
        return false;
      }

      const res = await cms.addUser({ username, password, namaLengkap: nama, jabatan, email, role });
      if (res && !res.ok) { showToast(res.msg, 'error'); return false; }
      await renderUsersTable();
      showToast(`Pengguna "${username}" berhasil ditambahkan!`, 'success');
    });
  });

  // -- H. Login History --
  async function renderLoginHistory() {
    const container = document.getElementById('loginHistoryList');
    const countEl = document.getElementById('sessionLoginCount');
    if (!container) return;

    const history = await cms.getLoginHistory();
    if (countEl) countEl.textContent = history.length + ' kali';

    if (!history.length) {
      container.innerHTML = '<div style="text-align:center; color:var(--admin-muted); font-size:0.85rem; padding:16px;">Belum ada riwayat login.</div>';
      return;
    }

    container.innerHTML = history.map(h => {
      const d = new Date(h.waktu);
      const waktuFmt = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const isBerhasil = h.status === 'Berhasil';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--admin-bg); border:1px solid var(--admin-border); border-radius:8px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.85rem; flex-shrink:0;
              ${isBerhasil ? 'background:#d1fae5; color:#065f46;' : 'background:#fee2e2; color:#991b1b;'}">
              <i class="fa-solid ${isBerhasil ? 'fa-right-to-bracket' : 'fa-triangle-exclamation'}"></i>
            </div>
            <div>
              <div style="font-size:0.85rem; font-weight:700;">${h.username}</div>
              <div style="font-size:0.75rem; color:var(--admin-muted);">${waktuFmt}</div>
            </div>
          </div>
          <span style="font-size:0.75rem; font-weight:700; padding:3px 8px; border-radius:12px;
            ${isBerhasil
          ? 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;'
          : 'background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;'}">
            ${h.status}
          </span>
        </div>
      `;
    }).join('');
  }

  // -- I. Hook tab-user navigation to refresh content --
  document.querySelector('[data-tab="tab-user"]')?.addEventListener('click', () => {
    setTimeout(populateUserSettings, 30);
  });

  // ── NEW FEATURES HANDLERS ──────────────────────────────────

  // 1. Keuangan APBDes Handler
  function populateKeuangan(data) {
    if (!data || !data.keuangan) return;
    const k = data.keuangan;
    document.getElementById('keuanganTahun').value = k.tahunAnggaran || '2026';
    document.getElementById('keuanganPendapatan').value = k.pendapatanTotal || '';
    document.getElementById('keuanganBelanja').value = k.belanjaTotal || '';
    document.getElementById('keuanganPembiayaan').value = k.pembiayaanNetto || '';
    document.getElementById('keuanganCatatan').value = k.catatan || '';
  }

  document.getElementById('btnSaveKeuangan')?.addEventListener('click', () => {
    if (!cmsEngine.data) cmsEngine.data = {};
    if (!cmsEngine.data.keuangan) cmsEngine.data.keuangan = {};
    const k = cmsEngine.data.keuangan;
    k.tahunAnggaran = document.getElementById('keuanganTahun').value;
    k.pendapatanTotal = document.getElementById('keuanganPendapatan').value;
    k.belanjaTotal = document.getElementById('keuanganBelanja').value;
    k.pembiayaanNetto = document.getElementById('keuanganPembiayaan').value;
    k.catatan = document.getElementById('keuanganCatatan').value;

    cmsEngine.saveData(cmsEngine.data).then(() => {
      showToast('Data Transparansi APBDes Siskeudes berhasil disimpan!');
    });
  });

  // 2. JDIH Peraturan Desa Handler
  function renderJdihTable(data) {
    const tbody = document.getElementById('jdihTableBody');
    if (!tbody) return;
    const list = (data && data.jdih) ? data.jdih : [];
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--admin-muted); padding:16px;">Belum ada dokumen Peraturan Desa.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map((item, idx) => `
      <tr>
        <td style="font-weight:700;">${item.nomor}</td>
        <td>${item.judul}</td>
        <td><span class="badge-admin badge-admin-info">${item.kategori}</span></td>
        <td><span class="badge-admin badge-admin-success">${item.status || 'Berlaku'}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn-admin btn-admin-outline btn-admin-sm btn-edit-jdih" data-idx="${idx}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
            <button class="btn-admin btn-admin-danger btn-admin-sm btn-del-jdih" data-idx="${idx}"><i class="fa-solid fa-trash"></i> Hapus</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-edit-jdih').forEach(btn => {
      btn.addEventListener('click', () => editJdihItem(parseInt(btn.getAttribute('data-idx'))));
    });
    tbody.querySelectorAll('.btn-del-jdih').forEach(btn => {
      btn.addEventListener('click', () => deleteJdihItem(parseInt(btn.getAttribute('data-idx'))));
    });
  }

  document.getElementById('btnAddJdih')?.addEventListener('click', () => {
    openCRUDModal('Tambah Dokumen Peraturan Desa (JDIH)', `
      <div class="form-group">
        <label>Nomor & Tahun</label>
        <input type="text" id="mJdihNomor" class="form-control" placeholder="Perdes No. 01 Tahun 2026">
      </div>
      <div class="form-group">
        <label>Judul Dokumen Peraturan</label>
        <input type="text" id="mJdihJudul" class="form-control" placeholder="Judul Peraturan Desa...">
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Kategori</label>
          <select id="mJdihKategori" class="form-control">
            <option value="Peraturan Desa">Peraturan Desa (Perdes)</option>
            <option value="Peraturan Kepala Desa">Peraturan Kepala Desa (Perkel)</option>
            <option value="Keputusan Kepala Desa">Keputusan Kepala Desa</option>
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <input type="text" id="mJdihStatus" class="form-control" value="Berlaku">
        </div>
      </div>
    `, () => {
      const nomor = document.getElementById('mJdihNomor').value;
      const judul = document.getElementById('mJdihJudul').value;
      if (!nomor || !judul) {
        alert('Mohon isi Nomor & Judul dokumen.');
        return false;
      }
      if (!cmsEngine.data.jdih) cmsEngine.data.jdih = [];
      cmsEngine.data.jdih.push({
        id: 'jdih-' + Date.now(),
        nomor: nomor,
        judul: judul,
        kategori: document.getElementById('mJdihKategori').value,
        tahun: new Date().getFullYear().toString(),
        status: document.getElementById('mJdihStatus').value || 'Berlaku',
        fileUrl: '#'
      });
      cmsEngine.saveData(cmsEngine.data).then(() => {
        renderJdihTable(cmsEngine.data);
        showToast('Dokumen Peraturan Desa berhasil ditambahkan!');
      });
    });
  });

  function editJdihItem(idx) {
    const item = cmsEngine.data.jdih[idx];
    if (!item) return;
    openCRUDModal('Edit Dokumen Peraturan Desa', `
      <div class="form-group">
        <label>Nomor & Tahun</label>
        <input type="text" id="mJdihNomor" class="form-control" value="${item.nomor || ''}">
      </div>
      <div class="form-group">
        <label>Judul Dokumen Peraturan</label>
        <input type="text" id="mJdihJudul" class="form-control" value="${item.judul || ''}">
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Kategori</label>
          <select id="mJdihKategori" class="form-control">
            <option value="Peraturan Desa" ${item.kategori === 'Peraturan Desa' ? 'selected' : ''}>Peraturan Desa (Perdes)</option>
            <option value="Peraturan Kepala Desa" ${item.kategori === 'Peraturan Kepala Desa' ? 'selected' : ''}>Peraturan Kepala Desa (Perkel)</option>
            <option value="Keputusan Kepala Desa" ${item.kategori === 'Keputusan Kepala Desa' ? 'selected' : ''}>Keputusan Kepala Desa</option>
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <input type="text" id="mJdihStatus" class="form-control" value="${item.status || 'Berlaku'}">
        </div>
      </div>
    `, () => {
      item.nomor = document.getElementById('mJdihNomor').value;
      item.judul = document.getElementById('mJdihJudul').value;
      item.kategori = document.getElementById('mJdihKategori').value;
      item.status = document.getElementById('mJdihStatus').value;
      cmsEngine.saveData(cmsEngine.data).then(() => {
        renderJdihTable(cmsEngine.data);
        showToast('Dokumen Peraturan Desa berhasil diperbarui!');
      });
    });
  }

  function deleteJdihItem(idx) {
    if (confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) {
      cmsEngine.data.jdih.splice(idx, 1);
      cmsEngine.saveData(cmsEngine.data).then(() => {
        renderJdihTable(cmsEngine.data);
        showToast('Dokumen Peraturan Desa telah dihapus.');
      });
    }
  }

  // 3. Demografi Detail Handler
  function populateDemografiStats(data) {
    if (!data || !data.demografi) return;
    const d = data.demografi;
    document.getElementById('demoTotalPenduduk').value = d.totalPenduduk || 4153;
    document.getElementById('demoTotalKK').value = d.kkCount || 1370;
    document.getElementById('demoLaki').value = d.lakiLaki || 2033;
    document.getElementById('demoPerempuan').value = d.perempuan || 2117;
  }

  document.getElementById('btnSaveDemografiStats')?.addEventListener('click', () => {
    if (!cmsEngine.data.demografi) cmsEngine.data.demografi = {};
    const d = cmsEngine.data.demografi;
    d.totalPenduduk = parseInt(document.getElementById('demoTotalPenduduk').value) || 4153;
    d.kkCount = parseInt(document.getElementById('demoTotalKK').value) || 1370;
    d.lakiLaki = parseInt(document.getElementById('demoLaki').value) || 2033;
    d.perempuan = parseInt(document.getElementById('demoPerempuan').value) || 2117;
    d.persenLakiLaki = ((d.lakiLaki / d.totalPenduduk) * 100).toFixed(2) + '%';
    d.persenPerempuan = ((d.perempuan / d.totalPenduduk) * 100).toFixed(2) + '%';

    cmsEngine.saveData(cmsEngine.data).then(() => {
      showToast('Statistik ringkasan demografi berhasil diperbarui!');
    });
  });

  // 4. Poin Penting Peta Lokasi Handler
  function renderLokasiTable(data) {
    const tbody = document.getElementById('lokasiTableBody');
    if (!tbody) return;
    const list = (data && data.wilayah && data.wilayah.lokasiPeta) ? data.wilayah.lokasiPeta : [];
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--admin-muted); padding:16px;">Belum ada titik lokasi peta.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map((loc, idx) => `
      <tr>
        <td style="font-weight:700;"><i class="fa-solid ${loc.iconClass || 'fa-location-dot'}" style="margin-right:6px; color:var(--admin-primary);"></i> ${loc.name}</td>
        <td><span class="badge-admin badge-admin-info">${loc.category}</span></td>
        <td style="font-family:monospace; font-size:0.82rem;">${loc.lat}, ${loc.lng}</td>
        <td style="font-size:0.82rem;">${loc.desc}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn-admin btn-admin-outline btn-admin-sm btn-edit-lokasi" data-idx="${idx}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
            <button class="btn-admin btn-admin-danger btn-admin-sm btn-del-lokasi" data-idx="${idx}"><i class="fa-solid fa-trash"></i> Hapus</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-edit-lokasi').forEach(btn => {
      btn.addEventListener('click', () => editLokasiItem(parseInt(btn.getAttribute('data-idx'))));
    });
    tbody.querySelectorAll('.btn-del-lokasi').forEach(btn => {
      btn.addEventListener('click', () => deleteLokasiItem(parseInt(btn.getAttribute('data-idx'))));
    });
  }

  document.getElementById('btnAddLokasi')?.addEventListener('click', () => {
    openCRUDModal('Tambah Titik Lokasi Peta Desa', `
      <div class="form-group">
        <label>Nama Lokasi / Fasilitas</label>
        <input type="text" id="mLokasiName" class="form-control" placeholder="Contoh: Situs Candi Ngawen">
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Kategori</label>
          <select id="mLokasiCategory" class="form-control">
            <option value="wisata">Wisata & Cagar Budaya</option>
            <option value="publik">Fasilitas Publik / Pemerintahan</option>
            <option value="tani">Sentra Pertanian & UMKM</option>
          </select>
        </div>
        <div class="form-group">
          <label>FontAwesome Icon</label>
          <input type="text" id="mLokasiIcon" class="form-control" value="fa-location-dot">
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Latitude (Garis Lintang)</label>
          <input type="number" step="any" id="mLokasiLat" class="form-control" value="-7.598365">
        </div>
        <div class="form-group">
          <label>Longitude (Garis Bujur)</label>
          <input type="number" step="any" id="mLokasiLng" class="form-control" value="110.272818">
        </div>
      </div>
      <div class="form-group">
        <label>Deskripsi Ringkas</label>
        <textarea id="mLokasiDesc" class="form-control" rows="2" placeholder="Deskripsi lokasi..."></textarea>
      </div>
    `, () => {
      const name = document.getElementById('mLokasiName').value;
      if (!name) { alert('Mohon isi nama lokasi.'); return false; }
      if (!cmsEngine.data.wilayah) cmsEngine.data.wilayah = {};
      if (!cmsEngine.data.wilayah.lokasiPeta) cmsEngine.data.wilayah.lokasiPeta = [];
      cmsEngine.data.wilayah.lokasiPeta.push({
        id: 'loc-' + Date.now(),
        name: name,
        category: document.getElementById('mLokasiCategory').value,
        iconClass: document.getElementById('mLokasiIcon').value || 'fa-location-dot',
        lat: parseFloat(document.getElementById('mLokasiLat').value) || -7.598365,
        lng: parseFloat(document.getElementById('mLokasiLng').value) || 110.272818,
        desc: document.getElementById('mLokasiDesc').value || ''
      });
      cmsEngine.saveData(cmsEngine.data).then(() => {
        renderLokasiTable(cmsEngine.data);
        showToast('Titik lokasi peta berhasil ditambahkan!');
      });
    });
  });

  function editLokasiItem(idx) {
    const loc = cmsEngine.data.wilayah.lokasiPeta[idx];
    if (!loc) return;
    openCRUDModal('Edit Titik Lokasi Peta Desa', `
      <div class="form-group">
        <label>Nama Lokasi / Fasilitas</label>
        <input type="text" id="mLokasiName" class="form-control" value="${loc.name || ''}">
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Kategori</label>
          <select id="mLokasiCategory" class="form-control">
            <option value="wisata" ${loc.category === 'wisata' ? 'selected' : ''}>Wisata & Cagar Budaya</option>
            <option value="publik" ${loc.category === 'publik' ? 'selected' : ''}>Fasilitas Publik / Pemerintahan</option>
            <option value="tani" ${loc.category === 'tani' ? 'selected' : ''}>Sentra Pertanian & UMKM</option>
          </select>
        </div>
        <div class="form-group">
          <label>FontAwesome Icon</label>
          <input type="text" id="mLokasiIcon" class="form-control" value="${loc.iconClass || 'fa-location-dot'}">
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Latitude</label>
          <input type="number" step="any" id="mLokasiLat" class="form-control" value="${loc.lat || -7.598365}">
        </div>
        <div class="form-group">
          <label>Longitude</label>
          <input type="number" step="any" id="mLokasiLng" class="form-control" value="${loc.lng || 110.272818}">
        </div>
      </div>
      <div class="form-group">
        <label>Deskripsi Ringkas</label>
        <textarea id="mLokasiDesc" class="form-control" rows="2">${loc.desc || ''}</textarea>
      </div>
    `, () => {
      loc.name = document.getElementById('mLokasiName').value;
      loc.category = document.getElementById('mLokasiCategory').value;
      loc.iconClass = document.getElementById('mLokasiIcon').value;
      loc.lat = parseFloat(document.getElementById('mLokasiLat').value);
      loc.lng = parseFloat(document.getElementById('mLokasiLng').value);
      loc.desc = document.getElementById('mLokasiDesc').value;
      cmsEngine.saveData(cmsEngine.data).then(() => {
        renderLokasiTable(cmsEngine.data);
        showToast('Titik lokasi peta berhasil diperbarui!');
      });
    });
  }

  function deleteLokasiItem(idx) {
    if (confirm('Apakah Anda yakin ingin menghapus lokasi ini dari peta?')) {
      cmsEngine.data.wilayah.lokasiPeta.splice(idx, 1);
      cmsEngine.saveData(cmsEngine.data).then(() => {
        renderLokasiTable(cmsEngine.data);
        showToast('Titik lokasi telah dihapus dari peta.');
      });
    }
  }

  // 5. Kontak Resmi & Medsos Handler
  function populateKontakResmi(data) {
    if (!data || !data.siteInfo || !data.siteInfo.kontakResmi) return;
    const k = data.siteInfo.kontakResmi;
    document.getElementById('kontakTelepon').value = k.telepon || '(0293)';
    document.getElementById('kontakWhatsapp').value = k.whatsapp || '087756655004';
    document.getElementById('kontakEmail').value = k.email || 'Pemdesangawen@gmail.com';
    document.getElementById('kontakInstagram').value = k.instagram || '@pemdes_ngawen';
    document.getElementById('kontakYoutube').value = k.youtube || 'Channel Resmi Desa Ngawen';
    document.getElementById('kontakPortalBaru').value = k.portalBaru || 'https://ngawen-2-0.netlify.app/';
  }

  document.getElementById('btnSaveKontakResmi')?.addEventListener('click', () => {
    if (!cmsEngine.data.siteInfo) cmsEngine.data.siteInfo = {};
    if (!cmsEngine.data.siteInfo.kontakResmi) cmsEngine.data.siteInfo.kontakResmi = {};
    const k = cmsEngine.data.siteInfo.kontakResmi;
    k.telepon = document.getElementById('kontakTelepon').value;
    k.whatsapp = document.getElementById('kontakWhatsapp').value;
    k.email = document.getElementById('kontakEmail').value;
    k.instagram = document.getElementById('kontakInstagram').value;
    k.youtube = document.getElementById('kontakYoutube').value;
    k.portalBaru = document.getElementById('kontakPortalBaru').value;

    cmsEngine.saveData(cmsEngine.data).then(() => {
      showToast('Kontak resmi & media sosial desa berhasil disimpan!');
    });
  });

  // 6. Chart Potensi & Lahan Handlers
  function populateChartsData(data) {
    if (!data) return;
    if (data.potensi && data.potensi.sebaranChart) {
      const p = data.potensi.sebaranChart;
      const elPariwisata = document.getElementById('chartPotensiPariwisata');
      const elPertanian = document.getElementById('chartPotensiPertanian');
      const elKerajinan = document.getElementById('chartPotensiKerajinan');
      if (elPariwisata) elPariwisata.value = p.pariwisata ?? 40;
      if (elPertanian) elPertanian.value = p.pertanian ?? 40;
      if (elKerajinan) elKerajinan.value = p.kerajinan ?? 20;
    }
    if (data.wilayah && data.wilayah.lahanChart) {
      const l = data.wilayah.lahanChart;
      const elSawah = document.getElementById('chartLahanSawah');
      const elPemukiman = document.getElementById('chartLahanPemukiman');
      const elFasum = document.getElementById('chartLahanFasum');
      const elPerkebunan = document.getElementById('chartLahanPerkebunan');
      if (elSawah) elSawah.value = l.sawah ?? 68.2;
      if (elPemukiman) elPemukiman.value = l.pemukiman ?? 22.4;
      if (elFasum) elFasum.value = l.fasum ?? 6.1;
      if (elPerkebunan) elPerkebunan.value = l.perkebunan ?? 3.3;
    }
  }

  document.getElementById('btnSaveChartPotensi')?.addEventListener('click', () => {
    if (!cmsEngine.data.potensi) cmsEngine.data.potensi = {};
    if (!cmsEngine.data.potensi.sebaranChart) cmsEngine.data.potensi.sebaranChart = {};
    const s = cmsEngine.data.potensi.sebaranChart;
    s.pariwisata = parseFloat(document.getElementById('chartPotensiPariwisata').value) || 40;
    s.pertanian = parseFloat(document.getElementById('chartPotensiPertanian').value) || 40;
    s.kerajinan = parseFloat(document.getElementById('chartPotensiKerajinan').value) || 20;

    cmsEngine.saveData(cmsEngine.data).then(() => {
      showToast('Data grafik sebaran potensi desa berhasil disimpan!');
    });
  });

  document.getElementById('btnSaveChartLahan')?.addEventListener('click', () => {
    if (!cmsEngine.data.wilayah) cmsEngine.data.wilayah = {};
    if (!cmsEngine.data.wilayah.lahanChart) cmsEngine.data.wilayah.lahanChart = {};
    const l = cmsEngine.data.wilayah.lahanChart;
    l.sawah = parseFloat(document.getElementById('chartLahanSawah').value) || 68.2;
    l.pemukiman = parseFloat(document.getElementById('chartLahanPemukiman').value) || 22.4;
    l.fasum = parseFloat(document.getElementById('chartLahanFasum').value) || 6.1;
    l.perkebunan = parseFloat(document.getElementById('chartLahanPerkebunan').value) || 3.3;

    cmsEngine.saveData(cmsEngine.data).then(() => {
      showToast('Data grafik persentase peruntukan lahan berhasil disimpan!');
    });
  });

  // Populate initially
  populateForms(currentData);
  populateUserSettings();
  populateKeuangan(currentData);
  renderJdihTable(currentData);
  populateDemografiStats(currentData);
  renderLokasiTable(currentData);
  populateKontakResmi(currentData);
  populateChartsData(currentData);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}

