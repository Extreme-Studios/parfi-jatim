(() => {
  const loginView = document.querySelector('#loginView');
  const dashboardView = document.querySelector('#dashboardView');
  const loginForm = document.querySelector('#loginForm');
  const loginButton = document.querySelector('#loginButton');
  const loginMessage = document.querySelector('#loginMessage');
  const activeJobKey = 'parfiAutomationActiveJob';
  const draftKey = type => `parfiAutomationDraft:${type}`;
  let supabase;
  let workerReady = null;

  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const forms = {
    news: { title: 'Berita', field: 'Link berita', name: 'sourceUrl', type: 'url', placeholder: 'Tempel link berita di sini' },
    film: { title: 'Trailer', field: 'Link YouTube', name: 'youtubeUrl', type: 'url', placeholder: 'Tempel link trailer YouTube di sini' },
    agenda: { title: 'Agenda', field: 'Poster agenda', name: 'poster', type: 'file', placeholder: '' },
  };
  const show = view => { loginView.classList.toggle('hidden', view !== 'login'); dashboardView.classList.toggle('hidden', view !== 'dashboard'); };

  async function fileData(file) {
    if (!file) return '';
    if (file.size > 5 * 1024 * 1024) throw Error('Ukuran poster maksimal 5 MB.');
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('Poster gagal dibaca.')); reader.readAsDataURL(file); });
  }
  function currentElements() { return { button: document.querySelector('#generateButton'), message: document.querySelector('#automationMessage'), result: document.querySelector('#automationResult') }; }
  function resultMarkup(item) { const x = item || {}; return `<div class="result-card"><h4>${esc(x.judul || x.nama_event || x.title || 'Sudah dipublish')}</h4>${x.gambar_url ? `<img src="${esc(x.gambar_url)}" alt="">` : ''}<p>${esc(x.ringkasan || x.summary || '')}</p><p class="message">Sudah dipublish ke CMS.</p></div>`; }
  function applyJob(job) {
    if (!job || !job.id || sessionStorage.getItem(activeJobKey) !== job.id) return;
    const { button, message, result } = currentElements();
    if (!button || !message || !result) return;
    if (job.status === 'processing') { button.disabled = true; button.textContent = 'Memproses...'; message.textContent = 'Proses tetap berjalan. Kamu boleh pindah tab.'; return; }
    button.disabled = false; button.textContent = 'Generate & Publish'; sessionStorage.removeItem(activeJobKey);
    if (job.status === 'complete') { localStorage.removeItem(draftKey(job.contentType)); result.innerHTML = resultMarkup(job.item); message.textContent = ''; }
    else if (job.status === 'error') message.textContent = job.error || 'Konten gagal dibuat.';
  }
  function requestJobStatus() { workerReady?.then(worker => worker?.postMessage({ kind: 'parfi-job-status' })).catch(() => {}); }
  function panel(name) {
    const config = forms[name], workspace = document.querySelector('#workspacePanel');
    document.querySelector('#sectionTitle').textContent = config.title;
    const draft = config.type === 'file' ? '' : esc(localStorage.getItem(draftKey(name)) || '');
    workspace.innerHTML = `<article class="automation-card"><form class="automation-form" id="automationForm"><label>${config.field}<input name="${config.name}" type="${config.type}" ${config.type === 'file' ? 'accept="image/jpeg,image/png,image/webp"' : `value="${draft}"`} placeholder="${config.placeholder}" required></label><div class="automation-actions"><button class="button primary" type="submit" id="generateButton">Generate & Publish</button><p class="message" id="automationMessage" role="alert" aria-live="polite"></p></div></form><div id="automationResult"></div></article>`;
    const form = document.querySelector('#automationForm');
    if (config.type !== 'file') form.elements[config.name].addEventListener('input', event => localStorage.setItem(draftKey(name), event.target.value));
    form.addEventListener('submit', event => generate(event, name));
    requestJobStatus();
  }
  async function runInline(job) {
    const response = await fetch('/api/generate-content', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${job.token}` }, body: JSON.stringify(job.body), cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    applyJob(response.ok && data.ok ? { ...job, status: 'complete', item: data.item } : { ...job, status: 'error', error: data.error || 'Konten gagal dibuat.' });
  }
  async function generate(event, type) {
    event.preventDefault();
    const form = event.currentTarget, { button, message } = currentElements();
    button.disabled = true; button.textContent = 'Memproses...'; message.textContent = 'Menyiapkan proses…';
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw Error('Sesi login sudah berakhir. Silakan login kembali.');
      const body = type === 'agenda' ? { type, imageData: await fileData(form.elements.poster.files[0]) } : { type, [forms[type].name]: form.elements[forms[type].name].value.trim() };
      if (type !== 'agenda') localStorage.setItem(draftKey(type), body[forms[type].name]);
      const job = { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, contentType: type, body, token: session.access_token, startedAt: Date.now() };
      sessionStorage.setItem(activeJobKey, job.id); message.textContent = 'Proses tetap berjalan. Kamu boleh pindah tab.';
      const worker = await workerReady;
      if (worker) worker.postMessage({ kind: 'parfi-generate', job }); else runInline(job);
    } catch (error) { button.disabled = false; button.textContent = 'Generate & Publish'; message.textContent = error.message; }
  }
  function dashboard(session) { document.querySelector('#userEmail').textContent = session?.user?.email || 'Pengelola'; show('dashboard'); panel('news'); }
  async function startWorker() { if (!('serviceWorker' in navigator)) return null; const registration = await navigator.serviceWorker.register('/admin-worker.js'); return (await navigator.serviceWorker.ready).active || registration.active; }
  async function boot() {
    try {
      workerReady = startWorker();
      navigator.serviceWorker?.addEventListener('message', event => { const data = event.data || {}; if (data.kind === 'parfi-job') applyJob(data.job); if (data.kind === 'parfi-job-list') data.jobs.forEach(applyJob); });
      const response = await fetch('/api/supabase-config'), config = await response.json();
      if (!response.ok) throw Error(config.error || 'Supabase belum dikonfigurasi.');
      supabase = window.supabase.createClient(config.url, config.anonKey);
      const session = await supabase.auth.getSession(); session.data.session ? dashboard(session.data.session) : show('login');
      supabase.auth.onAuthStateChange((_event, nextSession) => nextSession ? dashboard(nextSession) : show('login'));
      document.addEventListener('visibilitychange', () => { if (!document.hidden) requestJobStatus(); });
    } catch (error) { loginMessage.textContent = error.message; loginButton.disabled = true; }
  }
  loginForm.addEventListener('submit', async event => {
    event.preventDefault(); loginButton.disabled = true; loginButton.textContent = 'Memeriksa...'; const values = Object.fromEntries(new FormData(loginForm));
    try { const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password }); if (error) throw error; }
    catch (error) { loginMessage.textContent = error.message === 'Invalid login credentials' ? 'Email atau password salah.' : 'Login gagal.'; }
    finally { loginButton.disabled = false; loginButton.innerHTML = 'Login <span>→</span>'; }
  });
  document.querySelector('#logoutButton').addEventListener('click', () => supabase?.auth.signOut());
  document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => panel(button.dataset.section)));
  boot();
})();
