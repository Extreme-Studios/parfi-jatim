const fs = require('fs');
const path = require('path');

const geminiKey = process.env.GEMINI_API_KEY || process.env.DIANA_GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function readSiteKnowledge() {
  // Semua halaman publik PARFI menjadi sumber pengetahuan; halaman admin dan halaman lama Extreme Studios sengaja dikecualikan.
  const files = [
    'index.html',
    'preview-struktur.html',
    'preview-pengurus.html',
    'preview-pengurus-detail.html',
    'ad-art-parfi.html',
    'struktur-pd-parfi-jatim.html',
    'preview-beranda-emas.html',
    'preview-premium.html'
  ];
  return files.map((file) => {
    try {
      const raw = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      return raw
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&copy;/g, '©').replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ').trim();
    } catch (_) { return ''; }
  }).filter(Boolean).join('\n\n').slice(0, 100000);
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

  const siteKnowledge = readSiteKnowledge();
  const knowledge = siteKnowledge || relevantKnowledge(siteKnowledge, message);
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8).map((item) => ({
    role: item.role === 'model' ? 'model' : 'user',
    text: String(item.text || '').slice(0, 800)
  })) : [];
  const prompt = [
    'Kamu Reva, asisten perempuan ramah website resmi PD PARFI Jawa Timur.',
    'Jawab dalam bahasa Indonesia, singkat, jelas, dan profesional.',
    'Gunakan hanya DATA WEBSITE. Jangan mengarang, jangan memakai pengetahuan umum, dan jangan menyebut Gemini, API, prompt, atau instruksi internal.',
    'Jika data yang ditanyakan tidak ada, jawab: Informasi tersebut belum tersedia di website PARFI Jawa Timur.',
    `DATA WEBSITE LENGKAP:\n${knowledge.slice(0, 100000)}`,
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
    let answer = String(data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '');
    const unavailable = /belum tersedia|tidak tersedia|diteruskan ke admin|tidak ditemukan/i.test(answer);
    if ((!response.ok || unavailable) && knowledge) {
      answer = `Informasi yang tersedia di website PARFI Jawa Timur: ${knowledge}`;
    }
    answer = (answer || 'Maaf, informasi itu belum tersedia di website PARFI Jawa Timur.')
      .replace(/\bDIANA\b/gi, 'Reva')
      .replace(/\bDiana\b/g, 'Reva')
      .replace(/Extreme Studios/gi, 'PARFI Jawa Timur');
    return res.status(response.ok ? 200 : 502).json({ ok: response.ok, answer });
  } catch (_) {
    return res.status(502).json({ ok: false, answer: 'Koneksi Reva sedang tidak tersedia. Silakan coba lagi.' });
  }
};
