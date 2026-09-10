(() => {
  const images = [...document.querySelectorAll('img[data-pengurus-image]')];
  if (!images.length) return;
  const normalize = value => String(value || '').trim().toLowerCase();
  fetch('/api/cms?action=public_pengurus_media', { cache: 'no-store' })
    .then(response => response.json())
    .then(data => {
      if (!data.ok) throw new Error(data.error || 'Foto pengurus belum tersedia.');
      const byName = new Map((data.items || []).map(item => [normalize(item.name), item.url]));
      images.forEach(image => {
        const remote = byName.get(normalize(image.dataset.pengurusImage));
        if (!remote) return;
        image.src = remote;
        image.dataset.pengurusDrive = 'true';
      });
    })
    .catch(() => {});
})();
