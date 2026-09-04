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
  const isAgendaVisible = item => {
    const endDate = item.tanggal_selesai || item.end_date || item.tanggal_mulai || item.date;
    if (!endDate) return true;
    const parsed = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(parsed.valueOf())) return true;
    parsed.setDate(parsed.getDate() + 2);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return today < parsed;
  };
  const newsCard = item => `<article>${item.gambar_url ? `<img src="${escapeHtml(item.gambar_url)}" alt="${escapeHtml(item.judul)}" loading="lazy" style="width:100%;aspect-ratio:16/9;object-fit:cover;margin-bottom:16px">` : ''}<p class="category">${formatDate(item.tanggal)}</p><h3>${escapeHtml(item.judul)}</h3><p>${escapeHtml(item.ringkasan || item.isi)}</p></article>`;
  const eventCard = (item, index) => `<div class="${item.agendaPoster ? 'agenda-poster-item' : ''}">${item.gambar_url ? `<img src="${escapeHtml(item.gambar_url)}" alt="${escapeHtml(item.nama_event)}" loading="lazy" style="width:100%;aspect-ratio:16/9;object-fit:cover;margin-bottom:16px">` : ''}<span>${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(item.nama_event)}</h3><p>${formatDate(item.tanggal_mulai)}${item.lokasi ? ` · ${escapeHtml(item.lokasi)}` : ''}${item.ringkasan ? `<br>${escapeHtml(item.ringkasan)}` : ''}</p></div>`;
  const previousActing = { agendaPoster: true, nama_event: 'Workshop Acting PARFI Jawa Timur', lokasi: 'Jawa Timur', ringkasan: '3 kali pertemuan · Pengampu: Susilo Badar', gambar_url: 'assets/images/workshop-acting.jpg', status: 'PUBLISH' };
  const previousProduction = { agendaPoster: true, nama_event: 'Workshop Produksi Film', lokasi: 'Jawa Timur', ringkasan: '5 sesi materi · Pengampu: Mulyadi JP', gambar_url: 'assets/images/workshop-produksi.png', status: 'PUBLISH' };
  const kediriWorkshop = { agendaPoster: true, nama_event: 'Workshop Acting PARFI - Bakat Acting Nggak Lahir di Depan Cermin', tanggal_mulai: '', lokasi: 'Kediri Raya', ringkasan: '3 pertemuan intensif · Pengampu: Susilo Badar · Biaya Rp500.000 · Pendaftaran dibuka', gambar_url: 'assets/images/agenda-workshop-acting-kediri.jpg', status: 'PUBLISH' };
  Promise.all([getPublished('news'), getPublished('event')]).then(([news, events]) => {
    const newsFeed = document.querySelector('#newsFeed');
    const eventFeed = document.querySelector('#eventFeed');
    if (news.length && newsFeed) newsFeed.innerHTML = news.slice(0, 6).map(newsCard).join('');
    if (eventFeed) eventFeed.innerHTML = [previousActing, previousProduction, kediriWorkshop, ...events].filter(isAgendaVisible).slice(0, 6).map(eventCard).join('');
  }).catch(() => {});
})();
