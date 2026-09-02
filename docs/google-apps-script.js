/**
 * ============================================================
 *  Desa Ngawen — Google Apps Script Web App
 *  Menerima data dari Laporan Warga & Permohonan Surat Online
 *  dan menyimpannya ke Google Spreadsheet di Google Drive.
 *
 *  CARA DEPLOY:
 *  1. Buka https://script.google.com
 *  2. Buat project baru → New Project
 *  3. Hapus semua kode lama, paste kode ini
 *  4. Klik "Deploy" → "New deployment"
 *  5. Pilih type: "Web app"
 *  6. Execute as: "Me"
 *  7. Who has access: "Anyone"
 *  8. Klik Deploy → Copy URL yang muncul
 *  9. Simpan URL ke environment variable: GOOGLE_SCRIPT_URL
 * ============================================================
 */

// ID folder Google Drive tujuan
const DRIVE_FOLDER_ID = '1-27RqkUg5NwxKhzh1ZP2cAmr_5r4wV20';

// ── Endpoint Utama ────────────────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const type = payload.type;

    if (type === 'laporan') {
      saveLaporan(payload.data);
    } else if (type === 'surat') {
      saveSurat(payload.data);
    } else {
      return jsonResponse({ error: 'Tipe data tidak dikenal: ' + type }, 400);
    }

    return jsonResponse({ success: true, message: 'Data berhasil disimpan ke Google Drive.' });
  } catch (err) {
    return jsonResponse({ error: err.toString() }, 500);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput('✅ Desa Ngawen — Google Apps Script API aktif.')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ── Simpan Laporan Warga ──────────────────────────────────────
function saveLaporan(data) {
  const sheet = getOrCreateSheet('Laporan Warga', [
    'No', 'Kode Laporan', 'Nama', 'Dusun', 'Kategori',
    'Isi Laporan', 'Prioritas', 'Status', 'Tanggal Masuk'
  ]);

  const rowNum = sheet.getLastRow();
  sheet.appendRow([
    rowNum,
    data.trackingCode || '',
    data.nama || '',
    data.dusun || 'Ngawen',
    data.kategori || 'Saran & Masukan',
    data.isi || '',
    data.prioritas || 'Biasa',
    data.status || 'Menunggu Verifikasi',
    data.tanggal || new Date().toLocaleString('id-ID')
  ]);

  // Format baris terakhir
  formatLastRow(sheet, rowNum, '#d1fae5');
}

// ── Simpan Permohonan Surat ───────────────────────────────────
function saveSurat(data) {
  const sheet = getOrCreateSheet('Permohonan Surat', [
    'No', 'Kode Surat', 'Nama', 'NIK', 'Dusun', 'No HP',
    'Jenis Surat', 'Keperluan', 'Detail', 'Status', 'Tanggal Masuk'
  ]);

  const rowNum = sheet.getLastRow();
  sheet.appendRow([
    rowNum,
    data.requestCode || '',
    data.nama || '',
    data.nik || '',
    data.dusun || 'Ngawen',
    data.nohp || '',
    data.jenisSurat || '',
    data.keperluan || '',
    data.detail || '',
    data.status || 'Menunggu Memproses',
    data.tanggal || new Date().toLocaleString('id-ID')
  ]);

  // Format baris terakhir
  formatLastRow(sheet, rowNum, '#dbeafe');
}

// ── Helper: Ambil atau Buat Sheet ─────────────────────────────
function getOrCreateSheet(sheetName, headers) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const fileName = 'Data ' + sheetName + ' — Desa Ngawen';
  let spreadsheet;

  // Cari file yang sudah ada
  const files = folder.getFilesByName(fileName);
  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.open(files.next());
  } else {
    // Buat spreadsheet baru
    spreadsheet = SpreadsheetApp.create(fileName);
    // Pindahkan ke folder Drive yang dituju
    const file = DriveApp.getFileById(spreadsheet.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file); // Keluarkan dari root

    // Tambahkan header
    const sheet = spreadsheet.getActiveSheet();
    sheet.setName(sheetName);
    sheet.appendRow(headers);

    // Format header
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#0f3822');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(11);
    sheet.setFrozenRows(1);

    // Auto-resize kolom
    sheet.autoResizeColumns(1, headers.length);

    return sheet;
  }

  // Ambil sheet yang sudah ada atau buat tab baru
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#0f3822');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

// ── Helper: Format Baris Baru ─────────────────────────────────
function formatLastRow(sheet, rowNum, bgColor) {
  try {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow > 1) {
      const range = sheet.getRange(lastRow, 1, 1, lastCol);
      range.setBackground(rowNum % 2 === 0 ? bgColor : '#ffffff');
      range.setBorder(true, true, true, true, true, true, '#e2e8f0', SpreadsheetApp.BorderStyle.SOLID);
    }
  } catch (e) { /* abaikan error format */ }
}

// ── Helper: JSON Response ─────────────────────────────────────
function jsonResponse(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
