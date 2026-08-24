const fs = require('fs');
const path = require('path');

const endpoint = process.env.EXTREME_DIANA_ENDPOINT || 'https://extremestudiosai.com/api/diana';

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
  const normalized = message.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const localAnswers = [
    { keys: ['ketua', 'wira'], answer: 'Ketua PD PARFI Jawa Timur adalah Wira Lina, S.E., M.Si.' },
    { keys: ['bendahara'], answer: 'Bendahara PD PARFI Jawa Timur adalah Felisha Lauren. Wakil Bendahara: Farida Evi Susiana.' },
    { keys: ['sekretaris'], answer: 'Sekretaris PD PARFI Jawa Timur adalah H. Syahlan Husein. Wakil Sekretaris: Arya Dipangga, Abdulloh, dan dr. Rachmat Arisatoto.' },
    { keys: ['alamat', 'sekretariat'], answer: 'Sekretariat PD PARFI Jawa Timur berada di Ruko Tidar Mas Square Blok A-11, Jalan Tidar 308–310, Surabaya, Jawa Timur.' },
    { keys: ['whatsapp', 'wa', 'nomor'], answer: 'WhatsApp PD PARFI Jawa Timur: +62 821-1997-0090 atas nama Wira Lina.' }
  ];
  const direct = localAnswers.find((item) => item.keys.some((key) => new RegExp(`(^|\\s)${key.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?:nya)?(?=\\s|$)`, 'i').test(normalized)));
  if (normalized.includes('berapa') && normalized.includes('pengurus')) {
    return res.status(200).json({ ok: true, answer: 'Struktur resmi PD PARFI Jawa Timur memuat 59 pengurus unik, terdiri dari penasehat, pimpinan daerah, sekretariat, bendahara, dan anggota biro.' });
  }
  if (direct && (normalized.includes('siapa') || normalized.includes('berapa') || normalized.includes('dimana') || normalized.includes('di mana') || normalized.includes('alamat') || normalized.includes('nomor'))) {
    return res.status(200).json({ ok: true, answer: direct.answer });
  }
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
    const answer = String(data.answer || 'Maaf, Reva belum dapat menjawab saat ini.')
      .replace(/\bDIANA\b/gi, 'Reva')
      .replace(/\bDiana\b/g, 'Reva')
      .replace(/Extreme Studios/gi, 'PARFI Jawa Timur');
    return res.status(response.ok ? 200 : 502).json({ ok: response.ok, answer });
  } catch (_) {
    return res.status(502).json({ ok: false, answer: 'Koneksi Reva sedang tidak tersedia. Silakan coba lagi.' });
  }
};
