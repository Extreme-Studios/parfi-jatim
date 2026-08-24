const fs = require('fs');
const path = require('path');

const endpoint = process.env.EXTREME_DIANA_ENDPOINT || 'https://extremestudiosai.com/api/diana';

function readSiteKnowledge() {
  const files = ['index.html', 'preview-struktur.html', 'ad-art-parfi.html'];
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
  }).filter(Boolean).join('\n\n').slice(0, 30000);
}

function relevantKnowledge(knowledge, message) {
  const terms = message.toLowerCase().split(/[^a-z0-9à-ÿ]+/i).filter((term) => term.length > 2);
  const anchored = terms.map((term) => {
    const index = knowledge.toLowerCase().lastIndexOf(term);
    return index >= 0 ? knowledge.slice(Math.max(0, index - 75), index + 125) : '';
  }).filter(Boolean).join(' ');
  if (anchored) return anchored.slice(0, 180);
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
  return selected.slice(0, 180);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const message = String(req.body?.message || '').trim().slice(0, 500);
  if (!message) return res.status(400).json({ ok: false, error: 'Pesan kosong.' });

  const knowledge = relevantKnowledge(readSiteKnowledge(), message);
  const prompt = [
    'Kamu Reva, asisten perempuan ramah website resmi PD PARFI Jawa Timur. Jawab singkat, profesional, hanya dari DATA WEBSITE. Jika tidak ada, katakan informasi belum tersedia.',
    `DATA WEBSITE: ${knowledge}`,
    `PERTANYAAN: ${message.slice(0, 90)}`
  ].join('\n\n');

  try {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: prompt })
    });
    const data = await response.json();
    return res.status(response.ok ? 200 : 502).json({ ok: response.ok, answer: data.answer || 'Maaf, Reva belum dapat menjawab saat ini.' });
  } catch (_) {
    return res.status(502).json({ ok: false, answer: 'Koneksi Reva sedang tidak tersedia. Silakan coba lagi.' });
  }
};
