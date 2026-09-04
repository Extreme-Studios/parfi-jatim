module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method tidak diizinkan.' });
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const allowedEmail = String(process.env.PARFI_ADMIN_EMAIL || '').trim().toLowerCase();
  const authorization = String(req.headers.authorization || '');
  if (!url || !anonKey || !allowedEmail) return res.status(503).json({ ok: false, error: 'Konfigurasi akses privat belum lengkap.' });
  if (!authorization.startsWith('Bearer ')) return res.status(401).json({ ok: false, error: 'Sesi login diperlukan.' });
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, { headers: { apikey: anonKey, authorization } });
    if (!response.ok) return res.status(401).json({ ok: false, error: 'Sesi login tidak valid.' });
    const user = await response.json();
    if (String(user.email || '').toLowerCase() !== allowedEmail) return res.status(403).json({ ok: false, error: 'Akun ini tidak memiliki akses.' });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, user: { email: user.email } });
  } catch {
    return res.status(502).json({ ok: false, error: 'Validasi sesi sedang bermasalah.' });
  }
};
