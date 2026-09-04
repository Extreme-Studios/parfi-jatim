module.exports = (req, res) => {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return res.status(503).json({ ok: false, error: 'Konfigurasi login belum tersedia.' });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, url, anonKey });
};
