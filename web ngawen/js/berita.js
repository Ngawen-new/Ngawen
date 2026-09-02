/* ============================================================
   berita.js — Halaman Berita & Pengumuman Standalone
   Desa Ngawen, Kec. Muntilan, Kab. Magelang
   Sinkronisasi real-time dengan CMS Engine (cms.js)
   ============================================================ */

'use strict';

// ── Warna Kategori ──────────────────────────────────────────
const BERITA_KATEGORI_COLORS = {
  'Prestasi':    { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  'Pembangunan': { bg: '#dbeafe', color: '#1e3a8a', border: '#93c5fd' },
  'Kesehatan':   { bg: '#fce7f3', color: '#9d174d', border: '#f9a8d4' },
  'Kebudayaan':  { bg: '#ede9fe', color: '#4c1d95', border: '#c4b5fd' },
  'Lingkungan':  { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  'Pelayanan':   { bg: '#e0f2fe', color: '#0c4a6e', border: '#7dd3fc' },
  'Berita':      { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' }
};

let _allBerita = [];
let _activeFilter = 'Semua';
let _searchQuery = '';
let _beritaModalOpenId = null;

// ── Tunggu CMS ready lalu jalankan halaman ──────────────────
async function initBeritaPage() {
  initThemeControls();
  initA11y();
  initMobileDrawer();
  initBackToTop();
  initModalControls();

  // Load CMS data
  const cms = window.cmsEngine;
  if (!cms) {
    console.error('[Berita] cmsEngine tidak tersedia.');
    return;
  }

  // Load data if not yet loaded
  const data = cms.data || await cms.loadData();
  applyBranding(data);
  loadBeritaData(data);

  // Register real-time listener (BroadcastChannel + SSE)
  cms.onRealtimeEvent(async (evt) => {
    if (evt.type === 'CMS_UPDATED' || evt.type === 'CMS_CONTENT_UPDATED' || evt.type === 'CMS_STORAGE_UPDATED') {
      // Re-fetch fresh data from server
      const fresh = await cms.loadData();
      applyBranding(fresh);
      loadBeritaData(fresh);
      showLiveSyncToast();
    }
  });

  // Fallback: watch localStorage for cross-tab updates
  window.addEventListener('storage', async (e) => {
    if (e.key === 'desa_ngawen_cms_data' && e.newValue) {
      try {
        const fresh = JSON.parse(e.newValue);
        cms.data = fresh;
        applyBranding(fresh);
        loadBeritaData(fresh);
        showLiveSyncToast();
      } catch {}
    }
  });

  // Safety: soft refresh every 30 seconds when page is visible
  let _pollTimer = null;
  function startPolling() {
    _pollTimer = setInterval(async () => {
      if (!document.hidden) {
        const fresh = await cms.loadData().catch(() => null);
        if (fresh) { applyBranding(fresh); loadBeritaData(fresh); }
      }
    }, 30000);
  }
  startPolling();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      clearInterval(_pollTimer);
      startPolling();
    }
  });
}


// ── Apply CMS Branding to Header ────────────────────────────
function applyBranding(data) {
  if (!data) return;
  if (data.siteInfo) {
    const siteLogo   = document.getElementById('siteLogo');
    const brandTitle = document.getElementById('siteBrandTitle');
    const brandSub   = document.getElementById('siteBrandSub');
    if (brandTitle && data.siteInfo.namaDesa) brandTitle.textContent = `Desa ${data.siteInfo.namaDesa}`;
    if (brandSub && data.siteInfo.subtitle) brandSub.textContent = data.siteInfo.subtitle;

    // Apply CMS primary color if defined
    if (data.tampilan && data.tampilan.primaryColor) {
      document.documentElement.style.setProperty('--brand-900', data.tampilan.primaryColor);
    }
  }
}

// ── Load & Render Berita Data ────────────────────────────────
function loadBeritaData(data) {
  if (!data || !data.berita || data.berita.length === 0) {
    _allBerita = [];
    showEmptyState(true);
    renderFeaturedHero(null);
    renderSidebar([]);
    return;
  }

  _allBerita = data.berita.filter(b => !b.status || b.status !== 'draft');

  renderFeaturedHero(_allBerita[0] || null);
  renderSidebar(_allBerita);
  renderGrid(_allBerita, _activeFilter, _searchQuery);
  initFilterControls();
}

