const state = { token: sessionStorage.getItem('parfiCmsToken') || '', user: JSON.parse(sessionStorage.getItem('parfiCmsUser') || 'null'), news: [], events: [], editing: null };
const $ = selector => document.querySelector(selector);
const api = async (action, payload = {}) => {
  const response = await fetch('/api/cms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, token: state.token, ...payload }) });
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Permintaan tidak dapat diproses.');
  return data;
};
const esc = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
const status = value => `<span class="status ${value === 'DRAFT' ? 'draft' : ''}">${value === 'DRAFT' ? 'DRAFT' : 'PUBLISH'}</span>`;
const dateText = value => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : 'Tanpa tanggal';

function switchView(view) {
  ['home','news','event'].forEach(name => $(`#${name}View`).classList.toggle('hidden', name !== view));
  document.querySelectorAll('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const labels = { home: ['DASBOR','Selamat datang.'], news: ['KONTEN','Berita PARFI Jatim'], event: ['AGENDA','Agenda PARFI'] };
  $('#viewKicker').textContent = labels[view][0]; $('#viewTitle').textContent = labels[view][1];
}

function normalize(item, type) {
  return type === 'news' ? { id:item.id, title:item.judul, summary:item.ringkasan, description:item.isi, date:item.tanggal, status:item.status, image_url:item.gambar_url, image_drive_id:item.gambar_drive_id } : { id:item.id, title:item.nama_event, summary:item.ringkasan, description:item.deskripsi, date:item.tanggal_mulai, end_date:item.tanggal_selesai, location:item.lokasi, status:item.status, image_url:item.gambar_url, image_drive_id:item.gambar_drive_id };
}

function render() {
  const all = [...state.news.map(item => ({ ...normalize(item, 'news'), type:'news' })), ...state.events.map(item => ({ ...normalize(item, 'event'), type:'event' }))].sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));
  $('#newsCount').textContent = state.news.length; $('#eventCount').textContent = state.events.length; $('#publishedCount').textContent = all.filter(item => item.status === 'PUBLISH').length;
  $('#recentList').innerHTML = all.length ? all.slice(0,5).map(item => itemRow(item, true)).join('') : '<p class="empty">Belum ada konten. Tambahkan berita atau agenda pertama.</p>';
  $('#newsList').innerHTML = state.news.length ? state.news.map(item => itemRow({ ...normalize(item,'news'), type:'news' })).join('') : '<p class="empty">Belum ada berita.</p>';
  $('#eventList').innerHTML = state.events.length ? state.events.map(item => itemRow({ ...normalize(item,'event'), type:'event' })).join('') : '<p class="empty">Belum ada agenda.</p>';
  document.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => openEditor(button.dataset.edit, button.dataset.type)));
}

function itemRow(item, recent = false) {
  const heading = item.type === 'event' ? 'EV' : 'BR';
  return `<article class="${recent ? 'recent-item' : 'content-item'}"><span class="item-type">${heading}</span><div class="item-copy"><b>${esc(item.title)}</b><span>${dateText(item.date)}${item.location ? ` · ${esc(item.location)}` : ''}</span></div>${status(item.status)}${recent ? '' : `<button class="mini-button" data-edit="${esc(item.id)}" data-type="${item.type}">Edit</button>`}</article>`;
}

async function refresh() {
  try {
    const [news, events] = await Promise.all([api('list',{type:'news'}), api('list',{type:'event'})]);
    state.news = news.items; state.events = events.items; render();
  } catch (error) { alert(error.message); if (/Sesi/.test(error.message)) logout(); }
}

function openEditor(type, id = '') {
  const item = id ? (type === 'news' ? state.news : state.events).map(value => normalize(value,type)).find(value => value.id === id) : null;
  state.editing = item || null;
  const form = $('#editorForm'); form.reset(); form.elements.type.value = type; form.elements.id.value = item?.id || ''; form.elements.image_url.value = item?.image_url || ''; form.elements.image_drive_id.value = item?.image_drive_id || '';
  form.elements.title.value = item?.title || ''; form.elements.date.value = item?.date || ''; form.elements.end_date.value = item?.end_date || ''; form.elements.location.value = item?.location || ''; form.elements.summary.value = item?.summary || ''; form.elements.description.value = item?.description || ''; form.elements.status.value = item?.status || 'PUBLISH';
  document.querySelectorAll('.event-only').forEach(element => element.style.display = type === 'event' ? 'grid' : 'none');
  $('#editorKicker').textContent = type === 'event' ? 'AGENDA PARFI' : 'BERITA'; $('#editorTitle').textContent = item ? `Edit ${type === 'event' ? 'agenda' : 'berita'}` : `Tambah ${type === 'event' ? 'agenda' : 'berita'}`; $('#saveButton').textContent = form.elements.status.value === 'DRAFT' ? 'Simpan draft' : 'Simpan & publish'; $('#editorMessage').textContent = '';
  $('#editorDialog').showModal();
}

async function imageData(file) {
  if (!file) return '';
  if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 5 MB.');
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Gambar gagal dibaca.')); reader.readAsDataURL(file); });
}

async function saveEditor(event) {
  event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form).entries()); const button = $('#saveButton');
  try {
    button.disabled = true; button.textContent = 'Menyimpan...'; $('#editorMessage').textContent = '';
    const file = form.elements.image.files[0]; if (file) { data.image_base64 = await imageData(file); data.image_name = file.name; }
    await api('save', { type:data.type, data }); $('#editorDialog').close(); await refresh(); switchView(data.type);
  } catch (error) { $('#editorMessage').textContent = error.message; } finally { button.disabled = false; button.textContent = form.elements.status.value === 'DRAFT' ? 'Simpan draft' : 'Simpan & publish'; }
}

async function login(event) {
  event.preventDefault(); const form = event.currentTarget; const message = $('#loginMessage'); const button = form.querySelector('button');
  try { button.disabled = true; message.textContent = 'Memeriksa akun...'; const data = await api('login', Object.fromEntries(new FormData(form).entries())); state.token = data.token; state.user = data.user; sessionStorage.setItem('parfiCmsToken', state.token); sessionStorage.setItem('parfiCmsUser', JSON.stringify(state.user)); showApp(); }
  catch (error) { message.textContent = error.message; } finally { button.disabled = false; }
}
function logout() { sessionStorage.removeItem('parfiCmsToken'); sessionStorage.removeItem('parfiCmsUser'); state.token = ''; state.user = null; $('#appView').classList.add('hidden'); $('#loginView').classList.remove('hidden'); }
function showApp() { $('#loginView').classList.add('hidden'); $('#appView').classList.remove('hidden'); $('#userName').textContent = state.user?.nama || 'Administrator'; refresh(); }

$('#loginForm').addEventListener('submit', login); $('#editorForm').addEventListener('submit', saveEditor); $('#closeEditor').addEventListener('click', () => $('#editorDialog').close()); $('#cancelEditor').addEventListener('click', () => $('#editorDialog').close()); $('#logoutButton').addEventListener('click', async () => { try { await api('logout'); } finally { logout(); } });
document.querySelectorAll('.nav-link').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view))); document.querySelectorAll('[data-new]').forEach(button => button.addEventListener('click', () => openEditor(button.dataset.new))); document.querySelectorAll('[data-view-target]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.viewTarget))); $('#editorForm').elements.status.addEventListener('change', event => $('#saveButton').textContent = event.target.value === 'DRAFT' ? 'Simpan draft' : 'Simpan & publish');
if (state.token && state.user) showApp();
