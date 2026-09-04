(() => {
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const formatDate = value => {
    if (!value) return 'INFORMASI PARFI JATIM';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.valueOf()) ? 'INFORMASI PARFI JATIM' : new Intl.DateTimeFormat('id-ID', { day:'numeric', month:'short', year:'numeric' }).format(date).toUpperCase();
  };
  const getPublished = async type => {
    const response = await fetch(`/api/cms?action=public&type=${type}`);
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'Konten belum tersedia.');
    return (data.items || []).filter(item => item.status === 'PUBLISH');
  };
  const newsCard = item => `<article>${item.gambar_url ? `<img src="${escapeHtml(item.gambar_url)}" alt="${escapeHtml(item.judul)}" loading="lazy" style="width:100%;aspect-ratio:16/9;object-fit:cover;margin-bottom:16px">` : ''}<p class="category">${formatDate(item.tanggal)}</p><h3>${escapeHtml(item.judul)}</h3><p>${escapeHtml(item.ringkasan || item.isi)}</p></article>`;
  const eventCard = (item, index) => `<div>${item.gambar_url ? `<img src="${escapeHtml(item.gambar_url)}" alt="${escapeHtml(item.nama_event)}" loading="lazy" style="width:100%;aspect-ratio:16/9;object-fit:cover;margin-bottom:16px">` : ''}<span>${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(item.nama_event)}</h3><p>${formatDate(item.tanggal_mulai)}${item.lokasi ? ` · ${escapeHtml(item.lokasi)}` : ''}${item.ringkasan ? `<br>${escapeHtml(item.ringkasan)}` : ''}</p></div>`;
  Promise.all([getPublished('news'), getPublished('event')]).then(([news, events]) => {
    const newsFeed = document.querySelector('#newsFeed');
    const eventFeed = document.querySelector('#eventFeed');
    if (news.length && newsFeed) newsFeed.innerHTML = news.slice(0, 6).map(newsCard).join('');
    if (events.length && eventFeed) eventFeed.innerHTML = events.slice(0, 6).map(eventCard).join('');
  }).catch(() => {});
})();
