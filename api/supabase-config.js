module.exports = async (_req, res) => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return res.status(503).json({ ok: false, error: 'Supabase belum dikonfigurasi.' });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ url, anonKey });
};
