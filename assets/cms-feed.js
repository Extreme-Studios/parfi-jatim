(() => {
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const safeUrl = value => { try { const url = new URL(String(value || '')); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; } };
  const imageUrl = value => {
    const source = safeUrl(value);
    const id = source.match(/[?&]id=([^&]+)/)?.[1];
    return /drive\.google\.com\/uc/i.test(source) && id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600` : source;
  };
  const dateValue = item => item.tanggal || item.tanggal_mulai || item.date || item.updated_at || item.diubah_pada || item.dibuat_pada || '';
  const sortNewest = items => [...items].sort((a, b) => String(dateValue(b)).localeCompare(String(dateValue(a))));
  const formatDate = value => {
    if (!value) return 'INFORMASI PARFI JATIM';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.valueOf()) ? 'INFORMASI PARFI JATIM' : new Intl.DateTimeFormat('id-ID', { day:'numeric', month:'short', year:'numeric' }).format(date).toUpperCase();
  };
  const getPublished = async type => {
    const response = await fetch(`/api/cms?action=public&type=${type}`, { cache: 'no-store' });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'Konten belum tersedia.');
    return (data.items || []).filter(item => String(item.status || '').toUpperCase() === 'PUBLISH');
  };
  const newsCard = item => {
    const source = safeUrl(item.sumber_url || item.source_url);
    const image = imageUrl(item.gambar_url);
    return `<article class="news-card">${source ? `<a class="news-visual-link" href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">${image ? `<figure class="news-visual"><img src="${escapeHtml(image)}" alt="${escapeHtml(item.judul)}" loading="lazy"></figure>` : ''}</a>` : (image ? `<figure class="news-visual"><img src="${escapeHtml(image)}" alt="${escapeHtml(item.judul)}" loading="lazy"></figure>` : '')}<p class="category">${formatDate(item.tanggal)}</p><h3>${source ? `<a class="news-title-link" href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.judul)}</a>` : escapeHtml(item.judul)}</h3><p>${escapeHtml(item.ringkasan || item.isi)}</p>${source ? `<p class="news-source">Sumber: berita asli</p><a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">Baca selengkapnya <span>↗</span></a>` : ''}</article>`;
  };
  const eventCard = item => {
    const image = imageUrl(item.gambar_url);
    if (!image) return '';
    return `<button class="agenda-poster-item" type="button" aria-label="Buka poster agenda ${escapeHtml(item.nama_event || 'PARFI')}"><img src="${escapeHtml(image)}" alt="Poster agenda ${escapeHtml(item.nama_event || 'PARFI')}"></button>`;
  };
  const archiveNewsCard = item => { const source = safeUrl(item.sumber_url || item.source_url), image = imageUrl(item.gambar_url); if (!source) return ''; return `<a class="archive-card" href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.judul)}" loading="lazy">` : ''}<div class="archive-card-copy"><p class="category">${formatDate(item.tanggal)}</p><h2>${escapeHtml(item.judul)}</h2><p>${escapeHtml(item.ringkasan || item.isi)}</p><p class="archive-source">Sumber: berita asli</p><span class="archive-open">Baca selengkapnya ↗</span></div></a>`; };
  const filmCard = (item, detailed) => { const video = safeUrl(item.video_url || item.source_url); if (!detailed) return `<a class="film-teaser-card" href="${escapeHtml(video || '#')}" ${video ? 'target="_blank" rel="noopener noreferrer"' : ''}>${item.gambar_url ? `<img src="${escapeHtml(item.gambar_url)}" alt="${escapeHtml(item.judul)}" loading="lazy">` : ''}<span>${escapeHtml(item.judul)}</span><b>${video ? '▶ Tonton trailer' : 'Lihat karya'}</b></a>`; return `<article class="film-card"><div class="film-card-cover">${item.gambar_url ? `<img src="${escapeHtml(item.gambar_url)}" alt="Poster ${escapeHtml(item.judul)}" loading="lazy">` : ''}</div><div class="film-card-body"><h2>${escapeHtml(item.judul)}</h2><p>${escapeHtml(item.sinopsis || item.ringkasan || 'Sinopsis belum tersedia.')}</p>${video ? `<a class="film-watch" href="${escapeHtml(video)}" target="_blank" rel="noopener noreferrer">▶ Tonton trailer</a>` : ''}</div></article>`; };
  Promise.allSettled([getPublished('news'), getPublished('event'), getPublished('film')]).then(results => {
    let news = results[0].status === 'fulfilled' ? results[0].value : [];
    let events = results[1].status === 'fulfilled' ? results[1].value : [];
    let films = results[2].status === 'fulfilled' ? results[2].value : [];
    news = sortNewest(news); events = sortNewest(events); films = sortNewest(films);
    const newsFeed = document.querySelector('#newsFeed');
    const eventFeed = document.querySelector('#eventFeed');
    const filmFeed = document.querySelector('#filmFeed');
    const archiveFeed = document.querySelector('#archiveFeed');
    const featuredNews = document.querySelector('#featuredNews');
    if (news.length && featuredNews) featuredNews.innerHTML = `<div class="story-mark">HEADLINE<br><span>${formatDate(news[0].tanggal)}</span></div><div>${news[0].gambar_url ? `<img src="${escapeHtml(news[0].gambar_url)}" alt="${escapeHtml(news[0].judul)}" loading="lazy" style="width:100%;aspect-ratio:16/9;object-fit:cover;margin-bottom:18px">` : ''}<p class="category">BERITA PARFI</p><h2>${escapeHtml(news[0].judul)}</h2><p>${escapeHtml(news[0].ringkasan || news[0].isi)}</p>${safeUrl(news[0].sumber_url || news[0].source_url) ? `<a class="story-link" href="${escapeHtml(safeUrl(news[0].sumber_url || news[0].source_url))}" target="_blank" rel="noopener noreferrer">Baca selengkapnya ↗</a>` : ''}</div>`;
    if (news.length && newsFeed) {
      const existing = [...newsFeed.querySelectorAll('[data-cms-news]')];
      existing.forEach(card => card.remove());
      newsFeed.insertAdjacentHTML('afterbegin', news.slice(0, 6).map(item => newsCard(item).replace('<article class="news-card">', '<article class="news-card" data-cms-news>')).join(''));
    }
    if (events.length && eventFeed) eventFeed.innerHTML = events.slice(0, 6).map(eventCard).join('');
    if (news.length && archiveFeed) archiveFeed.insertAdjacentHTML('afterbegin', news.map(archiveNewsCard).join(''));
    if (films.length && filmFeed) filmFeed.innerHTML = films.map(item => filmCard(item, Boolean(filmFeed.closest('.film-page')))).join('');
  }).catch(() => {});
})();
