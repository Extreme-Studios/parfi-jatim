(() => {
  const loginView = document.querySelector('#loginView'), dashboardView = document.querySelector('#dashboardView');
  const loginForm = document.querySelector('#loginForm'), loginButton = document.querySelector('#loginButton'), loginMessage = document.querySelector('#loginMessage');
  const sections = {
    home: ['PRIVATE DASHBOARD', 'Selamat datang.', 'Ringkasan', 'Mulai dari sini', 'Konten baru bisa disiapkan melalui menu di samping.'],
    news: ['AI CONTENT CENTER', 'Tambah berita', 'BR', 'Ruang berita', 'Placeholder editor berita — siap dihubungkan ke alur publikasi.'],
    film: ['AI CONTENT CENTER', 'Tambah film', 'FL', 'Ruang film', 'Placeholder editor film — siap dihubungkan ke katalog film.'],
    agenda: ['AI CONTENT CENTER', 'Tambah agenda', 'AG', 'Ruang agenda', 'Placeholder editor agenda — siap dihubungkan ke kalender kegiatan.']
  };
  let supabase;
  const show = (view) => { loginView.classList.toggle('hidden', view !== 'login'); dashboardView.classList.toggle('hidden', view !== 'dashboard'); };
  const setSection = (name) => { const item = sections[name] || sections.home; document.querySelector('#sectionEyebrow').textContent = item[0]; document.querySelector('#sectionTitle').textContent = item[1]; document.querySelector('#placeholder').innerHTML = `<article class="placeholder-card"><span class="icon">${item[2]}</span><h4>${item[3]}</h4><p>${item[4]}</p></article>`; document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.section === name)); };
  const showDashboard = (session) => { document.querySelector('#userEmail').textContent = session?.user?.email || 'Pengelola'; setSection('home'); show('dashboard'); };
  const showLogin = () => { show('login'); loginForm.reset(); };
  async function boot() {
    try {
      const response = await fetch('/api/supabase-config'); const config = await response.json();
      if (!response.ok || !config.url || !config.anonKey) throw new Error('Supabase belum dikonfigurasi.');
      supabase = window.supabase.createClient(config.url, config.anonKey);
      const { data } = await supabase.auth.getSession(); data.session ? showDashboard(data.session) : showLogin();
      supabase.auth.onAuthStateChange((_event, session) => session ? showDashboard(session) : showLogin());
    } catch (error) { loginMessage.textContent = error.message; loginButton.disabled = true; }
  }
  loginForm.addEventListener('submit', async (event) => { event.preventDefault(); loginMessage.textContent = ''; loginButton.disabled = true; loginButton.textContent = 'Memeriksa...'; const values = Object.fromEntries(new FormData(loginForm)); try { const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password }); if (error) throw error; } catch (error) { loginMessage.textContent = error.message === 'Invalid login credentials' ? 'Email atau password salah.' : 'Login gagal. Periksa data Anda.'; } finally { loginButton.disabled = false; loginButton.innerHTML = 'Login <span>→</span>'; } });
  document.querySelector('#logoutButton').addEventListener('click', async () => { await supabase?.auth.signOut(); });
  document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => setSection(button.dataset.section)));
  boot();
})();