// ── Featured Hero Article ────────────────────────────────────
function renderFeaturedHero(berita) {
  const hero = document.getElementById('featuredArticleHero');
  if (!hero) return;

  if (!berita) { hero.style.display = 'none'; return; }

  const img = document.getElementById('featuredImg');
  const titleEl = document.getElementById('featuredTitle');
  const dateEl  = document.getElementById('featuredDate');
  const kat     = document.getElementById('featuredKategori');
  const penulis = document.getElementById('featuredPenulis');
  const btn     = document.getElementById('featuredReadBtn');

  if (img) {
    img.src = berita.gambar || 'assets/candi.png';
    img.alt = berita.judul;
  }
  if (titleEl) titleEl.textContent = berita.judul;
  if (kat) kat.textContent = berita.kategori || 'Berita';
  if (dateEl && berita.tanggal) {
    dateEl.textContent = new Date(berita.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (penulis) penulis.textContent = berita.penulis || 'Redaksi Desa';

  hero.style.display = 'block';

  const openFeatured = () => openBeritaModal(berita.id);
  hero.onclick = openFeatured;
  if (btn) { btn.onclick = (e) => { e.stopPropagation(); openFeatured(); }; }
}

// ── Sidebar Render ───────────────────────────────────────────
function renderSidebar(beritaList) {
  renderSidebarStats(beritaList);
  renderSidebarKategori(beritaList);
  renderSidebarTerbaru(beritaList);
}

function renderSidebarStats(list) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();

  const total = list.length;
  const bulanIni = list.filter(b => {
    if (!b.tanggal) return false;
    const d = new Date(b.tanggal);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const kategoriSet = new Set(list.map(b => b.kategori || 'Berita'));
  const latestYear  = list.length > 0 && list[0].tanggal
    ? new Date(list[0].tanggal).getFullYear()
    : thisYear;

  safeText('sidebarTotal', total);
  safeText('sidebarBulanIni', bulanIni);
  safeText('sidebarKategori', kategoriSet.size);
  safeText('sidebarTerbaru', latestYear);
}

function renderSidebarKategori(list) {
  const grid = document.getElementById('sidebarKatGrid');
  if (!grid) return;

  const katCount = {};
  list.forEach(b => {
    const k = b.kategori || 'Berita';
    katCount[k] = (katCount[k] || 0) + 1;
  });

  grid.innerHTML = '';
  const allKat = Object.entries(katCount).sort((a, b) => b[1] - a[1]);

  // "Semua" pill
  const allPill = document.createElement('button');
  allPill.textContent = `Semua (${list.length})`;
  allPill.className = 'sidebar-kat-pill';
  const allStyle = BERITA_KATEGORI_COLORS['Berita'];
  Object.assign(allPill.style, { background: allStyle.bg, color: allStyle.color, border: `1px solid ${allStyle.border}` });
  allPill.onclick = () => applyFilter('Semua');
  grid.appendChild(allPill);

  allKat.forEach(([kat, count]) => {
    const s = BERITA_KATEGORI_COLORS[kat] || BERITA_KATEGORI_COLORS['Berita'];
    const pill = document.createElement('button');
    pill.textContent = `${kat} (${count})`;
    pill.className = 'sidebar-kat-pill';
    Object.assign(pill.style, { background: s.bg, color: s.color, border: `1px solid ${s.border}` });
    pill.onclick = () => applyFilter(kat);
    grid.appendChild(pill);
  });
}

function renderSidebarTerbaru(list) {
  const container = document.getElementById('sidebarBeritaList');
  if (!container) return;

  const latest = list.slice(0, 5);
  container.innerHTML = '';

  if (latest.length === 0) {
    container.innerHTML = '<p style="font-size:0.8rem; color:var(--slate-500);">Belum ada berita tersedia.</p>';
    return;
  }

  latest.forEach(b => {
    const dateStr = b.tanggal
      ? new Date(b.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';

    const item = document.createElement('div');
    item.className = 'sidebar-berita-item';
    item.innerHTML = `
      <img src="${b.gambar || 'assets/candi.png'}" alt="${b.judul}" class="sidebar-berita-thumb" loading="lazy">
      <div class="sidebar-berita-info">
        <div class="sidebar-berita-judul">${b.judul}</div>
        <div class="sidebar-berita-date"><i class="fa-regular fa-calendar" style="margin-right:3px;"></i>${dateStr}</div>
      </div>
    `;
    item.onclick = () => openBeritaModal(b.id);
    container.appendChild(item);
  });
}

// ── Grid Render ──────────────────────────────────────────────
function renderGrid(beritaList, activeFilter, searchQuery) {
  const grid = document.getElementById('beritaCardsGrid');
  const emptyState = document.getElementById('beritaEmptyState');
  const countLabel = document.getElementById('beritaCountLabel');
  if (!grid) return;

  let filtered = beritaList.filter(b => {
    const matchFilter = (activeFilter === 'Semua') || (b.kategori === activeFilter);
    const q = (searchQuery || '').toLowerCase().trim();
    const matchSearch = !q
      || (b.judul || '').toLowerCase().includes(q)
      || (b.ringkasan || '').toLowerCase().includes(q)
      || (b.kategori || '').toLowerCase().includes(q)
      || (b.isi || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  grid.innerHTML = '';

  if (countLabel) {
    if (activeFilter === 'Semua' && !searchQuery) {
      countLabel.textContent = `Semua Berita (${beritaList.length})`;
    } else if (searchQuery) {
      countLabel.textContent = `Hasil Pencarian: "${searchQuery}" — ${filtered.length} ditemukan`;
    } else {
      countLabel.textContent = `${activeFilter} — ${filtered.length} artikel`;
    }
  }

  if (filtered.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  filtered.forEach(b => {
    const card = document.createElement('article');
    card.className = 'berita-card';
    card.setAttribute('data-berita-id', b.id);

    const dateStr = b.tanggal
      ? new Date(b.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    const imgSrc = b.gambar || 'assets/candi.png';
    const kat = b.kategori || 'Berita';
    const ks  = BERITA_KATEGORI_COLORS[kat] || BERITA_KATEGORI_COLORS['Berita'];

    card.innerHTML = `
      <div class="berita-card-img">
        <img src="${imgSrc}" alt="${escHtml(b.judul)}" loading="lazy">
        <span class="berita-kategori-badge" style="background:${ks.bg}; color:${ks.color}; border:1px solid ${ks.border};">${kat}</span>
      </div>
      <div class="berita-card-body">
        <div class="berita-meta">
          <i class="fa-regular fa-calendar"></i> ${dateStr}
          <span class="berita-meta-author"><i class="fa-solid fa-user-pen"></i> ${escHtml(b.penulis || 'Redaksi')}</span>
        </div>
        <h4 class="berita-card-title">${escHtml(b.judul)}</h4>
        <p class="berita-card-ringkasan">${escHtml(b.ringkasan || '')}</p>
        <button class="btn-baca-selengkapnya" type="button">
          <i class="fa-solid fa-book-open"></i> Baca Selengkapnya
        </button>
      </div>
    `;

    card.addEventListener('click', () => openBeritaModal(b.id));
    grid.appendChild(card);
  });
}

// ── Filter Controls ──────────────────────────────────────────
function initFilterControls() {
  const pills = document.querySelectorAll('.berita-filter-pill');
  const searchInput = document.getElementById('beritaSearchInput');

  pills.forEach(pill => {
    // Remove old listeners by replacing with clone
    const newPill = pill.cloneNode(true);
    pill.parentNode.replaceChild(newPill, pill);
    newPill.addEventListener('click', () => {
      document.querySelectorAll('.berita-filter-pill').forEach(p => p.classList.remove('active'));
      newPill.classList.add('active');
      applyFilter(newPill.getAttribute('data-filter') || 'Semua');
    });
  });

  if (searchInput) {
    const newInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newInput, searchInput);
    let debounce;
    newInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        _searchQuery = newInput.value.trim();
        renderGrid(_allBerita, _activeFilter, _searchQuery);
      }, 250);
    });
  }
}

function applyFilter(kat) {
  _activeFilter = kat;
  // Sync pill highlight
  document.querySelectorAll('.berita-filter-pill').forEach(p => {
    p.classList.toggle('active', p.getAttribute('data-filter') === kat);
  });
  renderGrid(_allBerita, _activeFilter, _searchQuery);
}

// ── Berita Modal Reader ──────────────────────────────────────
function openBeritaModal(beritaId) {
  const b = _allBerita.find(x => x.id === beritaId);
  if (!b) return;

  _beritaModalOpenId = beritaId;

  const modal = document.getElementById('beritaModal');
  const titleEl = document.getElementById('beritaModalTitle');
  const katEl   = document.getElementById('beritaModalKategori');
  const metaEl  = document.getElementById('beritaModalMeta');
  const imgWrap = document.getElementById('beritaModalImgWrap');
  const isiEl   = document.getElementById('beritaModalIsi');
  if (!modal) return;

  const kat = b.kategori || 'Berita';
  const ks  = BERITA_KATEGORI_COLORS[kat] || BERITA_KATEGORI_COLORS['Berita'];
  const dateStr = b.tanggal
    ? new Date(b.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  if (titleEl) titleEl.textContent = b.judul;
  if (katEl) {
    katEl.textContent = kat;
    katEl.style.cssText = `background:${ks.bg}; color:${ks.color}; border:1px solid ${ks.border}; padding:4px 12px; border-radius:20px; font-size:0.72rem; font-weight:700; text-transform:uppercase; display:inline-block;`;
  }
  if (metaEl) {
    metaEl.innerHTML = `
      <i class="fa-regular fa-calendar" style="margin-right:4px;"></i> ${dateStr}
      &nbsp;·&nbsp;
      <i class="fa-solid fa-user-pen" style="margin-right:4px;"></i> ${escHtml(b.penulis || 'Redaksi Desa Ngawen')}
    `;
  }
  if (imgWrap) {
    imgWrap.innerHTML = b.gambar
      ? `<img src="${b.gambar}" alt="${escHtml(b.judul)}" style="width:100%; max-height:360px; object-fit:cover; border-radius:14px; margin:14px 0; display:block;">`
      : '';
  }
  if (isiEl) {
    // Support simple paragraph break rendering
    const isi = (b.isi || b.ringkasan || 'Tidak ada konten artikel.')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    isiEl.innerHTML = `<p>${isi}</p>`;
  }

  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeBeritaModal() {
  const modal = document.getElementById('beritaModal');
  if (modal) {
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('active');
  }
  document.body.style.overflow = '';
  _beritaModalOpenId = null;
}

function initModalControls() {
  const closeBtn = document.getElementById('beritaModalCloseBtn');
  const footerClose = document.getElementById('beritaModalFooterClose');
  const modal = document.getElementById('beritaModal');

  if (closeBtn) closeBtn.addEventListener('click', closeBeritaModal);
  if (footerClose) footerClose.addEventListener('click', closeBeritaModal);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeBeritaModal(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBeritaModal();
  });
}

// ── Theme Controls ───────────────────────────────────────────
function initThemeControls() {
  const savedTheme = localStorage.getItem('desa_theme');
  const isDark = (savedTheme === 'dark') ||
    (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches);
  updateThemeUI(isDark);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-toggle-btn');
    if (!btn) return;
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    localStorage.setItem('desa_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    updateThemeUI(next === 'dark');
  });
}

function updateThemeUI(isDark) {
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    const span = btn.querySelector('span');
    const icon = btn.querySelector('i');
    if (span) span.textContent = isDark ? 'Mode Terang' : 'Mode Gelap';
    if (icon) icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  });
}

// ── Accessibility Font Size Controls ────────────────────────
function initA11y() {
  let fontSize = parseFloat(localStorage.getItem('desa_fontSize') || '16');
  document.documentElement.style.fontSize = fontSize + 'px';

  const dec   = document.getElementById('fontSizeDecBtn');
  const reset = document.getElementById('fontSizeResetBtn');
  const inc   = document.getElementById('fontSizeIncBtn');

  if (dec) dec.addEventListener('click', () => { fontSize = Math.max(12, fontSize - 1); applyFS(); });
  if (reset) reset.addEventListener('click', () => { fontSize = 16; applyFS(); });
  if (inc) inc.addEventListener('click', () => { fontSize = Math.min(22, fontSize + 1); applyFS(); });

  function applyFS() {
    document.documentElement.style.fontSize = fontSize + 'px';
    localStorage.setItem('desa_fontSize', fontSize);
  }
}

// ── Mobile Drawer ────────────────────────────────────────────
function initMobileDrawer() {
  const toggle  = document.getElementById('mobileMenuToggle');
  const drawer  = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('mobileOverlay');
  const closeBtn = document.getElementById('drawerCloseBtn');

  function openDrawer() {
    drawer?.classList.add('active');
    overlay?.classList.add('active');
    toggle?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDr() {
    drawer?.classList.remove('active');
    overlay?.classList.remove('active');
    toggle?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  toggle?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDr);
  overlay?.addEventListener('click', closeDr);
}

// ── Back-to-Top Button ───────────────────────────────────────
function initBackToTop() {
  const btn = document.getElementById('backToTopBtn');
  const circle = document.querySelector('.progress-ring-circle');
  if (!btn || !circle) return;

  const r = circle.r.baseVal.value;
  const circ = 2 * Math.PI * r;
  circle.style.strokeDasharray = `${circ} ${circ}`;
  circle.style.strokeDashoffset = circ;

  window.addEventListener('scroll', () => {
    const pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    circle.style.strokeDashoffset = circ - (pct / 100) * circ;
    btn.classList.toggle('visible', window.scrollY > 300);
  });

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── Live Sync Toast ───────────────────────────────────────────
function showLiveSyncToast() {
  const toast = document.getElementById('liveSyncToast');
  if (!toast) return;
  toast.style.display = 'flex';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

// ── Utility ──────────────────────────────────────────────────
function safeText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showEmptyState(show) {
  const es = document.getElementById('beritaEmptyState');
  const grid = document.getElementById('beritaCardsGrid');
  if (es) es.style.display = show ? 'block' : 'none';
  if (grid && show) grid.innerHTML = '';
}

// ── Bootstrap ────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBeritaPage);
} else {
  initBeritaPage();
}
