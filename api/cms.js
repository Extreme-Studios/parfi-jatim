module.exports = async (req, res) => {
  const endpoint = process.env.PARFI_CMS_ENDPOINT;
  if (!endpoint) return res.status(503).json({ ok: false, error: 'Panel sedang disiapkan. Coba beberapa saat lagi.' });
  try {
    const url = new URL(endpoint);
    if (req.method === 'GET') Object.entries(req.query || {}).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url.toString(), {
      method: req.method === 'GET' ? 'GET' : 'POST',
      headers: req.method === 'GET' ? {} : { 'content-type': 'application/json' },
      body: req.method === 'GET' ? undefined : JSON.stringify(req.body || {}),
    });
    const data = await response.json();
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'Koneksi ke penyimpanan konten sedang bermasalah.' });
  }
};
