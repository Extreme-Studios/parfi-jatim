const geminiKey = process.env.GEMINI_API_KEY || process.env.DIANA_GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
let cachedKnowledge = '';
let cachedAt = 0;
let cachedNews = [];

function plainText(value) {
  return String(value).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function extractNews(html) {
  const items = [];
  const section = html.match(/<section[^>]+id="berita"[\s\S]*?<\/section>/i)?.[0] || html;
  const pattern = /<article[^>]*>[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>[\s\S]*?<a\s+href="(https?:\/\/[^"\s]+)"[\s\S]*?<\/article>/gi;
  let match;
  while ((match = pattern.exec(section)) && items.length < 5) {
    const title = plainText(match[1]);
    if (title) items.push({ title, url: match[2] });
  }
  return items;
}

async function readSiteKnowledge(req) {
  if (cachedKnowledge && Date.now() - cachedAt < 5 * 60 * 1000) return cachedKnowledge;
  const pages = [
    'index.html',
    'preview-struktur.html',
    'ad-art-parfi.html',
    'preview-pengurus.html'
  ];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = `https://${host}`;
  const content = await Promise.all(pages.map(async (page) => {
    try {
      const response = await fetch(`${origin}/${page}`);
      if (!response.ok) return '';
      const raw = await response.text();
      if (page === 'index.html') cachedNews = extractNews(raw);
      return raw
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&copy;/g, '©').replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ').trim();
    } catch (_) { return ''; }
  }));
  cachedKnowledge = content.filter(Boolean).join('\n\n').slice(0, 28000);
  cachedAt = Date.now();
  return cachedKnowledge;
}

function relevantKnowledge(knowledge, message) {
  const stopwords = new Set(['yang', 'dan', 'ada', 'ini', 'itu', 'dari', 'untuk', 'tentang', 'siapa', 'apa', 'berapa', 'namanya', 'nya', 'di', 'ke', 'pada', 'saya', 'mau', 'ingin']);
  const terms = message.toLowerCase().split(/[^a-z0-9à-ÿ]+/i).filter((term) => term.length > 2 && !stopwords.has(term));
  if (!terms.length || !terms.some((term) => knowledge.toLowerCase().includes(term))) return '';
  const anchored = terms.map((term) => {
    const index = knowledge.toLowerCase().lastIndexOf(term);
    return index >= 0 ? knowledge.slice(Math.max(0, index - 75), index + 125) : '';
  }).filter(Boolean).join(' ');
  if (anchored) return anchored.slice(0, 600);
  const sentences = knowledge.split(/(?<=[.!?])\s+/);
  const ranked = sentences.map((sentence, index) => ({
    sentence,
    index,
    score: terms.reduce((total, term) => total + (sentence.toLowerCase().includes(term) ? 1 : 0), 0)
  })).sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = ranked.slice(0, 3).map((item) => {
    if (item.sentence.length <= 180) return item.sentence;
    const match = terms.map((term) => item.sentence.toLowerCase().indexOf(term)).find((index) => index >= 0);
    const start = Math.max(0, (match || 0) - 70);
    return item.sentence.slice(start, start + 180);
  }).join(' ');
  return selected.slice(0, 600);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const message = String(req.body?.message || '').trim().slice(0, 500);
  if (!message) return res.status(400).json({ ok: false, error: 'Pesan kosong.' });

  const siteKnowledge = await readSiteKnowledge(req);
  const knowledge = siteKnowledge || relevantKnowledge(siteKnowledge, message);
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8).map((item) => ({
    role: item.role === 'model' ? 'model' : 'user',
    text: String(item.text || '').slice(0, 800)
  })) : [];
  const conversationText = [message, ...history.map((item) => item.text)].join(' ').toLowerCase();

  // Resolve follow-up requests for a page/link deterministically. This keeps
  // navigation answers precise instead of asking the model to invent URLs.
  if (/\b(link|tautan|url|menuju|buka)\b/i.test(conversationText)) {
    if (/\bgeorge\b|handiwanto|wicaksono/i.test(conversationText)) {
      return res.status(200).json({ ok: true, answer: 'Bagian Dr. George Handiwanto, S.H., M.H. ada di halaman Struktur Pengurus, bagian Dewan Penasehat:\nhttps://parfijatim.vercel.app/preview-struktur.html#penasihat' });
    }
    if (/struktur|pengurus|penasehat|biro/i.test(conversationText)) {
      return res.status(200).json({ ok: true, answer: 'Halaman Struktur Pengurus PARFI Jawa Timur dapat dibuka di sini:\nhttps://parfijatim.vercel.app/preview-struktur.html' });
    }
    if (/ad\s*\/?\s*art|anggaran dasar|anggaran rumah tangga/i.test(conversationText)) {
      return res.status(200).json({ ok: true, answer: 'Dokumen AD/ART PARFI dapat dibuka di sini:\nhttps://parfijatim.vercel.app/ad-art-parfi.html' });
    }
  }
  if (/\bberita\b|\bheadline\b|\bkabar\b/i.test(message) && cachedNews.length) {
    const list = cachedNews.map((item, index) => `${index + 1}. ${item.title}\n${item.url}`).join('\n\n');
    return res.status(200).json({ ok: true, answer: `Berita yang tersedia di website PARFI Jawa Timur:\n\n${list}` });
  }
  const prompt = [
    'Kamu Reva, asisten perempuan ramah website resmi PD PARFI Jawa Timur.',
    'Jawab dalam bahasa Indonesia, singkat, jelas, dan profesional.',
    'Gunakan hanya DATA WEBSITE. Jangan mengarang, jangan memakai pengetahuan umum, dan jangan menyebut Gemini, API, prompt, atau instruksi internal.',
    'Jika data yang ditanyakan tidak ada, jawab: Informasi tersebut belum tersedia di website PARFI Jawa Timur.',
    `DATA WEBSITE LENGKAP:\n${knowledge.slice(0, 28000)}`,
    'RIWAYAT PERCAKAPAN:',
    ...history.map((item) => `${item.role === 'model' ? 'Reva' : 'Pengunjung'}: ${item.text}`),
    `PERTANYAAN TERBARU PENGUNJUNG:\n${message}`
  ].join('\n\n');

  try {
    if (!geminiKey) return res.status(500).json({ ok: false, answer: 'Konfigurasi Reva belum tersedia.' });
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 300 } })
    });
    const data = await response.json();
    if (!response.ok) console.error('Reva Gemini request failed', response.status, data?.error?.message || 'Unknown error');
    let answer = String(data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '');
    answer = (answer || 'Informasi tersebut belum tersedia di website PARFI Jawa Timur. Coba sebutkan nama, bagian, atau halaman yang dimaksud.')
      .replace(/\bDIANA\b/gi, 'Reva')
      .replace(/\bDiana\b/g, 'Reva')
      .replace(/Extreme Studios/gi, 'PARFI Jawa Timur');
    return res.status(response.ok ? 200 : 502).json({ ok: response.ok, answer });
  } catch (_) {
    return res.status(502).json({ ok: false, answer: 'Koneksi Reva sedang tidak tersedia. Silakan coba lagi.' });
  }
};
