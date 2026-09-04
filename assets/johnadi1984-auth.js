(() => {
  const $ = selector => document.querySelector(selector);
  let client;
  const views = { loading: $('#authLoading'), login: $('#loginView'), dashboard: $('#dashboardView') };
  const show = name => Object.entries(views).forEach(([key, element]) => { element.hidden = key !== name; });
  const message = (text = '', type = '') => { const node = $('#loginMessage'); node.textContent = text; node.dataset.type = type; };
  const verify = async session => {
    const response = await fetch('/api/private-session', { headers: { authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'Akses tidak diizinkan.');
    return payload.user;
  };
  const sync = async () => {
    show('loading');
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) return show('login');
      const user = await verify(session);
      $('#accountEmail').textContent = user.email;
      show('dashboard');
    } catch (error) {
      await client.auth.signOut();
      message(error.message, 'error');
      show('login');
    }
  };
  const setup = async () => {
    try {
      client = await window.ParfiSupabase.getClient();
      $('#loginForm').addEventListener('submit', async event => {
        event.preventDefault();
        const button = $('#loginButton');
        const email = $('#email').value.trim();
        const password = $('#password').value;
        button.disabled = true; button.textContent = 'Memeriksa akses…'; message();
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) { message('Email atau password tidak valid.', 'error'); button.disabled = false; button.textContent = 'Login'; return; }
        await sync(); button.disabled = false; button.textContent = 'Login';
      });
      $('#logoutButton').addEventListener('click', async () => { await client.auth.signOut(); message(); show('login'); });
      document.querySelectorAll('[data-center]').forEach(button => button.addEventListener('click', () => {
        $('#centerTitle').textContent = button.dataset.center;
        $('#centerCopy').textContent = `${button.dataset.center} sedang disiapkan. Konten belum dapat dipublikasikan dari panel ini.`;
      }));
      client.auth.onAuthStateChange(() => { if (!views.dashboard.hidden) sync(); });
      await sync();
    } catch (error) { $('#authLoading').textContent = error.message || 'Panel tidak dapat dimuat.'; }
  };
  setup();
})();
