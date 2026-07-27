/* PARFI Jawa Timur CMS - Google Apps Script backend */
const CMS = {
  spreadsheetId: '1Mu_i2-rI1DlKxo39HVQmWmczrnJ5EDd_rELey5L4IVA',
  mediaFolderId: '17v-p-MS4aGGbanTZNHlG4Hy4BwrJRf2V',
  sessionHours: 12,
};

function doGet(e) {
  return json_(dispatch_(e && e.parameter ? e.parameter : {}));
}

function doPost(e) {
  let payload = {};
  try { payload = JSON.parse((e.postData && e.postData.contents) || '{}'); }
  catch (error) { return json_({ ok: false, error: 'Format data tidak valid.' }); }
  return json_(dispatch_(payload));
}

function dispatch_(payload) {
  try {
    const action = String(payload.action || '').toLowerCase();
    if (action === 'public') return { ok: true, items: list_(payload.type, true) };
    if (action === 'login') return login_(payload);
    if (action === 'logout') return logout_(payload.token);

    const session = requireSession_(payload.token);
    if (action === 'list') return { ok: true, items: list_(payload.type, false) };
    if (action === 'save') return save_(payload, session);
    if (action === 'delete') return remove_(payload, session);
    return { ok: false, error: 'Aksi tidak dikenali.' };
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return { ok: false, error: error && error.message ? error.message : 'Terjadi gangguan pada server.' };
  }
}

function login_(payload) {
  const username = clean_(payload.username, 80).toLowerCase();
  const password = String(payload.password || '');
  if (!username || !password) throw new Error('Username dan password wajib diisi.');

  const rows = values_('Admin');
  const headers = rows.shift() || [];
  const index = index_(headers);
  const account = rows.map(row => row_(headers, row)).find(item =>
    String(item.username || '').toLowerCase() === username && String(item.aktif || '').toUpperCase() === 'YA'
  );
  if (!account || account.password_hash !== sha256_(password)) {
    throw new Error('Username atau password salah.');
  }

  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const session = { username: account.username, nama: account.nama || account.username, expires: Date.now() + CMS.sessionHours * 60 * 60 * 1000 };
  PropertiesService.getScriptProperties().setProperty('session_' + token, JSON.stringify(session));
  return { ok: true, token: token, user: { username: session.username, nama: session.nama } };
}

function logout_(token) {
  if (token) PropertiesService.getScriptProperties().deleteProperty('session_' + token);
  return { ok: true };
}

function requireSession_(token) {
  if (!token) throw new Error('Sesi login tidak ditemukan.');
  const store = PropertiesService.getScriptProperties();
  const saved = store.getProperty('session_' + token);
  if (!saved) throw new Error('Sesi sudah berakhir. Silakan login kembali.');
  const session = JSON.parse(saved);
  if (Date.now() > session.expires) {
    store.deleteProperty('session_' + token);
    throw new Error('Sesi sudah berakhir. Silakan login kembali.');
  }
  return session;
}

function list_(type, publishedOnly) {
  const config = typeConfig_(type);
  const rows = values_(config.sheet);
  const headers = rows.shift() || [];
  const items = rows.filter(row => row.some(cell => cell !== '')).map(row => row_(headers, row));
  return items
    .filter(item => !publishedOnly || String(item.status || '').toUpperCase() === 'PUBLISH')
    .sort((a, b) => String(b.updated_at || b.dibuat_pada || '').localeCompare(String(a.updated_at || a.dibuat_pada || '')));
}

