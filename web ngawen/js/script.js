/* ----------------------------------------------------
   Desa Ngawen Web Portal - JavaScript Interactivity
   Multi-Device, Accessibility & Interactive Features
---------------------------------------------------- */

// Global Theme Toggle Event Listener (Instant & Failsafe)
document.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('.theme-toggle-btn, #desktopThemeToggleBtn, #themeToggleBtn, #drawerThemeToggleBtn');
  if (toggleBtn) {
    e.preventDefault();
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const nextTheme = (currentTheme === 'dark') ? 'light' : 'dark';
    localStorage.setItem('desa_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);

    const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
    themeToggleBtns.forEach(btn => {
      const span = btn.querySelector('span');
      const icon = btn.querySelector('i');
      if (nextTheme === 'dark') {
        if (span) span.innerText = 'Mode Terang';
        if (icon) icon.className = 'fa-solid fa-sun';
      } else {
        if (span) span.innerText = 'Mode Gelap';
        if (icon) icon.className = 'fa-solid fa-moon';
      }
    });

    if (typeof updateChartTheme === 'function') {
      updateChartTheme(nextTheme === 'dark');
    }
  }
});

// Global Navigation Tab Click Listener (Instant & Failsafe)
document.addEventListener('click', (e) => {
  const tabBtn = e.target.closest('.nav-tab-btn');
  if (tabBtn) {
    const targetId = tabBtn.getAttribute('data-target');
    const targetElement = targetId ? document.getElementById(targetId) : null;
    if (targetElement) {
      e.preventDefault();

      // Highlight active button across desktop and mobile nav
      document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-target') === targetId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Close mobile drawer if open
      const mobileDrawer = document.getElementById('mobileDrawer');
      const mobileOverlay = document.getElementById('mobileOverlay');
      const mobileMenuToggle = document.getElementById('mobileMenuToggle');
      if (mobileDrawer) mobileDrawer.classList.remove('active');
      if (mobileOverlay) mobileOverlay.classList.remove('active');
      if (mobileMenuToggle) mobileMenuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';

      // Scroll smoothly to section
      const headerOffset = 80;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }
});

async function initPortal() {
  let cmsData = null;
  let potensiChartInstance = null;
  let landUseChartInstance = null;

  // =========================================================
  // 1. Theme Switcher & Accessibility Controls (Run First)
  // =========================================================
  const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
  const fontSizeDecBtn = document.getElementById('fontSizeDecBtn');
  const fontSizeResetBtn = document.getElementById('fontSizeResetBtn');
  const fontSizeIncBtn = document.getElementById('fontSizeIncBtn');

  function updateThemeUI(isDark) {
    themeToggleBtns.forEach(btn => {
      const span = btn.querySelector('span');
      const icon = btn.querySelector('i');
      if (isDark) {
        if (span) span.innerText = 'Mode Terang';
        if (icon) icon.className = 'fa-solid fa-sun';
      } else {
        if (span) span.innerText = 'Mode Gelap';
        if (icon) icon.className = 'fa-solid fa-moon';
      }
    });

    if (typeof updateChartTheme === 'function') {
      updateChartTheme(isDark);
    }
  }

  function applyTheme(themeName) {
    const isDark = (themeName === 'dark');
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    updateThemeUI(isDark);
  }

  // Load saved theme from localStorage or OS preference
  const savedTheme = localStorage.getItem('desa_theme');
  if (savedTheme === 'dark' || savedTheme === 'light') {
    applyTheme(savedTheme);
  } else {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }

  // Load & Render Dynamic Content from CMS Engine (Safely in try-catch)
  if (window.cmsEngine) {
    try {
      cmsData = await window.cmsEngine.loadData();
      if (cmsData) {
        // 0. Branding: Logo Header
        if (cmsData.themeConfig) {
          const brandBadge = document.querySelector('.brand-logo-badge');
          if (brandBadge) {
            if (cmsData.themeConfig.logoType === 'image' && cmsData.themeConfig.logoImage) {
              brandBadge.innerHTML = `<img src="${cmsData.themeConfig.logoImage}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;" alt="Logo">`;
            } else if (cmsData.themeConfig.logoIcon) {
              brandBadge.innerHTML = `<i class="${cmsData.themeConfig.logoIcon}"></i>`;
            }
          }
        }

        // 0.1 Site Main Images
        if (cmsData.siteImages) {
          const kadesImg = document.querySelector('.pejabat-avatar img');
          if (kadesImg && cmsData.siteImages.balaiDesa) kadesImg.src = cmsData.siteImages.balaiDesa;

          const candiImg = document.querySelector('.potensi-img-card img');
          if (candiImg && cmsData.siteImages.candiNgawen) candiImg.src = cmsData.siteImages.candiNgawen;

          const demografiImg = document.querySelector('img[alt="Suasana Warga Desa"]');
          if (demografiImg && cmsData.siteImages.demografi) demografiImg.src = cmsData.siteImages.demografi;

          const pkkImg = document.querySelector('img[alt="PKK Desa Ngawen"]');
          if (pkkImg && cmsData.siteImages.pkk) pkkImg.src = cmsData.siteImages.pkk;
        }

        // 1. Hero Banner & Profil
        const heroPill = document.querySelector('.hero-pill');
        if (heroPill && cmsData.profil && cmsData.profil.heroPill) heroPill.innerHTML = `<i class="fa-solid fa-sparkles"></i> ${cmsData.profil.heroPill}`;

        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle && cmsData.profil && cmsData.profil.heroTitle) heroTitle.innerHTML = cmsData.profil.heroTitle;

        const heroDesc = document.querySelector('.hero-desc');
        if (heroDesc && cmsData.profil && cmsData.profil.heroDesc) heroDesc.innerHTML = cmsData.profil.heroDesc;

        const visiText = document.querySelector('.visi-text');
        if (visiText && cmsData.profil && cmsData.profil.visi) visiText.innerText = `"${cmsData.profil.visi}"`;

        // Visi & Misi Items
        if (cmsData.profil && cmsData.profil.misi && cmsData.profil.misi.length > 0) {
          const misiGrid = document.querySelector('.misi-grid');
          if (misiGrid) {
            misiGrid.innerHTML = '';
            cmsData.profil.misi.forEach((m, idx) => {
              const card = document.createElement('div');
              card.className = 'misi-item-card';
              card.innerHTML = `<div class="misi-number">0${idx + 1}</div><p>${m}</p>`;
              misiGrid.appendChild(card);
            });
          }
        }

        // Hero Stats Numbers
        if (cmsData.profil && cmsData.profil.stats) {
          const statCards = document.querySelectorAll('.hero-stat-card');
          if (statCards.length >= 4) {
            if (statCards[0].querySelector('.hero-stat-number')) statCards[0].querySelector('.hero-stat-number').innerText = (cmsData.profil.stats.totalPenduduk || 4062).toLocaleString('id-ID');
            if (statCards[1].querySelector('.hero-stat-number')) statCards[1].querySelector('.hero-stat-number').innerText = (cmsData.profil.stats.totalKK || 1363).toLocaleString('id-ID');
            if (statCards[2].querySelector('.hero-stat-number')) statCards[2].querySelector('.hero-stat-number').innerText = cmsData.profil.stats.luasWilayah || 202.8;
            if (statCards[3].querySelector('.hero-stat-number')) statCards[3].querySelector('.hero-stat-number').innerText = cmsData.profil.stats.totalDusun || 10;
          }
        }

        // 2. Kepala Desa & Perangkat
        if (cmsData.pemerintahan) {
          const kadesCard = document.querySelector('.pejabat-card');
          if (kadesCard && cmsData.pemerintahan.kepalaDesa) {
            const nameEl = kadesCard.querySelector('.pejabat-name');
            const descEl = kadesCard.querySelector('.pejabat-desc');
            if (nameEl) nameEl.innerText = cmsData.pemerintahan.kepalaDesa.nama;
            if (descEl) descEl.innerText = cmsData.pemerintahan.kepalaDesa.deskripsi;
          }

          // Kadus Grid
          if (cmsData.pemerintahan.kadus) {
            const kadusBox = document.querySelector('.kadus-grid-box');
            if (kadusBox) {
              kadusBox.innerHTML = '';
              cmsData.pemerintahan.kadus.forEach(k => {
                const card = document.createElement('div');
                card.className = 'kadus-card';
                card.innerHTML = `<div class="dusun-title">${k.dusun}</div><div class="kadus-name">${k.nama}</div>`;
                kadusBox.appendChild(card);
              });
            }
          }
        }

        // 3. Kelompok Organisasi
        if (cmsData.kelompok && cmsData.kelompok.length > 0) {
          const kelompokGrid = document.querySelector('#sec-kelompok .grid-4col');
          if (kelompokGrid) {
            kelompokGrid.innerHTML = '';
            cmsData.kelompok.forEach(kel => {
              const card = document.createElement('div');
              card.className = 'group-organization-card';
              card.innerHTML = `
                <div class="group-icon-halo"><i class="${kel.icon || 'fa-solid fa-users'}"></i></div>
                <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:4px;">${kel.nama}</h4>
                <p style="font-size:0.8rem; color:var(--slate-600);">${kel.deskripsi}</p>
              `;
              kelompokGrid.appendChild(card);
            });
          }
        }

        // 4. Batas Wilayah
        if (cmsData.wilayah && cmsData.wilayah.batas) {
          const itemUtara = document.querySelector('.batas-card-item:nth-child(1) div:last-child div:last-child');
          if (itemUtara) itemUtara.innerText = cmsData.wilayah.batas.utara;
          const itemSelatan = document.querySelector('.batas-card-item:nth-child(2) div:last-child div:last-child');
          if (itemSelatan) itemSelatan.innerText = cmsData.wilayah.batas.selatan;
          const itemBarat = document.querySelector('.batas-card-item:nth-child(3) div:last-child div:last-child');
          if (itemBarat) itemBarat.innerText = cmsData.wilayah.batas.barat;
          const itemTimur = document.querySelector('.batas-card-item:nth-child(4) div:last-child div:last-child');
          if (itemTimur) itemTimur.innerText = cmsData.wilayah.batas.timur;
        }
        // 5. Demografi — Total Penduduk Banner
        if (cmsData.demografi) {
          const dm = cmsData.demografi;

          // Total number in demografi hero card
          const totalNumEl = document.querySelector('.total-number');
          if (totalNumEl) totalNumEl.innerText = (dm.totalPenduduk || 4153).toLocaleString('id-ID');

          const totalDescEl = document.querySelector('.total-desc');
          if (totalDescEl) totalDescEl.innerText = `Total Jiwa Terdaftar di Desa ${cmsData.siteInfo ? cmsData.siteInfo.namaDesa : 'Ngawen'}`;

          // Gender boxes
          const genderBoxes = document.querySelectorAll('.gender-box .gender-count');
          if (genderBoxes.length >= 2) {
            genderBoxes[0].innerText = (dm.lakiLaki || 2033).toLocaleString('id-ID');
            genderBoxes[1].innerText = (dm.perempuan || 2117).toLocaleString('id-ID');
          }

          // Wilayah admin list (10 Dusun, 22 RW, 43 RT, KK)
          const adminItems = document.querySelectorAll('.wilayah-admin-item .admin-info .title');
          if (adminItems.length >= 4) {
            adminItems[0].innerText = `${dm.dusunCount || 10} Dusun Tersebar di Wilayah Desa`;
            adminItems[1].innerText = `${dm.rwCount || 22} Wilayah Rukun Warga (RW)`;
            adminItems[2].innerText = `${dm.rtCount || 43} Wilayah Rukun Tetangga (RT)`;
            adminItems[3].innerText = `${(dm.kkCount || 1370).toLocaleString('id-ID')} Kepala Keluarga (KK)`;
          }

          // Agama Table — Rebuild tbody from CMS
          if (dm.agama && dm.agama.length > 0) {
            const agamaTbody = document.querySelector('.data-table-container:first-of-type tbody');
            if (agamaTbody) {
              agamaTbody.replaceChildren();
              dm.agama.forEach(ag => {
                const tr = document.createElement('tr');
                const tdName = document.createElement('td');
                const icon = document.createElement('i');
                icon.className = `${ag.icon} `;
                icon.style.cssText = 'color:var(--brand-600); margin-right:8px;';
                tdName.append(icon, ag.nama);

                const tdPct = document.createElement('td');
                tdPct.style.textAlign = 'right';
                const progWrap = document.createElement('div');
                progWrap.className = 'table-progress-bar';
                const barTrack = document.createElement('div');
                barTrack.className = 'bar-track';
                const barFill = document.createElement('div');
                barFill.className = 'bar-fill';
                barFill.style.width = `${ag.persentase}%`;
                barTrack.appendChild(barFill);
                const pctSpan = document.createElement('span');
                pctSpan.textContent = `${ag.persentase}%`;
                progWrap.append(barTrack, pctSpan);
                tdPct.appendChild(progWrap);

                tr.append(tdName, tdPct);
                agamaTbody.appendChild(tr);
              });
            }
          }

          // Pekerjaan Table — Rebuild tbody from CMS
          if (dm.pekerjaan && dm.pekerjaan.length > 0) {
            const pekerjaanTbody = document.querySelector('.data-table-container:last-of-type tbody');
            if (pekerjaanTbody) {
              pekerjaanTbody.replaceChildren();
              dm.pekerjaan.forEach(p => {
                const tr = document.createElement('tr');
                const tdName = document.createElement('td');
                tdName.textContent = p.sektor;
                const tdPct = document.createElement('td');
                tdPct.style.cssText = 'text-align:right; font-weight:700; color:var(--brand-900);';
                tdPct.textContent = p.proporsi;
                tr.append(tdName, tdPct);
                pekerjaanTbody.appendChild(tr);
              });
            }
          }

          // Pendidikan Table — Rebuild tbody from CMS
          if (dm.pendidikan && dm.pendidikan.length > 0) {
            const pendidikanTbody = document.querySelector('.data-table-container:nth-of-type(2) tbody');
            if (pendidikanTbody) {
              pendidikanTbody.replaceChildren();
              dm.pendidikan.forEach(p => {
                const tr = document.createElement('tr');
                const tdName = document.createElement('td');
                tdName.textContent = p.tingkat;
                const tdPct = document.createElement('td');
                tdPct.style.cssText = 'text-align:right; font-weight:700; color:var(--brand-900);';
                tdPct.textContent = `${(p.jumlah || 0).toLocaleString('id-ID')} jiwa (${p.persentase})`;
                tr.append(tdName, tdPct);
                pendidikanTbody.appendChild(tr);
              });
            }
          }
        }

        // Lokasi Penting Peta Cards — Dynamic from CMS
        if (cmsData.wilayah && cmsData.wilayah.lokasiPeta && cmsData.wilayah.lokasiPeta.length > 0) {
          const lokasiCardsBox = document.getElementById('lokasiCards');
          if (lokasiCardsBox) {
            lokasiCardsBox.innerHTML = cmsData.wilayah.lokasiPeta.map(loc => `
              <a href="https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}" target="_blank" rel="noopener" class="lokasi-card-item" data-category="${loc.category}">
                <div class="lokasi-card-icon" style="background:${loc.bgColor || 'linear-gradient(135deg,#0f3822,#1b5e3a)'};"><i class="fa-solid ${loc.iconClass || 'fa-location-dot'}"></i></div>
                <div class="lokasi-card-info">
                  <div class="lokasi-card-name">${loc.name}</div>
                  <div class="lokasi-card-cat">${loc.category === 'wisata' ? 'Wisata Budaya & Alam' : (loc.category === 'tani' ? 'UMKM & Pertanian' : 'Fasilitas Publik')}</div>
                </div>
              </a>
            `).join('');
          }
        }

        // 6. Perangkat Desa Grid — Dynamic from CMS
        if (cmsData.pemerintahan && cmsData.pemerintahan.perangkat && cmsData.pemerintahan.perangkat.length > 0) {
          const perangkatGrid = document.querySelector('#sec-pemerintahan .grid-4col');
          if (perangkatGrid) {
            perangkatGrid.replaceChildren();
            cmsData.pemerintahan.perangkat.forEach(p => {
              const bgClass = p.tagClass === 'amber' ? 'var(--gold-100)' : 'var(--brand-100)';
              const colorClass = p.tagClass === 'amber' ? 'var(--gold-700)' : 'var(--brand-900)';
              const tagClass = p.tagClass === 'amber' ? 'pejabat-role-tag amber' : 'pejabat-role-tag';
              const card = document.createElement('div');
              card.className = 'pejabat-card';
              card.innerHTML = `
                <div style="width:48px; height:48px; border-radius:var(--radius-md); background:${bgClass}; color:${colorClass}; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">
                  <i class="${p.iconClass}"></i>
                </div>
                <div>
                  <span class="${tagClass}">${p.jabatan}</span>
                  <div class="pejabat-name">${p.nama}</div>
                  <div class="pejabat-desc">${p.deskripsi}</div>
                </div>`;
              perangkatGrid.appendChild(card);
            });
          }
        }

        // 7. Kegiatan Kemasyarakatan — Dynamic grid
        if (cmsData.kemasyarakatan && cmsData.kemasyarakatan.kegiatan && cmsData.kemasyarakatan.kegiatan.length > 0) {
          const kegiatanGrid = document.querySelector('#sec-kemasyarakatan .grid-3col');
          if (kegiatanGrid) {
            kegiatanGrid.replaceChildren();
            cmsData.kemasyarakatan.kegiatan.forEach(kg => {
              const card = document.createElement('div');
              card.className = 'kegiatan-social-card';
              const imgSrc = kg.gambar || 'assets/demografi.png';
              card.innerHTML = `
                <div class="kegiatan-img-wrapper">
                  <img src="${imgSrc}" alt="${kg.judul}" loading="lazy">
                </div>
                <div class="kegiatan-body-content">
                  <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; color:var(--brand-700); margin-bottom:6px;">
                    <i class="fa-solid fa-star"></i> ${kg.kategori}
                  </div>
                  <h4 style="font-size:1rem; font-weight:700; color:var(--slate-900); margin-bottom:8px;">${kg.judul}</h4>
                  <p style="font-size:0.825rem; color:var(--slate-600);">${kg.deskripsi}</p>
                </div>
                <div class="kegiatan-footer-bar">
                  <span><i class="fa-regular fa-clock" style="margin-right:4px;"></i> ${kg.jadwal || 'Rutin'}</span>
                  <span style="color:var(--brand-700);">Selengkapnya <i class="fa-solid fa-arrow-right"></i></span>
                </div>`;
              kegiatanGrid.appendChild(card);
            });
          }
        }

        // 8. Produk Lokal List — Dynamic
        if (cmsData.potensi && cmsData.potensi.produkLokal && cmsData.potensi.produkLokal.length > 0) {
          const produkBox = document.querySelector('.produk-lokal-box div[style*="flex-direction"]');
          if (produkBox) {
            produkBox.replaceChildren();
            cmsData.potensi.produkLokal.forEach(produk => {
              const item = document.createElement('div');
              item.className = 'produk-row-item';
              const icon = document.createElement('i');
              icon.className = 'fa-solid fa-circle-check';
              item.append(icon, ' ' + produk);
              produkBox.appendChild(item);
            });
          }
        }

        // 9. PKK Info
        if (cmsData.kemasyarakatan && cmsData.kemasyarakatan.pkk) {
          const pkk = cmsData.kemasyarakatan.pkk;
          const pkkDesc = document.querySelector('.pkk-feature-box p');
          if (pkkDesc && pkk.deskripsi) pkkDesc.innerText = pkk.deskripsi;
        }

        // 10. Berita Terbaru — Full interactive render with search & filter
        if (cmsData.berita && cmsData.berita.length > 0) {
          window._allBeritaData = cmsData.berita.filter(b => !b.status || b.status !== 'draft');
          const isFullBeritaPage = window.location.pathname.includes('berita.html');
          renderBeritaSection(window._allBeritaData, 'Semua', '', isFullBeritaPage ? 0 : 3);
          initBeritaControls();
        } else {
          // Clear loading state
          const grid = document.getElementById('beritaCardsGrid');
          if (grid) grid.innerHTML = '';
          const emptyState = document.getElementById('beritaEmptyState');
          if (emptyState) emptyState.style.display = 'block';
        }

        // 11. Site Info — Title & Subtitle in brand area
        if (cmsData.siteInfo) {
          const brandTitle = document.querySelector('.brand-text h1');
          if (brandTitle && cmsData.siteInfo.title) brandTitle.innerText = `Desa ${cmsData.siteInfo.namaDesa || cmsData.siteInfo.title}`;

          const brandSubtitle = document.querySelector('.brand-text p, .brand-text .brand-sub');
          if (brandSubtitle && cmsData.siteInfo.subtitle) brandSubtitle.innerText = cmsData.siteInfo.subtitle;

          // 12. Kontak Resmi — Dynamic from CMS siteInfo.kontakResmi
          if (cmsData.siteInfo.kontakResmi) {
            const k = cmsData.siteInfo.kontakResmi;

            // Update WhatsApp CTA buttons (dynamic href)
            const waNumber = (k.whatsapp || '087756655004').replace(/\D/g, '');
            const waHref = `https://wa.me/62${waNumber.replace(/^0/, '')}`;
            document.querySelectorAll('a[href*="wa.me"]:not([data-custom-wa="true"]), a[href*="whatsapp"]:not([data-custom-wa="true"])').forEach(el => {
              el.href = waHref;
            });

            // Update email links
            document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
              if (k.email) el.href = `mailto:${k.email}`;
            });

            // Update any static kontak text elements
            const kontakWaEls = document.querySelectorAll('[data-kontak="whatsapp"]');
            kontakWaEls.forEach(el => el.textContent = k.whatsapp || '087756655004');

            const kontakEmailEls = document.querySelectorAll('[data-kontak="email"]');
            kontakEmailEls.forEach(el => el.textContent = k.email || 'Pemdesangawen@gmail.com');

            const kontakTelpEls = document.querySelectorAll('[data-kontak="telepon"]');
            kontakTelpEls.forEach(el => el.textContent = k.telepon || '(0293)');

            const kontakIgEls = document.querySelectorAll('[data-kontak="instagram"]');
            kontakIgEls.forEach(el => el.textContent = k.instagram || '@pemdes_ngawen');

            const kontakYtEls = document.querySelectorAll('[data-kontak="youtube"]');
            kontakYtEls.forEach(el => el.textContent = k.youtube || 'Desa Ngawen Channel');

            // Render kontak info section if exists
            const kontakSection = document.getElementById('cms-kontak-info');
            if (kontakSection) {
              kontakSection.innerHTML = `
                <div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:8px;">
                  ${k.telepon ? `<a href="tel:${k.telepon}" style="display:flex; align-items:center; gap:8px; padding:8px 16px; background:rgba(34,197,94,0.12); border-radius:30px; font-size:0.85rem; font-weight:700; color:var(--brand-900); text-decoration:none; border:1px solid rgba(34,197,94,0.25);">
                    <i class="fa-solid fa-phone" style="color:#22c55e;"></i> ${k.telepon}
                  </a>` : ''}
                  ${k.whatsapp ? `<a href="${waHref}" target="_blank" rel="noopener" style="display:flex; align-items:center; gap:8px; padding:8px 16px; background:rgba(34,197,94,0.12); border-radius:30px; font-size:0.85rem; font-weight:700; color:#065f46; text-decoration:none; border:1px solid rgba(34,197,94,0.25);">
                    <i class="fa-brands fa-whatsapp" style="color:#25D366; font-size:1rem;"></i> ${k.whatsapp}
                  </a>` : ''}
                  ${k.email ? `<a href="mailto:${k.email}" style="display:flex; align-items:center; gap:8px; padding:8px 16px; background:rgba(2,132,199,0.12); border-radius:30px; font-size:0.85rem; font-weight:700; color:#0369a1; text-decoration:none; border:1px solid rgba(2,132,199,0.25);">
                    <i class="fa-solid fa-envelope" style="color:#0284c7;"></i> ${k.email}
                  </a>` : ''}
                  ${k.instagram ? `<a href="https://instagram.com/${k.instagram.replace('@', '')}" target="_blank" rel="noopener" style="display:flex; align-items:center; gap:8px; padding:8px 16px; background:rgba(168,85,247,0.12); border-radius:30px; font-size:0.85rem; font-weight:700; color:#6b21a8; text-decoration:none; border:1px solid rgba(168,85,247,0.25);">
                    <i class="fa-brands fa-instagram" style="color:#e1306c;"></i> ${k.instagram}
                  </a>` : ''}
                </div>
              `;
            }

            // Footer kontak update
            const footerKontak = document.getElementById('footer-kontak-info');
            if (footerKontak) {
              footerKontak.innerHTML = `
                ${k.whatsapp ? `<a href="${waHref}" target="_blank" rel="noopener" style="display:flex; align-items:center; gap:6px; color:rgba(255,255,255,0.8); font-size:0.82rem; text-decoration:none; margin-bottom:4px;">
                  <i class="fa-brands fa-whatsapp" style="color:#25D366;"></i> ${k.whatsapp}
                </a>` : ''}
                ${k.email ? `<a href="mailto:${k.email}" style="display:flex; align-items:center; gap:6px; color:rgba(255,255,255,0.8); font-size:0.82rem; text-decoration:none; margin-bottom:4px;">
                  <i class="fa-solid fa-envelope"></i> ${k.email}
                </a>` : ''}
                ${k.instagram ? `<a href="https://instagram.com/${k.instagram.replace('@', '')}" target="_blank" rel="noopener" style="display:flex; align-items:center; gap:6px; color:rgba(255,255,255,0.8); font-size:0.82rem; text-decoration:none;">
                  <i class="fa-brands fa-instagram"></i> ${k.instagram}
                </a>` : ''}
              `;
            }
          }
        }
      }

      // Real-time synchronization (cross-tab & SSE stream)
      window.cmsEngine.onRealtimeEvent(async (evt) => {
        if (evt.type === 'CMS_UPDATED' || evt.type === 'CMS_CONTENT_UPDATED' || evt.type === 'CMS_STORAGE_UPDATED') {
          const fresh = await window.cmsEngine.loadData();
          if (fresh) {
            console.log('⚡ Dynamic portal update rendered.');
          }
        }
      });

      window.addEventListener('storage', async (e) => {
        if (e.key === 'desa_ngawen_cms_data' && e.newValue) {
          try {
            const fresh = JSON.parse(e.newValue);
            window.cmsEngine.data = fresh;
          } catch { }
        }
      });
    } catch (err) {
      console.warn('Gagal memuat data CMS:', err);
    }
  }

  // Font Size Adjuster
  if (fontSizeDecBtn && fontSizeResetBtn && fontSizeIncBtn) {
    fontSizeDecBtn.addEventListener('click', () => {
      document.body.classList.remove('font-lg');
      document.body.classList.add('font-sm');
    });
    fontSizeResetBtn.addEventListener('click', () => {
      document.body.classList.remove('font-sm', 'font-lg');
    });
    fontSizeIncBtn.addEventListener('click', () => {
      document.body.classList.remove('font-sm');
      document.body.classList.add('font-lg');
    });
  }

  // =========================================================
  // 2. Mobile Drawer Navigation
  // =========================================================
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const mobileOverlay = document.getElementById('mobileOverlay');

  function openMobileDrawer() {
    if (mobileDrawer) mobileDrawer.classList.add('active');
    if (mobileOverlay) mobileOverlay.classList.add('active');
    if (mobileMenuToggle) mobileMenuToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileDrawer() {
    if (mobileDrawer) mobileDrawer.classList.remove('active');
    if (mobileOverlay) mobileOverlay.classList.remove('active');
    if (mobileMenuToggle) mobileMenuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      const isOpen = mobileDrawer && mobileDrawer.classList.contains('active');
      if (isOpen) {
        closeMobileDrawer();
      } else {
        openMobileDrawer();
      }
    });
  }

  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeMobileDrawer);
  if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobileDrawer);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 992 && mobileDrawer && mobileDrawer.classList.contains('active')) {
      closeMobileDrawer();
    }
  });

  // Brand Home Button Click Listener (Scroll to Top)
  const brandHomeBtn = document.getElementById('brandHomeBtn');
  if (brandHomeBtn) {
    brandHomeBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // =========================================================
  // 3. Tab Navigation & Smooth Scroll
  // =========================================================
  const navTabBtns = document.querySelectorAll('.nav-tab-btn');
  const sections = document.querySelectorAll('.page-section');
  let isClickScrolling = false;
  let scrollTimeout;

  function setActiveTab(targetId) {
    navTabBtns.forEach(btn => {
      if (btn.getAttribute('data-target') === targetId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  navTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = btn.getAttribute('data-target');
      const targetElement = targetId ? document.getElementById(targetId) : null;

      if (targetElement) {
        e.preventDefault();
        setActiveTab(targetId);
        isClickScrolling = true;

        if (mobileDrawer && mobileDrawer.classList.contains('active')) {
          closeMobileDrawer();
        }

        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isClickScrolling = false;
        }, 800);
      }
    });
  });

  // Smooth Active Tab Tracker on Scroll
  window.addEventListener('scroll', () => {
    if (isClickScrolling) return;

    let currentSectionId = '';
    const scrollPos = window.scrollY + 180;

    if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 80)) {
      const secBerita = document.getElementById('sec-berita');
      if (secBerita && (secBerita.getBoundingClientRect().top + window.pageYOffset) <= scrollPos) {
        currentSectionId = 'sec-berita';
      } else {
        currentSectionId = 'sec-wilayah';
      }
    } else {
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
          currentSectionId = section.getAttribute('id');
        }
      });
    }

    if (currentSectionId) {
      setActiveTab(currentSectionId);
    }
  });

  // =========================================================
  // 4. Stat Counter Increment Animation
  // =========================================================
  const statNumbers = document.querySelectorAll('.hero-stat-number, .counter-num');

  function animateCounters() {
    statNumbers.forEach(counter => {
      if (counter.classList.contains('counted')) return;

      const rawText = counter.innerText.trim();
      let targetVal;
      let isFloat = false;

      if (rawText.includes('.') && rawText.split('.')[1]?.length === 2) {
        // Floating point number (e.g., 202.8)
        targetVal = parseFloat(rawText);
        isFloat = true;
      } else {
        // Integer with Indonesian thousands separator (e.g., 4.062)
        targetVal = parseFloat(rawText.replace(/\./g, '').replace(',', '.'));
      }
      if (isNaN(targetVal)) return;

      counter.classList.add('counted');
      const duration = 1500; // ms
      const startTime = performance.now();

      function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease Out Cubic
        const currentVal = targetVal * easeProgress;

        if (isFloat) {
          counter.innerText = currentVal.toFixed(2);
        } else {
          counter.innerText = Math.floor(currentVal).toLocaleString('id-ID');
        }

        if (progress < 1) {
          requestAnimationFrame(updateNumber);
        } else {
          counter.innerText = rawText; // set exact original string
        }
      }

      requestAnimationFrame(updateNumber);
    });
  }

  // Observer to trigger counter animation on scroll
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounters();
      }
    });
  }, { threshold: 0.3 });

  const counterContainers = document.querySelectorAll('.hero-block, .land-use-hero-card');
  counterContainers.forEach(container => counterObserver.observe(container));

  // =========================================================
  // 5. Leaflet Map with Multiple Markers & Category Filter
  // =========================================================
  const mapElement = document.getElementById('map');
  let map;
  let markersList = [];

  if (mapElement && typeof L !== 'undefined') {
    // Koordinat real dari Google Maps: Desa Ngawen, Kec. Muntilan, Kab. Magelang
    // Sumber: https://maps.app.goo.gl/sN8yUAfaAa3Qerc39
    const centerLat = -7.6030;
    const centerLng = 110.2683;

    map = L.map('map', {
      scrollWheelZoom: false,
      zoomControl: true
    }).setView([centerLat, centerLng], 15);

    // Google Maps Tile Layers (Roadmap, Satellite Hybrid, Terrain)
    const googleStreets = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['0', '1', '2', '3'],
      attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener">Google Maps</a> | Desa Ngawen, Muntilan'
    });

    const googleHybrid = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['0', '1', '2', '3'],
      attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener">Google Maps Satellite</a> | Desa Ngawen, Muntilan'
    });

    const googleTerrain = L.tileLayer('https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['0', '1', '2', '3'],
      attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener">Google Maps Terrain</a> | Desa Ngawen, Muntilan'
    });

    // Add Google Streets as default active layer
    googleStreets.addTo(map);

    // Layer Control for switching Google Maps View (Jalan, Satelit, Medan)
    const baseMaps = {
      "<span style='font-size:12px; font-weight:600;'><i class='fa-solid fa-map' style='color:#4285F4;'></i> Google Maps Jalan</span>": googleStreets,
      "<span style='font-size:12px; font-weight:600;'><i class='fa-solid fa-satellite' style='color:#34A853;'></i> Google Maps Satelit</span>": googleHybrid,
      "<span style='font-size:12px; font-weight:600;'><i class='fa-solid fa-mountain' style='color:#FBBC05;'></i> Google Maps Medan</span>": googleTerrain
    };

    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

    // ============================================================
    // Marker Lokasi Real — Desa Ngawen, Kec. Muntilan
    // Koordinat diverifikasi dari Google Maps:
    // https://maps.app.goo.gl/sN8yUAfaAa3Qerc39
    // ============================================================
    const defaultLocations = [
      {
        id: 'candi',
        category: 'wisata',
        name: 'Situs Candi Ngawen',
        desc: 'Kompleks 5 Candi Buddha abad ke-8 peninggalan Wangsa Syailendra, Mataram Kuno.',
        lat: -7.6010,
        lng: 110.2688,
        iconClass: 'fa-landmark',
        bgColor: 'linear-gradient(135deg, #0f3822, #1b5e3a)'
      },
      {
        id: 'balai',
        category: 'publik',
        name: 'Balai Desa Ngawen',
        desc: 'Pusat Pemerintahan, Kantor Kepala Desa & Pelayanan Publik Warga Ngawen.',
        lat: -7.6029,
        lng: 110.2683,
        iconClass: 'fa-building-columns',
        bgColor: 'linear-gradient(135deg, #b45309, #d97706)'
      },
      {
        id: 'clapar',
        category: 'tani',
        name: 'Dusun Clapar (Sentra Kerajinan Doran & Pahat Batu)',
        desc: 'Sentra UMKM produksi kerajinan doran pacul kayu & ukiran pahat batu khas Muntilan.',
        lat: -7.6055,
        lng: 110.2645,
        iconClass: 'fa-hammer',
        bgColor: 'linear-gradient(135deg, #7c2d12, #ea580c)'
      },
      {
        id: 'citromenggalan',
        category: 'publik',
        name: 'Sentra UMKM Kuliner Jemunak (Citromenggalan)',
        desc: 'Pusat pembuatan kuliner tradisional warisan budaya Jemunak & Jenang ketan khas Ngawen.',
        lat: -7.5995,
        lng: 110.2710,
        iconClass: 'fa-utensils',
        bgColor: 'linear-gradient(135deg, #475569, #334155)'
      },
      {
        id: 'sendang',
        category: 'wisata',
        name: 'Sendang Manis & River Tubing Kali Blongkeng',
        desc: 'Mata air alami Sendang Manis dan wahana susur sungai (River Tubing) Kali Blongkeng.',
        lat: -7.6070,
        lng: 110.2720,
        iconClass: 'fa-water',
        bgColor: 'linear-gradient(135deg, #0284c7, #0369a1)'
      },
      {
        id: 'agrowisata',
        category: 'tani',
        name: 'Kawasan Agrowisata Persawahan Ngawen',
        desc: 'Lahan pertanian padi produktif & lokasi prosesi adat tradisi Sego Wiwit Ngawen.',
        lat: -7.6010,
        lng: 110.2650,
        iconClass: 'fa-wheat-awn',
        bgColor: 'linear-gradient(135deg, #165b36, #22c55e)'
      },
      {
        id: 'bumdes',
        category: 'publik',
        name: 'BUMDes Ngawen Sejahtera',
        desc: 'Badan Usaha Milik Desa & pusat pemasaran produk UMKM lokal Ngawen.',
        lat: -7.6040,
        lng: 110.2695,
        iconClass: 'fa-store',
        bgColor: 'linear-gradient(135deg, #4f46e5, #6366f1)'
      },
      {
        id: 'posyandu',
        category: 'publik',
        name: 'Pos Kesehatan Desa (PKD) & Posyandu Ngawen',
        desc: 'Pusat Pelayanan Kesehatan Terpadu, Posyandu Balita & Dapur Sehat Stunting.',
        lat: -7.6035,
        lng: 110.2678,
        iconClass: 'fa-hospital-user',
        bgColor: 'linear-gradient(135deg, #dc2626, #ef4444)'
      },
      {
        id: 'sdn1',
        category: 'publik',
        name: 'SD Negeri Ngawen 1',
        desc: 'Sekolah Dasar Negeri 1 Ngawen — Sarana Pendidikan Dasar Desa Ngawen.',
        lat: -7.6022,
        lng: 110.2672,
        iconClass: 'fa-school',
        bgColor: 'linear-gradient(135deg, #0d9488, #14b8a6)'
      },
      {
        id: 'kolokendang',
        category: 'tani',
        name: 'Dusun Kolokendang',
        desc: 'Kawasan Dusun Kolokendang — Sentra Pertanian dan Peternakan Desa Ngawen.',
        lat: -7.5980,
        lng: 110.2660,
        iconClass: 'fa-house-chimney-window',
        bgColor: 'linear-gradient(135deg, #65a30d, #84cc16)'
      }
    ];

    const locationsData = (typeof cmsData !== 'undefined' && cmsData && cmsData.wilayah && cmsData.wilayah.lokasiPeta) ? cmsData.wilayah.lokasiPeta : defaultLocations;

    // Create & Add Markers
    locationsData.forEach(loc => {
      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background: ${loc.bgColor}; color:#ffffff; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.3); font-size:14px;"><i class="fa-solid ${loc.iconClass}"></i></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; text-align:center; padding: 4px;">
            <strong style="color: #0f3822; font-size: 13px; display:block; margin-bottom:2px;">${loc.name}</strong>
            <span style="font-size: 11px; color: #475569; display:block; margin-bottom:6px;">${loc.desc}</span>
            <a href="${googleMapsUrl}" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; color:#ffffff; background:#4285F4; padding:4px 10px; border-radius:6px; text-decoration:none; box-shadow:0 2px 4px rgba(66,133,244,0.3); transition: background 0.2s;">
              <i class="fa-solid fa-location-dot"></i> Buka di Google Maps
            </a>
          </div>
        `);

      marker.category = loc.category;
      markersList.push(marker);
    });

    // Boundary Polygon Desa Ngawen — Koordinat dari Google Maps
    // Sumber: https://maps.app.goo.gl/sN8yUAfaAa3Qerc39 (center: -7.6030, 110.2683)
    const boundaryCoords = [
      [-7.5965, 110.2640],
      [-7.5970, 110.2740],
      [-7.6020, 110.2760],
      [-7.6090, 110.2740],
      [-7.6100, 110.2640],
      [-7.6050, 110.2610]
    ];

    L.polygon(boundaryCoords, {
      color: '#165b36',
      fillColor: '#22c55e',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '6, 4'
    }).addTo(map).bindTooltip("Batas Wilayah Desa Ngawen, Kec. Muntilan", { permanent: false });

    // Map Category Filter Handler
    const mapFilterBtns = document.querySelectorAll('.map-filter-btn');
    mapFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        mapFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter');
        markersList.forEach(marker => {
          if (filter === 'all' || marker.category === filter) {
            map.addLayer(marker);
          } else {
            map.removeLayer(marker);
          }
        });
      });
    });

    window.addEventListener('resize', () => {
      if (map) {
        setTimeout(() => { map.invalidateSize(); }, 300);
      }
    });
  }

  // =========================================================
  // 6. Chart.js Donut Charts with Clean Formatted Labels
  // =========================================================

  function updateChartTheme(isDark) {
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const borderColor = isDark ? '#0b1a10' : '#ffffff';

    if (potensiChartInstance && potensiChartInstance.data && potensiChartInstance.data.datasets && potensiChartInstance.data.datasets[0]) {
      if (potensiChartInstance.options && potensiChartInstance.options.plugins && potensiChartInstance.options.plugins.legend && potensiChartInstance.options.plugins.legend.labels) {
        potensiChartInstance.options.plugins.legend.labels.color = textColor;
      }
      potensiChartInstance.data.datasets[0].borderColor = borderColor;
      potensiChartInstance.update();
    }
    if (landUseChartInstance && landUseChartInstance.data && landUseChartInstance.data.datasets && landUseChartInstance.data.datasets[0]) {
      if (landUseChartInstance.options && landUseChartInstance.options.plugins && landUseChartInstance.options.plugins.legend && landUseChartInstance.options.plugins.legend.labels) {
        landUseChartInstance.options.plugins.legend.labels.color = textColor;
      }
      landUseChartInstance.data.datasets[0].borderColor = borderColor;
      landUseChartInstance.update();
    }
  }

  // Function to render Standalone SVG Donut Chart Fallback
  function renderSvgDonut(container, centerLabel, centerSub, slices) {
    if (!container) return;
    const existingSvg = container.querySelector('.standalone-donut-svg');
    if (existingSvg) existingSvg.remove();

    let accumulatedOffset = 0;
    const circlesHTML = slices.map(s => {
      const dashArray = `${s.pct} ${100 - s.pct}`;
      const dashOffset = -accumulatedOffset;
      accumulatedOffset += s.pct;
      return `<circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="${s.color}" stroke-width="5" stroke-dasharray="${dashArray}" stroke-dashoffset="${dashOffset}" style="transition: stroke-dashoffset 0.8s ease;"></circle>`;
    }).join('');

    const svgHTML = `
      <div class="standalone-donut-svg" style="width:100%; height:100%; min-height:180px; display:flex; align-items:center; justify-content:center; position:relative;">
        <svg viewBox="0 0 42 42" style="width:100%; height:100%; max-height:180px; transform: rotate(-90deg);">
          ${circlesHTML}
        </svg>
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center; pointer-events:none;">
          <div style="font-size:1.15rem; font-weight:800; color:var(--slate-900); line-height:1;">${centerLabel}</div>
          <div style="font-size:0.68rem; font-weight:600; color:var(--slate-500); margin-top:2px;">${centerSub}</div>
        </div>
      </div>
    `;

    const canvasEl = container.querySelector('canvas');
    if (canvasEl) canvasEl.style.display = 'none';
    container.insertAdjacentHTML('beforeend', svgHTML);
  }

  function initCharts() {
    const isDarkInitial = document.documentElement.getAttribute('data-theme') === 'dark';
    const cmsData = (window.cmsEngine && window.cmsEngine.data) ? window.cmsEngine.data : null;

    // Dynamic Chart Data Values
    const potPariwisata = (cmsData && cmsData.potensi && cmsData.potensi.sebaranChart && cmsData.potensi.sebaranChart.pariwisata !== undefined) ? cmsData.potensi.sebaranChart.pariwisata : 40;
    const potPertanian = (cmsData && cmsData.potensi && cmsData.potensi.sebaranChart && cmsData.potensi.sebaranChart.pertanian !== undefined) ? cmsData.potensi.sebaranChart.pertanian : 40;
    const potKerajinan = (cmsData && cmsData.potensi && cmsData.potensi.sebaranChart && cmsData.potensi.sebaranChart.kerajinan !== undefined) ? cmsData.potensi.sebaranChart.kerajinan : 20;

    const lahSawah = (cmsData && cmsData.wilayah && cmsData.wilayah.lahanChart && cmsData.wilayah.lahanChart.sawah !== undefined) ? cmsData.wilayah.lahanChart.sawah : 68.2;
    const lahPemukiman = (cmsData && cmsData.wilayah && cmsData.wilayah.lahanChart && cmsData.wilayah.lahanChart.pemukiman !== undefined) ? cmsData.wilayah.lahanChart.pemukiman : 22.4;
    const lahFasum = (cmsData && cmsData.wilayah && cmsData.wilayah.lahanChart && cmsData.wilayah.lahanChart.fasum !== undefined) ? cmsData.wilayah.lahanChart.fasum : 6.1;
    const lahPerkebunan = (cmsData && cmsData.wilayah && cmsData.wilayah.lahanChart && cmsData.wilayah.lahanChart.perkebunan !== undefined) ? cmsData.wilayah.lahanChart.perkebunan : 3.3;

    // Update Potensi Legend Breakdown List
    const potensiLegendBox = document.getElementById('potensiLegendList');
    if (potensiLegendBox) {
      potensiLegendBox.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.8rem; padding:6px 10px; background:rgba(34,197,94,0.12); border-radius:6px; border-left:3px solid #22c55e;">
          <span style="font-weight:600;"><i class="fa-solid fa-landmark" style="color:#22c55e; margin-right:6px;"></i> Pariwisata &amp; Cagar Budaya</span>
          <span style="font-weight:800; color:#22c55e;">${potPariwisata}%</span>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.8rem; padding:6px 10px; background:rgba(245,158,11,0.12); border-radius:6px; border-left:3px solid #f59e0b;">
          <span style="font-weight:600;"><i class="fa-solid fa-wheat-awn" style="color:#f59e0b; margin-right:6px;"></i> Pertanian &amp; Agrowisata</span>
          <span style="font-weight:800; color:#d97706;">${potPertanian}%</span>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.8rem; padding:6px 10px; background:rgba(2,132,199,0.12); border-radius:6px; border-left:3px solid #0284c7;">
          <span style="font-weight:600;"><i class="fa-solid fa-wrench" style="color:#0284c7; margin-right:6px;"></i> Kerajinan, Kuliner &amp; Transportasi</span>
          <span style="font-weight:800; color:#0284c7;">${potKerajinan}%</span>
        </div>
      `;
    }

    // Update Land Use Legend Breakdown List
    const landLegendBox = document.getElementById('landUseLegendList');
    if (landLegendBox) {
      landLegendBox.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.8rem; padding:6px 10px; background:rgba(34,197,94,0.12); border-radius:6px; border-left:3px solid #22c55e;">
          <span style="font-weight:600;"><i class="fa-solid fa-wheat-awn" style="color:#22c55e; margin-right:6px;"></i> Sawah &amp; Pertanian</span>
          <span style="font-weight:800; color:#22c55e;">${lahSawah}%</span>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.8rem; padding:6px 10px; background:rgba(251,191,36,0.12); border-radius:6px; border-left:3px solid #fbbf24;">
          <span style="font-weight:600;"><i class="fa-solid fa-house-chimney" style="color:#fbbf24; margin-right:6px;"></i> Pemukiman Warga</span>
          <span style="font-weight:800; color:#f59e0b;">${lahPemukiman}%</span>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.8rem; padding:6px 10px; background:rgba(2,132,199,0.12); border-radius:6px; border-left:3px solid #0284c7;">
          <span style="font-weight:600;"><i class="fa-solid fa-building" style="color:#0284c7; margin-right:6px;"></i> Fasilitas Umum &amp; Jalan</span>
          <span style="font-weight:800; color:#0284c7;">${lahFasum}%</span>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.8rem; padding:6px 10px; background:rgba(148,163,184,0.12); border-radius:6px; border-left:3px solid #94a3b8;">
          <span style="font-weight:600;"><i class="fa-solid fa-tree" style="color:#94a3b8; margin-right:6px;"></i> Perkebunan &amp; Lainnya</span>
          <span style="font-weight:800; color:#94a3b8;">${lahPerkebunan}%</span>
        </div>
      `;
    }

    // 1. Potensi Desa Donut Chart
    const potensiCanvas = document.getElementById('potensiChart');
    if (potensiCanvas) {
      const container = potensiCanvas.parentElement;
      if (typeof Chart !== 'undefined') {
        try {
          if (potensiChartInstance) potensiChartInstance.destroy();
          potensiCanvas.style.display = 'block';
          const svgEl = container ? container.querySelector('.standalone-donut-svg') : null;
          if (svgEl) svgEl.remove();

          potensiChartInstance = new Chart(potensiCanvas, {
            type: 'doughnut',
            data: {
              labels: ['Pariwisata & Budaya', 'Pertanian & Agrowisata', 'Kerajinan, Kuliner & Transportasi'],
              datasets: [{
                data: [potPariwisata, potPertanian, potKerajinan],
                backgroundColor: ['#22c55e', '#f59e0b', '#0284c7'],
                borderWidth: 3,
                borderColor: isDarkInitial ? '#0b1a10' : '#ffffff',
                hoverOffset: 6
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  padding: 10,
                  backgroundColor: '#0f172a',
                  titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '700' },
                  bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                  callbacks: {
                    label: function (context) { return ` ${context.label}: ${context.raw}%`; }
                  }
                }
              },
              cutout: '68%'
            }
          });
        } catch (e) {
          renderSvgDonut(container, '100%', 'Potensi Desa', [
            { pct: potPariwisata, color: '#22c55e' },
            { pct: potPertanian, color: '#f59e0b' },
            { pct: potKerajinan, color: '#0284c7' }
          ]);
        }
      } else {
        renderSvgDonut(container, '100%', 'Potensi Desa', [
          { pct: potPariwisata, color: '#22c55e' },
          { pct: potPertanian, color: '#f59e0b' },
          { pct: potKerajinan, color: '#0284c7' }
        ]);
      }
    }

    // 2. Tata Guna Lahan Donut Chart
    const landCanvas = document.getElementById('landUseChart');
    if (landCanvas) {
      const container = landCanvas.parentElement;
      if (typeof Chart !== 'undefined') {
        try {
          if (landUseChartInstance) landUseChartInstance.destroy();
          landCanvas.style.display = 'block';
          const svgEl = container ? container.querySelector('.standalone-donut-svg') : null;
          if (svgEl) svgEl.remove();

          landUseChartInstance = new Chart(landCanvas, {
            type: 'doughnut',
            data: {
              labels: ['Sawah & Pertanian', 'Pemukiman Warga', 'Fasilitas Umum & Jalan', 'Perkebunan & Lainnya'],
              datasets: [{
                data: [lahSawah, lahPemukiman, lahFasum, lahPerkebunan],
                backgroundColor: ['#22c55e', '#fbbf24', '#0284c7', '#94a3b8'],
                borderWidth: 3,
                borderColor: isDarkInitial ? '#0b1a10' : '#ffffff',
                hoverOffset: 6
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  padding: 10,
                  backgroundColor: '#0f172a',
                  titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '700' },
                  bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                  callbacks: {
                    label: function (context) { return ` ${context.label}: ${context.raw}%`; }
                  }
                }
              },
              cutout: '68%'
            }
          });
        } catch (e) {
          renderSvgDonut(container, '', 'Hektar', [
            { pct: lahSawah, color: '#22c55e' },
            { pct: lahPemukiman, color: '#fbbf24' },
            { pct: lahFasum, color: '#0284c7' },
            { pct: lahPerkebunan, color: '#94a3b8' }
          ]);
        }
      } else {
        renderSvgDonut(container, '202.8', 'Hektar', [
          { pct: lahSawah, color: '#22c55e' },
          { pct: lahPemukiman, color: '#fbbf24' },
          { pct: lahFasum, color: '#0284c7' },
          { pct: lahPerkebunan, color: '#94a3b8' }
        ]);
      }
    }
  }

  // Execute initCharts immediately & schedule retry
  initCharts();
  setTimeout(initCharts, 500);
  setTimeout(initCharts, 1500);

  // =========================================================
  // 7. Universal Modal Controller & Content Handler
  // =========================================================
  const universalModal = document.getElementById('universalModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalFooterCloseBtn = document.getElementById('modalFooterCloseBtn');
  const openPengaduanBtn = document.getElementById('openPengaduanBtn');

  const modalDetails = {
    stunting: {
      title: 'Program Penanganan Stunting Terpadu',
      body: `
        <div style="text-align:center; margin-bottom:16px;">
          <i class="fa-solid fa-baby" style="font-size:3rem; color:var(--brand-700);"></i>
        </div>
        <p>Program Penanganan Stunting Desa Ngawen dilaksanakan secara rutin melingkupi pemenuhan gizi balita, pemberian nutrisi tambahan berupa PMT (Pemberian Makanan Tambahan), serta pendampingan kesehatan ibu hamil.</p>
        <br>
        <h4 style="font-size:0.95rem; font-weight:700; color:var(--slate-900);">Jadwal & Target Pelayanan:</h4>
        <ul style="margin-top:8px; padding-left:20px; font-size:0.85rem; color:var(--slate-600);">
          <li>Pelaksanaan: Setiap Minggu Ke-2 & Ke-4 Bulan</li>
          <li>Sasaran: Balita Usia 0–5 Tahun & Ibu Hamil</li>
          <li>Fasilitas: Pemeriksaan Tinggi/Berat Badan, Vitamin A, dan Konseling Gizi Gratis.</li>
        </ul>
      `
    },
    waluyo: {
      title: 'Posyandu Waluyo Jiwo (Layanan Lansia)',
      body: `
        <div style="text-align:center; margin-bottom:16px;">
          <i class="fa-solid fa-heart-pulse" style="font-size:3rem; color:var(--gold-600);"></i>
        </div>
        <p>Posyandu Waluyo Jiwo fokus pada pemeliharaan kebugaran fisik dan kesehatan mental para wargalansia Desa Ngawen agar tetap aktif, sehat, dan mandiri.</p>
        <br>
        <h4 style="font-size:0.95rem; font-weight:700; color:var(--slate-900);">Fasilitas Layanan Terpadu:</h4>
        <ul style="margin-top:8px; padding-left:20px; font-size:0.85rem; color:var(--slate-600);">
          <li>Pemeriksaan Tekanan Darah & Gula Darah Berkala</li>
          <li>Senam Kebugaran Lansia Setiap Minggu Pagi</li>
          <li>Pemberian Suplemen & Obat Ringan Gratis</li>
        </ul>
      `
    },
    banksampah: {
      title: 'Bank Sampah & Kebersihan Lingkungan',
      body: `
        <div style="text-align:center; margin-bottom:16px;">
          <i class="fa-solid fa-recycle" style="font-size:3rem; color:var(--brand-600);"></i>
        </div>
        <p>Gerakan Bank Sampah Desa Ngawen mengedukasi warga dalam memilah sampah rumah tangga menjadi barang bernilai ekonomi dan pupuk kompos organik.</p>
        <br>
        <h4 style="font-size:0.95rem; font-weight:700; color:var(--slate-900);">Skema Pengelolaan:</h4>
        <ul style="margin-top:8px; padding-left:20px; font-size:0.85rem; color:var(--slate-600);">
          <li>Pemilahan Anorganik (Plastik/Kertas) disetor ke Bank Sampah</li>
          <li>Pengolahan Organik menjadi Kompos untuk Pertanian Tani Lokal</li>
          <li>Kerja Bakti Masal Rutin Antar Rukun Tetangga (RT)</li>
        </ul>
      `
    },
    festival: {
      title: 'Festival Budaya Candi Ngawen',
      body: `
        <div style="text-align:center; margin-bottom:16px;">
          <i class="fa-solid fa-masks-theater" style="font-size:3rem; color:var(--gold-500);"></i>
        </div>
        <p>Agenda tahunan parade seni budaya masyarakat memperingati sejarah Candi Ngawen abad ke-8. Menampilkan pertunjukan tarian tradisional, pameran UMKM, dan pasar rakyat.</p>
        <br>
        <h4 style="font-size:0.95rem; font-weight:700; color:var(--slate-900);">Rangkaian Acara Utama:</h4>
        <ul style="margin-top:8px; padding-left:20px; font-size:0.85rem; color:var(--slate-600);">
          <li>KIRAB BUDAYA BERAS & SEGO WIWIT</li>
          <li>Pentas Seni Tari & Karawitan Pemuda Desa</li>
          <li>Bazar Produk Kerajinan & Kuliner Tradisional Ngawen</li>
        </ul>
      `
    }
  };

  function openModal(titleText, bodyHTML) {
    if (universalModal) {
      if (modalTitle) modalTitle.innerText = titleText;
      if (modalBody) modalBody.innerHTML = bodyHTML;
      universalModal.classList.add('active');
      universalModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    if (universalModal) {
      universalModal.classList.remove('active');
      universalModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  // Click handler for data-modal elements
  document.querySelectorAll('[data-modal]').forEach(item => {
    item.addEventListener('click', () => {
      const modalKey = item.getAttribute('data-modal');
      if (modalDetails[modalKey]) {
        openModal(modalDetails[modalKey].title, modalDetails[modalKey].body);
      }
    });
  });

  // Dynamic Siskeudes APBDes and JDIH Modal Triggers
  document.addEventListener('click', (e) => {
    const siskeudesCard = e.target.closest('[data-modal="siskeudes"]');
    if (siskeudesCard) {
      e.preventDefault();
      const k = (window.cmsEngine && window.cmsEngine.data && window.cmsEngine.data.keuangan) ? window.cmsEngine.data.keuangan : {
        tahunAnggaran: "2026",
        pendapatanTotal: "Rp 1.850.420.000",
        belanjaTotal: "Rp 1.820.150.000",
        pembiayaanNetto: "Rp 30.270.000",
        sumberPendapatan: [
          { kategori: "Dana Desa (DD)", jumlah: "Rp 980.500.000", persen: "53%" },
          { kategori: "Alokasi Dana Desa (ADD)", jumlah: "Rp 540.200.000", persen: "29%" },
          { kategori: "Bagi Hasil Pajak & Retribusi", jumlah: "Rp 185.000.000", persen: "10%" },
          { kategori: "Pendapatan Asli Desa (PADes)", jumlah: "Rp 144.720.000", persen: "8%" }
        ],
        alokasiBelanja: [
          { bidang: "Penyelenggaraan Pemerintahan Desa", jumlah: "Rp 620.000.000" },
          { bidang: "Pelaksanaan Pembangunan Desa", jumlah: "Rp 710.150.000" },
          { bidang: "Pembinaan Kemasyarakatan Desa", jumlah: "Rp 195.000.000" },
          { bidang: "Pemberdayaan Masyarakat & UMKM/Desa Wisata", jumlah: "Rp 245.000.000" },
          { bidang: "Penanggulangan Bencana & Emergency", jumlah: "Rp 50.000.000" }
        ],
        catatan: "Transparansi APBDes Desa Ngawen sesuai ketentuan Siskeudes Kemendagri & Kemenkeu RI."
      };

      const bodyHTML = `
        <div style="text-align:center; margin-bottom:16px;">
          <i class="fa-solid fa-file-invoice-dollar" style="font-size:3rem; color:var(--brand-700);"></i>
          <h3 style="font-size:1.2rem; font-weight:800; color:var(--slate-900); margin-top:8px;">Transparansi APBDes Tahun ${k.tahunAnggaran || '2026'}</h3>
          <p style="font-size:0.85rem; color:var(--slate-600);">${k.catatan || ''}</p>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:20px;">
          <div style="padding:12px; background:rgba(34,197,94,0.12); border-radius:10px; border-left:4px solid #22c55e;">
            <div style="font-size:0.75rem; color:var(--slate-500); font-weight:700;">Pendapatan Desa</div>
            <div style="font-size:0.95rem; font-weight:800; color:#15803d; margin-top:2px;">${k.pendapatanTotal || 'Rp 1.850.420.000'}</div>
          </div>
          <div style="padding:12px; background:rgba(239,68,68,0.12); border-radius:10px; border-left:4px solid #ef4444;">
            <div style="font-size:0.75rem; color:var(--slate-500); font-weight:700;">Belanja Desa</div>
            <div style="font-size:0.95rem; font-weight:800; color:#b91c1c; margin-top:2px;">${k.belanjaTotal || 'Rp 1.820.150.000'}</div>
          </div>
          <div style="padding:12px; background:rgba(2,132,199,0.12); border-radius:10px; border-left:4px solid #0284c7;">
            <div style="font-size:0.75rem; color:var(--slate-500); font-weight:700;">Pembiayaan Netto</div>
            <div style="font-size:0.95rem; font-weight:800; color:#0369a1; margin-top:2px;">${k.pembiayaanNetto || 'Rp 30.270.000'}</div>
          </div>
        </div>

        <h4 style="font-size:0.9rem; font-weight:800; color:var(--slate-900); margin-bottom:8px;">Rincian Sumber Pendapatan:</h4>
        <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:16px;">
          ${(k.sumberPendapatan || []).map(s => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-surface-alt, #f8fafc); border-radius:8px; font-size:0.82rem;">
              <span style="font-weight:600;"><i class="fa-solid fa-circle-check" style="color:#22c55e; margin-right:6px;"></i> ${s.kategori}</span>
              <span style="font-weight:800; color:var(--brand-900);">${s.jumlah} (${s.persen})</span>
            </div>
          `).join('')}
        </div>

        <h4 style="font-size:0.9rem; font-weight:800; color:var(--slate-900); margin-bottom:8px;">Rincian Alokasi Belanja:</h4>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${(k.alokasiBelanja || []).map(b => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-surface-alt, #f8fafc); border-radius:8px; font-size:0.82rem;">
              <span style="font-weight:600;"><i class="fa-solid fa-angle-right" style="color:var(--gold-600); margin-right:6px;"></i> ${b.bidang}</span>
              <span style="font-weight:800; color:var(--slate-900);">${b.jumlah}</span>
            </div>
          `).join('')}
        </div>
      `;

      openModal('Transparansi Siskeudes APBDes Desa Ngawen', bodyHTML);
    }

    const jdihCard = e.target.closest('[data-modal="jdih"]');
    if (jdihCard) {
      e.preventDefault();
      const docs = (window.cmsEngine && window.cmsEngine.data && window.cmsEngine.data.jdih) ? window.cmsEngine.data.jdih : [
        { nomor: "Perdes No. 01 Tahun 2026", judul: "Peraturan Desa tentang Anggaran Pendapatan dan Belanja Desa (APBDes) Tahun Anggaran 2026", kategori: "Peraturan Desa", status: "Berlaku" },
        { nomor: "Perdes No. 03 Tahun 2025", judul: "Peraturan Desa tentang Pengelolaan dan Pengembangan Desa Wisata Ngawen", kategori: "Peraturan Desa", status: "Berlaku" },
        { nomor: "Perkel No. 02 Tahun 2025", judul: "Peraturan Kepala Desa tentang Tata Cara Pengelolaan Sampah dan Pembentukan Bank Sampah Desa", kategori: "Peraturan Kepala Desa", status: "Berlaku" },
        { nomor: "Keputusan Kades No. 05/2025", judul: "Keputusan Kepala Desa tentang Pembentukan Tim Pendamping Posyandu Integrasi Layanan Primer (ILP)", kategori: "Keputusan Kepala Desa", status: "Berlaku" }
      ];

      const bodyHTML = `
        <div style="text-align:center; margin-bottom:16px;">
          <i class="fa-solid fa-gavel" style="font-size:3rem; color:var(--gold-600);"></i>
          <h3 style="font-size:1.2rem; font-weight:800; color:var(--slate-900); margin-top:8px;">JDIH — Katalog Peraturan & Keputusan Desa</h3>
          <p style="font-size:0.85rem; color:var(--slate-600);">Jaringan Dokumentasi dan Informasi Hukum Pemerintah Desa Ngawen</p>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          ${docs.map(doc => `
            <div style="padding:14px; background:var(--bg-surface-alt, #f8fafc); border:1px solid var(--border-light, #e2e8f0); border-radius:10px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-size:0.8rem; font-weight:800; color:var(--brand-800);">${doc.nomor}</span>
                <span style="font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:12px; background:#d1fae5; color:#065f46;">${doc.status || 'Berlaku'}</span>
              </div>
              <h4 style="font-size:0.88rem; font-weight:700; color:var(--slate-900); line-height:1.4; margin-bottom:8px;">${doc.judul}</h4>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.75rem; color:var(--slate-500); font-weight:600;"><i class="fa-solid fa-file-contract" style="margin-right:4px;"></i> ${doc.kategori}</span>
                <a href="#" onclick="alert('File dokumen resmi dapat diunduh di Balai Desa Ngawen / Portal JDIH Kab. Magelang.'); return false;" style="font-size:0.78rem; font-weight:700; color:var(--brand-700); text-decoration:none;"><i class="fa-solid fa-download"></i> Unduh PDF</a>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      openModal('JDIH — Dokumentasi Peraturan Desa Ngawen', bodyHTML);
    }
  });

  // 7. Pengaduan Warga, Cek Status & Layanan Surat Modals
  const openCekStatusBtn = document.getElementById('openCekStatusBtn');
  const openLayananSuratBtn = document.getElementById('openLayananSuratBtn');

  // A. Form Buat Pengaduan Warga
  if (openPengaduanBtn) {
    openPengaduanBtn.addEventListener('click', () => {
      const formHTML = `
        <form id="pengaduanForm">
          <div class="form-group">
            <label for="namaWarga">Nama Lengkap</label>
            <input type="text" id="namaWarga" class="form-input" placeholder="Masukkan nama Anda..." required>
          </div>
          <div class="form-group">
            <label for="dusunWarga">Dusun Tempat Tinggal</label>
            <select id="dusunWarga" class="form-input" required>
              <option value="">-- Pilih Dusun --</option>
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
            <label for="kategoriLaporan">Kategori Aspirasi / Pengaduan</label>
            <select id="kategoriLaporan" class="form-input" required>
              <option value="Fasilitas Publik & Jalan">Fasilitas Publik & Jalan</option>
              <option value="Pelayanan Administrasi">Pelayanan Administrasi Desa</option>
              <option value="Kesehatan & Posyandu">Kesehatan & Posyandu</option>
              <option value="Kebersihan & Lingkungan">Kebersihan & Lingkungan</option>
              <option value="Saran & Masukan">Saran & Masukan Umum</option>
            </select>
          </div>
          <div class="form-group">
            <label for="isiAspirasi">Isi Laporan / Aspirasi</label>
            <textarea id="isiAspirasi" class="form-textarea" rows="4" placeholder="Tuliskan aspirasi atau laporan Anda secara jelas..." required></textarea>
          </div>
          <button type="submit" class="btn-submit-form"><i class="fa-solid fa-paper-plane"></i> Kirim Laporan Warga</button>
        </form>
      `;
      openModal('Layanan Aspirasi & Pengaduan Warga', formHTML);

      // Bind Submit Event
      setTimeout(() => {
        const formElement = document.getElementById('pengaduanForm');
        if (formElement) {
          formElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nama = document.getElementById('namaWarga').value.trim();
            const dusun = document.getElementById('dusunWarga').value;
            const kategori = document.getElementById('kategoriLaporan').value;
            const isi = document.getElementById('isiAspirasi').value.trim();

            const cms = window.cmsEngine;
            const newReport = await cms.addLaporan({ nama, dusun, kategori, isi });

            if (modalBody) {
              modalBody.innerHTML = `
                <div class="form-success-toast" style="text-align:center; padding:10px 0;">
                  <i class="fa-solid fa-circle-check" style="font-size:3rem; color:#10b981; margin-bottom:12px; display:block;"></i>
                  <h3 style="margin-bottom:6px; color:var(--slate-800);">Laporan Berhasil Terkirim!</h3>
                  <p style="font-size:0.9rem; color:var(--slate-600); margin-bottom:16px;">Terima kasih. Laporan Anda telah dicatat di database CMS Desa Ngawen.</p>
                  
                  <div style="background:#f1f5f9; padding:16px; border-radius:10px; border:2px dashed #cbd5e1; margin-bottom:20px; display:inline-block; width:100%; max-width:380px;">
                    <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Kode Tiket Tracking Anda</div>
                    <div style="font-size:1.6rem; font-weight:800; color:#0f3822; letter-spacing:1px; margin:4px 0;" id="ticketCodeVal">${newReport.trackingCode}</div>
                    <div style="font-size:0.75rem; color:#475569;">Simpan kode tiket ini untuk mengecek status tindak lanjut desa.</div>
                    <button type="button" id="copyTicketBtn" style="margin-top:10px; background:#0f3822; color:#fff; border:none; padding:6px 14px; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer;">
                      <i class="fa-solid fa-copy"></i> Salin Kode Tiket
                    </button>
                  </div>
                </div>
              `;

              document.getElementById('copyTicketBtn').addEventListener('click', () => {
                navigator.clipboard.writeText(newReport.trackingCode);
                alert('Kode Tiket berhasil disalin: ' + newReport.trackingCode);
              });
            }
          });
        }
      }, 50);
    });
  }

  // B. Cek Status Laporan Warga
  if (openCekStatusBtn) {
    openCekStatusBtn.addEventListener('click', () => {
      const searchHTML = `
        <div style="margin-bottom: 20px;">
          <label style="font-weight:600; font-size:0.9rem; display:block; margin-bottom:8px; color:var(--slate-700);">Masukkan Kode Tiket Laporan</label>
          <div style="display:flex; gap:10px;">
            <input type="text" id="inputTrackingCode" class="form-input" placeholder="Contoh: LAP-2026-8801 atau nama Anda" style="flex:1;">
            <button type="button" id="btnSearchTracking" class="btn-submit-form" style="width:auto; padding:0 20px;">
              <i class="fa-solid fa-magnifying-glass"></i> Cari
            </button>
          </div>
        </div>
        <div id="trackingResultArea">
          <div style="text-align:center; padding:30px 10px; color:#94a3b8;">
            <i class="fa-solid fa-receipt" style="font-size:2.5rem; margin-bottom:10px; opacity:0.6;"></i>
            <p style="font-size:0.9rem;">Masukkan kode tiket atau nama pelapor untuk melacak progres penanganan.</p>
          </div>
        </div>
      `;
      openModal('Cek Status & Transparansi Laporan Warga', searchHTML);

      setTimeout(() => {
        const btnSearch = document.getElementById('btnSearchTracking');
        const inputCode = document.getElementById('inputTrackingCode');
        const resultArea = document.getElementById('trackingResultArea');

        function doSearch() {
          const rawQuery = inputCode.value.trim();
          if (!rawQuery) return;
          const cms = window.cmsEngine;
          const laporanList = (cms.data && cms.data.laporan) ? cms.data.laporan : [];

          const matched = laporanList.filter(l =>
            l.trackingCode.toLowerCase().includes(rawQuery.toLowerCase()) ||
            l.nama.toLowerCase().includes(rawQuery.toLowerCase()) ||
            l.isi.toLowerCase().includes(rawQuery.toLowerCase())
          );

          resultArea.replaceChildren(); // Clear existing content using DOM API

          if (matched.length === 0) {
            const errBox = document.createElement('div');
            errBox.style.cssText = 'background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:16px; border-radius:10px; text-align:center;';

            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-circle-exclamation';
            icon.style.cssText = 'font-size:1.8rem; margin-bottom:6px;';

            const title = document.createElement('div');
            title.style.fontWeight = '700';
            title.textContent = 'Laporan Tidak Ditemukan';

            const sub = document.createElement('div');
            sub.style.cssText = 'font-size:0.85rem; margin-top:4px;';
            sub.textContent = `Tidak ada laporan dengan kode atau nama "${rawQuery}". Pastikan kode tiket Anda benar.`;

            errBox.append(icon, title, sub);
            resultArea.appendChild(errBox);
            return;
          }

          matched.forEach(item => {
            const card = document.createElement('div');
            card.style.cssText = 'background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:16px;';

            // Header row
            const headerRow = document.createElement('div');
            headerRow.style.cssText = 'display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; flex-wrap:wrap; gap:8px;';

            const leftHeader = document.createElement('div');
            const codeBadge = document.createElement('span');
            codeBadge.style.cssText = 'font-size:0.75rem; font-weight:800; background:#0f3822; color:#fff; padding:3px 8px; border-radius:4px;';
            codeBadge.textContent = item.trackingCode;

            const dateSpan = document.createElement('span');
            dateSpan.style.cssText = 'font-size:0.8rem; color:#64748b; margin-left:8px;';
            const dateIcon = document.createElement('i');
            dateIcon.className = 'fa-regular fa-calendar';
            dateSpan.append(dateIcon, document.createTextNode(` ${item.tanggal}`));

            leftHeader.append(codeBadge, dateSpan);

            const statusBadge = document.createElement('span');
            statusBadge.style.cssText = 'font-size:0.8rem; font-weight:700; padding:4px 10px; border-radius:20px;';
            const statusIcon = document.createElement('i');

            if (item.status === 'Diproses') {
              statusBadge.style.cssText += 'background:#dbeafe; color:#1e40af; border:1px solid #93c5fd;';
              statusIcon.className = 'fa-solid fa-spinner fa-spin';
            } else if (item.status === 'Selesai') {
              statusBadge.style.cssText += 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;';
              statusIcon.className = 'fa-solid fa-circle-check';
            } else if (item.status === 'Ditolak') {
              statusBadge.style.cssText += 'background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;';
              statusIcon.className = 'fa-solid fa-circle-xmark';
            } else {
              statusBadge.style.cssText += 'background:#fef3c7; color:#92400e; border:1px solid #fcd34d;';
              statusIcon.className = 'fa-regular fa-clock';
            }
            statusBadge.append(statusIcon, document.createTextNode(` ${item.status}`));
            headerRow.append(leftHeader, statusBadge);

            // User Info
            const userInfo = document.createElement('div');
            userInfo.style.cssText = 'font-size:0.9rem; color:#334155; margin-bottom:10px;';

            const nameBold = document.createElement('strong');
            nameBold.textContent = item.nama;

            const catEm = document.createElement('em');
            catEm.style.color = '#64748b';
            catEm.textContent = item.kategori;

            userInfo.append(nameBold, document.createTextNode(` (${item.dusun}) — `), catEm);

            // Content box
            const contentBox = document.createElement('div');
            contentBox.style.cssText = 'background:#ffffff; border:1px solid #e2e8f0; padding:12px; border-radius:8px; font-size:0.88rem; color:#475569; margin-bottom:12px;';
            contentBox.textContent = `"${item.isi}"`;

            card.append(headerRow, userInfo, contentBox);

            // Response Box
            if (item.tanggapanAdmin) {
              const respBox = document.createElement('div');
              respBox.style.cssText = 'background:#ecfdf5; border-left:4px solid #10b981; padding:12px; border-radius:4px; margin-top:10px;';

              const respHeader = document.createElement('div');
              respHeader.style.cssText = 'font-size:0.8rem; font-weight:800; color:#065f46; margin-bottom:4px; display:flex; align-items:center; gap:6px;';
              const respIcon = document.createElement('i');
              respIcon.className = 'fa-solid fa-building-columns';
              respHeader.append(respIcon, document.createTextNode(' Tanggapan Resmi Pemerintah Desa Ngawen'));

              const respBody = document.createElement('div');
              respBody.style.cssText = 'font-size:0.85rem; color:#047857;';
              respBody.textContent = item.tanggapanAdmin;

              respBox.append(respHeader, respBody);

              if (item.tanggalTanggapan) {
                const respDate = document.createElement('div');
                respDate.style.cssText = 'font-size:0.7rem; color:#059669; margin-top:4px; text-align:right;';
                respDate.textContent = `— Dibalas pada ${item.tanggalTanggapan}`;
                respBox.appendChild(respDate);
              }
              card.appendChild(respBox);
            } else {
              const pendingBox = document.createElement('div');
              pendingBox.style.cssText = 'font-size:0.8rem; color:#94a3b8; font-style:italic;';
              const infoIcon = document.createElement('i');
              infoIcon.className = 'fa-solid fa-info-circle';
              pendingBox.append(infoIcon, document.createTextNode(' Belum ada tanggapan resmi dari perangkat desa. Laporan Anda sedang dalam antrean penanganan.'));
              card.appendChild(pendingBox);
            }

            resultArea.appendChild(card);
          });
        }

        if (btnSearch) btnSearch.addEventListener('click', doSearch);
        if (inputCode) {
          inputCode.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') doSearch();
          });
        }
      }, 50);
    });
  }

  // C. Modal Syarat & Layanan Surat Digital
  if (openLayananSuratBtn) {
    openLayananSuratBtn.addEventListener('click', () => {
      const cms = window.cmsEngine;
      const layananList = (cms.data && cms.data.layananSurat) ? cms.data.layananSurat : [];

      let listHTML = '<div style="display:flex; flex-direction:column; gap:14px;">';
      layananList.forEach(item => {
        listHTML += `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
              <div style="width:40px; height:40px; background:#0f3822; color:#fff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
                <i class="${item.icon}"></i>
              </div>
              <div>
                <h4 style="margin:0; font-size:1rem; color:#0f172a;">${item.nama} (${item.kode})</h4>
                <div style="font-size:0.78rem; color:#64748b;"><i class="fa-regular fa-clock"></i> Estimasi Proses: ${item.estimasi} &bull; Kategori: ${item.kategori}</div>
              </div>
            </div>
            <div style="font-size:0.83rem; font-weight:700; color:#334155; margin-bottom:6px;">Persyaratan Dokumen:</div>
            <ul style="margin:0; padding-left:20px; font-size:0.83rem; color:#475569;">
              ${item.persyaratan.map(p => `<li style="margin-bottom:3px;">${p}</li>`).join('')}
            </ul>
          </div>
        `;
      });
      listHTML += '</div>';

      openModal('Panduan & Syarat Layanan Surat Digital Desa', listHTML);
    });
  }

  // D. Permohonan Surat Online Modal Form
  const openPermohonanSuratBtn = document.getElementById('openPermohonanSuratBtn');
  if (openPermohonanSuratBtn) {
    openPermohonanSuratBtn.addEventListener('click', () => {
      const cms = window.cmsEngine;
      const layananList = (cms.data && cms.data.layananSurat) ? cms.data.layananSurat : [];

      const optionsHTML = layananList.map(l => `<option value="${l.nama}" data-kode="${l.kode}">${l.nama} (${l.kode})</option>`).join('') || `
        <option value="Surat Keterangan Usaha">Surat Keterangan Usaha (SKU)</option>
        <option value="Surat Keterangan Domisili">Surat Keterangan Domisili (SKD)</option>
        <option value="Surat Pengantar SKCK">Surat Pengantar SKCK</option>
        <option value="Surat Keterangan Tidak Mampu">Surat Keterangan Tidak Mampu (SKTM)</option>
      `;

      const formHTML = `
        <form id="permohonanSuratForm">
          <div class="form-group">
            <label for="reqNamaWarga">Nama Lengkap Sesuai KTP</label>
            <input type="text" id="reqNamaWarga" class="form-input" placeholder="Nama lengkap..." required>
          </div>
          <div class="form-group">
            <label for="reqNikWarga">Nomor Induk Kependudukan (NIK)</label>
            <input type="text" id="reqNikWarga" class="form-input" placeholder="16 digit NIK..." maxlength="16" required>
          </div>
          <div class="form-group">
            <label for="reqDusunWarga">Dusun Tempat Tinggal</label>
            <select id="reqDusunWarga" class="form-input" required>
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
            <label for="reqNohpWarga">No. WhatsApp / HP Aktif</label>
            <input type="tel" id="reqNohpWarga" class="form-input" placeholder="0812-xxxx-xxxx" required>
          </div>
          <div class="form-group">
            <label for="reqJenisSurat">Jenis Surat Yang Dimohonkan</label>
            <select id="reqJenisSurat" class="form-input" required>
              ${optionsHTML}
            </select>
          </div>
          <div class="form-group">
            <label for="reqKeperluan">Maksud / Keperluan Permohonan Surat</label>
            <textarea id="reqKeperluan" class="form-textarea" rows="3" placeholder="Tuliskan alasan/keperluan pengajuan surat ini..." required></textarea>
          </div>
          <button type="submit" class="btn-submit-form"><i class="fa-solid fa-paper-plane"></i> Ajukan Permohonan Surat Online</button>
        </form>
      `;

      openModal('Permohonan Surat Digital Online Desa Ngawen', formHTML);

      setTimeout(() => {
        const formEl = document.getElementById('permohonanSuratForm');
        if (formEl) {
          formEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nama = document.getElementById('reqNamaWarga').value.trim();
            const nik = document.getElementById('reqNikWarga').value.trim();
            const dusun = document.getElementById('reqDusunWarga').value;
            const nohp = document.getElementById('reqNohpWarga').value.trim();
            const jenisSelect = document.getElementById('reqJenisSurat');
            const jenisSurat = jenisSelect.value;
            const kodeSurat = jenisSelect.options[jenisSelect.selectedIndex]?.getAttribute('data-kode') || 'SK';
            const keperluan = document.getElementById('reqKeperluan').value.trim();

            const newReq = await window.cmsEngine.addSuratRequest({
              nama, nik, dusun, nohp, jenisSurat, kodeSurat, keperluan
            });

            if (modalBody) {
              modalBody.innerHTML = `
                <div style="text-align:center; padding:10px 0;">
                  <i class="fa-solid fa-circle-check" style="font-size:3rem; color:#10b981; margin-bottom:12px; display:block;"></i>
                  <h3 style="margin-bottom:6px; color:var(--slate-800);">Permohonan Surat Berhasil Dikirim!</h3>
                  <p style="font-size:0.88rem; color:var(--slate-600); margin-bottom:16px;">Permohonan ${newReq.jenisSurat} Anda telah diterima oleh perangkat desa.</p>
                  
                  <div style="background:#f1f5f9; padding:16px; border-radius:10px; border:2px dashed #cbd5e1; margin-bottom:20px; display:inline-block; width:100%; max-width:380px;">
                    <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Kode Tiket Permohonan</div>
                    <div style="font-size:1.6rem; font-weight:800; color:#0f3822; margin:4px 0;">${newReq.requestCode}</div>
                    <div style="font-size:0.75rem; color:#475569;">Bawa NIK / Kode ini saat mengambil surat di Balai Desa.</div>
                    <button type="button" id="copySuratTicketBtn" style="margin-top:10px; background:#0f3822; color:#fff; border:none; padding:6px 14px; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer;">
                      <i class="fa-solid fa-copy"></i> Salin Kode Tiket
                    </button>
                  </div>
                </div>
              `;

              document.getElementById('copySuratTicketBtn').addEventListener('click', () => {
                navigator.clipboard.writeText(newReq.requestCode);
                alert('Kode Tiket Surat disalin: ' + newReq.requestCode);
              });
            }
          });
        }
      }, 50);
    });
  }

  // Live Sync Real-time Listener on Public Site
  if (window.cmsEngine) {
    window.cmsEngine.onRealtimeEvent((evt) => {
      console.log('⚡ Public Site received real-time event:', evt.type);
      initPortal();

      const toastEl = document.getElementById('liveSyncToast');
      if (toastEl) {
        toastEl.style.display = 'flex';
        setTimeout(() => { toastEl.style.display = 'none'; }, 3500);
      }
    });
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalFooterCloseBtn) modalFooterCloseBtn.addEventListener('click', closeModal);
  if (universalModal) {
    universalModal.addEventListener('click', (e) => {
      if (e.target === universalModal) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeMobileDrawer();
    }
  });

  // =========================================================
  // 8. Floating Back-to-Top Button with Scroll Progress
  // =========================================================
  const backToTopBtn = document.getElementById('backToTopBtn');
  const progressCircle = document.querySelector('.progress-ring-circle');

  if (backToTopBtn && progressCircle) {
    const radius = progressCircle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;

    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference;

    function setProgress(percent) {
      const offset = circumference - (percent / 100 * circumference);
      progressCircle.style.strokeDashoffset = offset;
    }

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;

      if (scrollTop > 300) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }

      setProgress(scrollPercent);
    });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPortal);
} else {
  initPortal();
}

/* ============================================================
   BERITA & PENGUMUMAN — Filter, Search & Modal Reader System
   ============================================================ */

const BERITA_KATEGORI_COLORS = {
  'Prestasi': { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  'Pembangunan': { bg: '#dbeafe', color: '#1e3a8a', border: '#93c5fd' },
  'Kesehatan': { bg: '#fce7f3', color: '#9d174d', border: '#f9a8d4' },
  'Kebudayaan': { bg: '#ede9fe', color: '#4c1d95', border: '#c4b5fd' },
  'Lingkungan': { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  'Pelayanan': { bg: '#e0f2fe', color: '#0c4a6e', border: '#7dd3fc' },
  'Berita': { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' }
};

function renderBeritaSection(beritaList, activeFilter, searchQuery, maxLimit = 0) {
  const grid = document.getElementById('beritaCardsGrid');
  const emptyState = document.getElementById('beritaEmptyState');
  if (!grid) return;

  // Apply filter & search
  let filtered = beritaList.filter(b => {
    const matchFilter = (activeFilter === 'Semua') || (b.kategori === activeFilter);
    const q = (searchQuery || '').toLowerCase().trim();
    const matchSearch = !q || b.judul.toLowerCase().includes(q) || (b.ringkasan || '').toLowerCase().includes(q) || (b.kategori || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  if (maxLimit > 0 && !searchQuery && activeFilter === 'Semua') {
    filtered = filtered.slice(0, maxLimit);
  }

  grid.innerHTML = '';

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
    const katStyle = BERITA_KATEGORI_COLORS[kat] || BERITA_KATEGORI_COLORS['Berita'];

    card.innerHTML = `
      <div class="berita-card-img">
        <img src="${imgSrc}" alt="${b.judul}" loading="lazy">
        <span class="berita-kategori-badge" style="background:${katStyle.bg}; color:${katStyle.color}; border:1px solid ${katStyle.border};">${kat}</span>
      </div>
      <div class="berita-card-body">
        <div class="berita-meta">
          <i class="fa-regular fa-calendar"></i> ${dateStr}
          <span class="berita-meta-author"><i class="fa-solid fa-user-pen"></i> ${b.penulis || 'Redaksi'}</span>
        </div>
        <h4 class="berita-card-title">${b.judul}</h4>
        <p class="berita-card-ringkasan">${b.ringkasan || ''}</p>
        <button class="btn-baca-selengkapnya" data-berita-id="${b.id}" type="button">
          <i class="fa-solid fa-book-open"></i> Baca Selengkapnya
        </button>
      </div>`;

    // Clicking card body or button opens modal
    card.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-baca-selengkapnya') || e.target.closest('.berita-card');
      if (btn) openBeritaModal(b.id);
    });

    grid.appendChild(card);
  });
}

function initBeritaControls() {
  // Filter pills
  const pills = document.querySelectorAll('.berita-filter-pill');
  const searchInput = document.getElementById('beritaSearchInput');
  let activeFilter = 'Semua';
  let searchQuery = '';

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.getAttribute('data-filter') || 'Semua';
      renderBeritaSection(window._allBeritaData || [], activeFilter, searchQuery);
    });
  });

  // Live search with debounce
  let searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchQuery = searchInput.value;
        renderBeritaSection(window._allBeritaData || [], activeFilter, searchQuery);
      }, 280);
    });
  }
}

function openBeritaModal(beritaId) {
  const allBerita = window._allBeritaData || [];
  const b = allBerita.find(item => item.id === beritaId);
  if (!b) return;

  const kat = b.kategori || 'Berita';
  const katStyle = BERITA_KATEGORI_COLORS[kat] || BERITA_KATEGORI_COLORS['Berita'];
  const dateStr = b.tanggal
    ? new Date(b.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  // Populate modal fields
  const katEl = document.getElementById('beritaModalKategori');
  if (katEl) {
    katEl.textContent = kat;
    katEl.style.cssText = `background:${katStyle.bg}; color:${katStyle.color}; border:1px solid ${katStyle.border}; padding:3px 10px; border-radius:20px; font-size:0.78rem; font-weight:700; display:inline-block; margin-bottom:8px;`;
  }

  const titleEl = document.getElementById('beritaModalTitle');
  if (titleEl) titleEl.textContent = b.judul;

  const metaEl = document.getElementById('beritaModalMeta');
  if (metaEl) {
    metaEl.innerHTML = `
      <span><i class="fa-regular fa-calendar" style="color:var(--brand-600); margin-right:5px;"></i>${dateStr}</span>
      <span style="margin-left:16px;"><i class="fa-solid fa-user-pen" style="color:var(--brand-600); margin-right:5px;"></i>${b.penulis || 'Redaksi Desa'}</span>`;
  }

  const imgEl = document.getElementById('beritaModalImgWrap');
  if (imgEl) {
    imgEl.innerHTML = `<img src="${b.gambar || 'assets/candi.png'}" alt="${b.judul}" style="width:100%; max-height:360px; object-fit:cover; border-radius:12px; margin:12px 0;">`;
  }

  const isiEl = document.getElementById('beritaModalIsi');
  if (isiEl) {
    // Convert newlines to paragraphs
    const paragraphs = (b.isi || b.ringkasan || '').split(/\n+/).filter(p => p.trim());
    isiEl.innerHTML = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
  }

  // Show modal
  const modal = document.getElementById('beritaModal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

// Berita Modal Close Handlers
(function () {
  function closeBeritaModal() {
    const modal = document.getElementById('beritaModal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#beritaModalCloseBtn') || e.target.closest('#beritaModalFooterClose')) {
      closeBeritaModal();
    }
    // Click outside modal card
    const modal = document.getElementById('beritaModal');
    if (modal && modal.classList.contains('active') && e.target === modal) {
      closeBeritaModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBeritaModal();
  });
})();

/* ============================================================
   Google Maps Embed View Switcher — Global Function
   Toggle antara tampilan Jalan (t=m) dan Satelit (t=k)
   Koordinat: Desa Ngawen, Kec. Muntilan, Kab. Magelang
   Sumber: https://maps.app.goo.gl/sN8yUAfaAa3Qerc39
   ============================================================ */
function switchGmapView(mode) {
  const iframe = document.getElementById('gmapEmbed');
  const btnJalan = document.getElementById('gmapTabJalan');
  const btnSatelit = document.getElementById('gmapTabSatelit');
  if (!iframe) return;

  const baseQuery = 'Ngawen,+Kec.+Muntilan,+Kabupaten+Magelang,+Jawa+Tengah';

  if (mode === 'satelit') {
    iframe.src = `https://maps.google.com/maps?q=${baseQuery}&t=k&z=15&ie=UTF8&iwloc=&output=embed`;
    if (btnSatelit) { btnSatelit.style.background = '#34A853'; btnSatelit.style.color = '#fff'; }
    if (btnJalan) { btnJalan.style.background = 'transparent'; btnJalan.style.color = '#64748b'; }
  } else {
    iframe.src = `https://maps.google.com/maps?q=${baseQuery}&t=m&z=15&ie=UTF8&iwloc=&output=embed`;
    if (btnJalan) { btnJalan.style.background = '#4285F4'; btnJalan.style.color = '#fff'; }
    if (btnSatelit) { btnSatelit.style.background = 'transparent'; btnSatelit.style.color = '#64748b'; }
  }
}

/* ============================================================
   FITUR PETA & DIREKTORI UMKM DESA NGAWEN (14 UMKM)
   ============================================================ */
const UMKM_DATA = [
  {
    id: "umkm-1",
    name: "Kerajinan kerangka layang-layang",
    category: "Kerajinan & Seni",
    filterKey: "kerajinan",
    desc: "Kerajinan bambu & pembuatan kerangka layang-layang tradisional khas Desa Ngawen.",
    mapsUrl: "https://maps.app.goo.gl/FvFTSd4f1ebyCvuB6",
    lat: -7.6025,
    lng: 110.2662,
    icon: "fa-paper-plane",
    color: "linear-gradient(135deg, #7c2d12, #ea580c)",
    badgeBg: "rgba(124, 45, 18, 0.12)",
    badgeColor: "#9a3412",
    address: "Dusun Clapar, Desa Ngawen"
  },
  {
    id: "umkm-2",
    name: "Kesenian Kuda Lumping (Kobro Siswo Gejayan)",
    category: "Kerajinan & Seni",
    filterKey: "kerajinan",
    desc: "Sanggar & Paguyuban Seni Pertunjukan Tradisional Kuda Lumping Kobro Siswo Gejayan.",
    mapsUrl: "https://maps.app.goo.gl/Eb7wPkKavMvUpBpN9",
    lat: -7.6012,
    lng: 110.2695,
    icon: "fa-masks-theater",
    color: "linear-gradient(135deg, #b45309, #d97706)",
    badgeBg: "rgba(180, 83, 9, 0.12)",
    badgeColor: "#b45309",
    address: "Gejayan, Desa Ngawen"
  },
  {
    id: "umkm-3",
    name: "Criping Gethuk Kunanti",
    category: "Kuliner & Jajanan",
    filterKey: "kuliner",
    desc: "Oleh-oleh khas olahan singkong criping gethuk renyah & gurih favorit wisatawan.",
    mapsUrl: "https://maps.app.goo.gl/aWnYsLHAd4TComvTA",
    lat: -7.5998,
    lng: 110.2705,
    icon: "fa-utensils",
    color: "linear-gradient(135deg, #d97706, #f59e0b)",
    badgeBg: "rgba(217, 119, 6, 0.12)",
    badgeColor: "#d97706",
    address: "Kunanti, Desa Ngawen"
  },
  {
    id: "umkm-4",
    name: "Jenang Krasikan",
    category: "Kuliner & Jajanan",
    filterKey: "kuliner",
    desc: "Produsen Jenang & Krasikan manis tradisional olahan beras ketan & gula jawa pilihan.",
    mapsUrl: "https://maps.app.goo.gl/nV2WcMnr81st1qFPA",
    lat: -7.5992,
    lng: 110.2718,
    icon: "fa-cookie-bite",
    color: "linear-gradient(135deg, #92400e, #b45309)",
    badgeBg: "rgba(146, 64, 14, 0.12)",
    badgeColor: "#92400e",
    address: "Citromenggalan, Desa Ngawen"
  },
  {
    id: "umkm-5",
    name: "Pecel Lele",
    category: "Warung & Toko",
    filterKey: "warung",
    desc: "Warung penyetan pecel lele sambal khas dengan lauk segar & harga terjangkau.",
    mapsUrl: "https://maps.app.goo.gl/6gT81975cNKpYdff7",
    lat: -7.6042,
    lng: 110.2678,
    icon: "fa-bowl-food",
    color: "linear-gradient(135deg, #047857, #10b981)",
    badgeBg: "rgba(4, 120, 87, 0.12)",
    badgeColor: "#047857",
    address: "Jalan Utama Desa Ngawen"
  },
  {
    id: "umkm-6",
    name: "Warung Moroseneng",
    category: "Warung & Toko",
    filterKey: "warung",
    desc: "Warung makan keluarga menyajikan masakan dusun tradisional & minuman segar.",
    mapsUrl: "https://maps.app.goo.gl/MaBnHAbS788f78dd7",
    lat: -7.6035,
    lng: 110.2685,
    icon: "fa-shop",
    color: "linear-gradient(135deg, #065f46, #047857)",
    badgeBg: "rgba(6, 95, 70, 0.12)",
    badgeColor: "#065f46",
    address: "Dusun Ngawen Central"
  },
  {
    id: "umkm-7",
    name: "Sosis Gulung",
    category: "Kuliner & Jajanan",
    filterKey: "kuliner",
    desc: "Jajanan sosis gulung mie & telur favorit warga dan anak-anak sekolah.",
    mapsUrl: "https://maps.app.goo.gl/Ny6Rdg2DAyn4q3Hx6",
    lat: -7.6005,
    lng: 110.2722,
    icon: "fa-hotdog",
    color: "linear-gradient(135deg, #ea580c, #f97316)",
    badgeBg: "rgba(234, 88, 12, 0.12)",
    badgeColor: "#ea580c",
    address: "Ngawen Kulon"
  },
  {
    id: "umkm-8",
    name: "Alisya Garden Store",
    category: "Pertanian & Bunga",
    filterKey: "pertanian",
    desc: "Toko bibit tanaman hias, tanaman buah, pupuk, & perlengkapan perkebunan.",
    mapsUrl: "https://maps.app.goo.gl/szUY1RpwdooxvVWK7",
    lat: -7.6062,
    lng: 110.2658,
    icon: "fa-seedling",
    color: "linear-gradient(135deg, #15803d, #22c55e)",
    badgeBg: "rgba(21, 128, 61, 0.12)",
    badgeColor: "#15803d",
    address: "Jl. Raya Ngawen - Muntilan"
  },
  {
    id: "umkm-9",
    name: "Jadah Tempe",
    category: "Kuliner & Jajanan",
    filterKey: "kuliner",
    desc: "Kuliner tradisional jadah ketan gurih dipadu tempe bacem legendaris khas Ngawen.",
    mapsUrl: "https://maps.app.goo.gl/BikAdarfUNCpwXaJ8",
    lat: -7.5988,
    lng: 110.2702,
    icon: "fa-burger",
    color: "linear-gradient(135deg, #b45309, #d97706)",
    badgeBg: "rgba(180, 83, 9, 0.12)",
    badgeColor: "#b45309",
    address: "Citromenggalan, Desa Ngawen"
  },
  {
    id: "umkm-10",
    name: "Ronce Melati",
    category: "Kerajinan & Seni",
    filterKey: "kerajinan",
    desc: "Perajin ronce bunga melati segar untuk manten, acara adat & upacara tradisional.",
    mapsUrl: "https://maps.app.goo.gl/r7GJhU1mogV28xip9",
    lat: -7.6048,
    lng: 110.2692,
    icon: "fa-fan",
    color: "linear-gradient(135deg, #4c1d95, #6d28d9)",
    badgeBg: "rgba(76, 29, 149, 0.12)",
    badgeColor: "#4c1d95",
    address: "Dusun Clapar, Desa Ngawen"
  },
  {
    id: "umkm-11",
    name: "PASTEL",
    category: "Kuliner & Jajanan",
    filterKey: "kuliner",
    desc: "Produksi kue pastel gurih renyah isian bihun, telur & sayur segar pesanan kue basah.",
    mapsUrl: "https://maps.app.goo.gl/rnVVRaULxWpeSbip7",
    lat: -7.6022,
    lng: 110.2735,
    icon: "fa-chart-pie",
    color: "linear-gradient(135deg, #c2410c, #ea580c)",
    badgeBg: "rgba(194, 65, 12, 0.12)",
    badgeColor: "#c2410c",
    address: "Dusun Ngawen Wetan"
  },
  {
    id: "umkm-12",
    name: "Darlung masEmas",
    category: "Kuliner & Jajanan",
    filterKey: "kuliner",
    desc: "Dadar gulung manis isi kelapa gula jawa harum & aneka kue basah hajatan.",
    mapsUrl: "https://maps.app.goo.gl/yW9myLVS2bSUH8X98",
    lat: -7.6015,
    lng: 110.2742,
    icon: "fa-stroopwafel",
    color: "linear-gradient(135deg, #a16207, #ca8a04)",
    badgeBg: "rgba(161, 98, 7, 0.12)",
    badgeColor: "#a16207",
    address: "Ngawen Timur"
  },
  {
    id: "umkm-13",
    name: "Buntil",
    category: "Kuliner & Jajanan",
    filterKey: "kuliner",
    desc: "Masakan olahan daun talas/singkong isi kelapa & parutan teri kuah santan pedas.",
    mapsUrl: "https://maps.app.goo.gl/C8VqaPikDDYdJRgg6",
    lat: -7.6002,
    lng: 110.2672,
    icon: "fa-mortar-pestle",
    color: "linear-gradient(135deg, #15803d, #16a34a)",
    badgeBg: "rgba(21, 128, 61, 0.12)",
    badgeColor: "#15803d",
    address: "Nganten, Desa Ngawen"
  },
  {
    id: "umkm-14",
    name: "Serabi Kocor",
    category: "Kuliner & Jajanan",
    filterKey: "kuliner",
    desc: "Kue serabi tradisional kuah kocor kuah santan gula jawa hangat khas Ngawen.",
    mapsUrl: "https://maps.app.goo.gl/JGQgBU7WfvNuzEZr5",
    lat: -7.6006,
    lng: 110.2675,
    icon: "fa-mug-hot",
    color: "linear-gradient(135deg, #9a3412, #c2410c)",
    badgeBg: "rgba(154, 52, 18, 0.12)",
    badgeColor: "#9a3412",
    address: "Nganten, Desa Ngawen"
  }
];

let mapUmkmInstance = null;
let umkmMarkers = [];

function initUmkmFeature() {
  const cardsGrid = document.getElementById('umkmCardsGrid');
  const searchInput = document.getElementById('umkmSearchInput');
  const filterBtns = document.querySelectorAll('.umkm-filter-btn');
  const emptyState = document.getElementById('umkmEmptyState');
  if (!cardsGrid) return;

  let activeFilter = 'all';
  let searchQuery = '';

  // Render cards
  function renderCards() {
    const filtered = UMKM_DATA.filter(u => {
      const matchFilter = (activeFilter === 'all') || (u.filterKey === activeFilter);
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.desc.toLowerCase().includes(q) || u.category.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });

    cardsGrid.innerHTML = '';

    if (filtered.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      filtered.forEach(u => {
        const card = document.createElement('div');
        card.className = 'umkm-card-item';
        card.setAttribute('data-id', u.id);

        card.innerHTML = `
          <div>
            <div class="umkm-card-top">
              <div class="umkm-card-icon" style="background: ${u.color}">
                <i class="fa-solid ${u.icon}"></i>
              </div>
              <div class="umkm-card-meta">
                <span class="umkm-card-badge" style="background: ${u.badgeBg}; color: ${u.badgeColor}">
                  ${u.category}
                </span>
                <div class="umkm-card-name">${u.name}</div>
              </div>
            </div>
            <div class="umkm-card-desc">${u.desc}</div>
          </div>
          <div class="umkm-card-footer">
            <a href="${u.mapsUrl}" target="_blank" rel="noopener" class="btn-umkm-maps">
              <i class="fa-solid fa-map-location-dot"></i> Buka di Google Maps
            </a>
          </div>`;

        cardsGrid.appendChild(card);
      });
    }

    // Filter map markers if map exists
    if (mapUmkmInstance) {
      umkmMarkers.forEach(m => {
        const u = m._umkmData;
        const matchFilter = (activeFilter === 'all') || (u.filterKey === activeFilter);
        const q = searchQuery.toLowerCase().trim();
        const matchSearch = !q || u.name.toLowerCase().includes(q) || u.desc.toLowerCase().includes(q);
        if (matchFilter && matchSearch) {
          if (!mapUmkmInstance.hasLayer(m)) mapUmkmInstance.addLayer(m);
        } else {
          if (mapUmkmInstance.hasLayer(m)) mapUmkmInstance.removeLayer(m);
        }
      });
    }
  }

  // Init Leaflet map if available
  const mapElem = document.getElementById('mapUmkm');
  if (mapElem && typeof L !== 'undefined' && !mapUmkmInstance) {
    try {
      mapUmkmInstance = L.map('mapUmkm', {
        center: [-7.6020, 110.2690],
        zoom: 15,
        zoomControl: true
      });

      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; <a href="https://maps.google.com">Google Maps</a> | UMKM Desa Ngawen'
      }).addTo(mapUmkmInstance);

      // Add markers
      UMKM_DATA.forEach(u => {
        const customHtml = `<div style="background:${u.badgeColor}; color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 10px rgba(0,0,0,0.3); border:2px solid #fff;"><i class="fa-solid ${u.icon}" style="font-size:14px;"></i></div>`;
        const customIcon = L.divIcon({
          html: customHtml,
          className: 'umkm-custom-marker',
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });

        const popupContent = `
          <div style="font-family:sans-serif; padding:4px; max-width:230px;">
            <div style="font-size:0.7rem; font-weight:800; text-transform:uppercase; color:${u.badgeColor}; margin-bottom:2px;">${u.category}</div>
            <div style="font-size:0.95rem; font-weight:800; color:#0f172a; margin-bottom:4px;">${u.name}</div>
            <div style="font-size:0.8rem; color:#475569; margin-bottom:10px;">${u.desc}</div>
            <a href="${u.mapsUrl}" target="_blank" rel="noopener" style="display:inline-block; width:100%; text-align:center; background:#15803d; color:#fff; font-size:0.78rem; font-weight:700; padding:6px 12px; border-radius:20px; text-decoration:none;">
              <i class="fa-solid fa-map-location-dot"></i> Buka Google Maps
            </a>
          </div>`;

        const marker = L.marker([u.lat, u.lng], { icon: customIcon })
          .bindPopup(popupContent);
        marker._umkmData = u;

        marker.addTo(mapUmkmInstance);
        umkmMarkers.push(marker);
      });

    } catch (e) {
      console.warn("Leaflet map initialization skipped for UMKM:", e);
    }
  }

  // Filter pills events
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter') || 'all';
      renderCards();
    });
  });

  // Search input event
  if (searchInput) {
    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchQuery = searchInput.value;
        renderCards();
      }, 200);
    });
  }

  // Initial render
  renderCards();
}

// Inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  initUmkmFeature();
});
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initUmkmFeature, 100);
}