function save_(payload, session) {
  const config = typeConfig_(payload.type);
  const data = payload.data || {};
  const title = clean_(data.title, 180);
  const description = clean_(data.description, 12000);
  if (!title || !description) throw new Error('Judul dan deskripsi wajib diisi.');

  const sheet = SpreadsheetApp.openById(CMS.spreadsheetId).getSheetByName(config.sheet);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existing = findRow_(sheet, headers, data.id);
  const now = Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");
  let image = { url: data.image_url || '', id: data.image_drive_id || '' };
  if (data.image_base64) image = saveImage_(data.image_base64, data.image_name || 'gambar-parfi.jpg');

  const record = config.makeRecord({
    id: existing ? data.id : Utilities.getUuid(), title: title, description: description,
    summary: clean_(data.summary, 300), image: image, status: data.status === 'DRAFT' ? 'DRAFT' : 'PUBLISH',
    date: clean_(data.date, 30), endDate: clean_(data.end_date, 30), location: clean_(data.location, 250),
    author: session.nama, createdAt: existing ? existing.record.dibuat_pada : now, updatedAt: now,
  });
  const values = headers.map(header => record[header] === undefined ? '' : record[header]);
  if (existing) sheet.getRange(existing.rowNumber, 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);
  return { ok: true, item: record };
}

function remove_(payload) {
  const config = typeConfig_(payload.type);
  const sheet = SpreadsheetApp.openById(CMS.spreadsheetId).getSheetByName(config.sheet);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existing = findRow_(sheet, headers, payload.id);
  if (!existing) throw new Error('Data tidak ditemukan.');
  sheet.deleteRow(existing.rowNumber);
  return { ok: true };
}

function typeConfig_(type) {
  if (String(type).toLowerCase() === 'event') {
    return { sheet: 'Event', makeRecord: d => ({
      id: d.id, nama_event: d.title, ringkasan: d.summary, deskripsi: d.description,
      gambar_url: d.image.url, gambar_drive_id: d.image.id, tanggal_mulai: d.date,
      tanggal_selesai: d.endDate, lokasi: d.location, status: d.status, slug: slug_(d.title),
      dibuat_pada: d.createdAt, diubah_pada: d.updatedAt, penulis: d.author,
    }) };
  }
  return { sheet: 'Berita', makeRecord: d => ({
    id: d.id, judul: d.title, ringkasan: d.summary, isi: d.description,
    gambar_url: d.image.url, gambar_drive_id: d.image.id, tanggal: d.date,
    status: d.status, slug: slug_(d.title), dibuat_pada: d.createdAt,
    diubah_pada: d.updatedAt, penulis: d.author, jenis: 'BERITA',
  }) };
}

function saveImage_(dataUrl, fileName) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Format gambar tidak valid.');
  const bytes = Utilities.base64Decode(match[2]);
  const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '-');
  const file = DriveApp.getFolderById(CMS.mediaFolderId).createFile(Utilities.newBlob(bytes, match[1], safeName));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { id: file.getId(), url: 'https://drive.google.com/uc?export=view&id=' + file.getId() };
}

function findRow_(sheet, headers, id) {
  if (!id || sheet.getLastRow() < 2) return null;
  const idColumn = headers.indexOf('id') + 1;
  if (!idColumn) return null;
  const ids = sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1).getValues().flat();
  const position = ids.findIndex(value => String(value) === String(id));
  if (position < 0) return null;
  const rowNumber = position + 2;
  return { rowNumber: rowNumber, record: row_(headers, sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0]) };
}

function values_(sheetName) {
  const sheet = SpreadsheetApp.openById(CMS.spreadsheetId).getSheetByName(sheetName);
  if (!sheet) throw new Error('Tab ' + sheetName + ' tidak ditemukan.');
  const width = Math.max(sheet.getLastColumn(), 1);
  const height = Math.max(sheet.getLastRow(), 1);
  return sheet.getRange(1, 1, height, width).getDisplayValues();
}

function row_(headers, row) { return headers.reduce((record, header, i) => { record[header] = row[i] || ''; return record; }, {}); }
function index_(headers) { return headers.reduce((map, header, i) => { map[header] = i; return map; }, {}); }
function clean_(value, max) { return String(value || '').trim().slice(0, max); }
function slug_(value) { return clean_(value, 180).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function sha256_(value) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value).map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join(''); }
function json_(payload) { return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON); }
