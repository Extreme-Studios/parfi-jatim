(() => {
  const images = [...document.querySelectorAll('img[data-pengurus-image]')];
  if (!images.length) return;
  const normalize = value => String(value || '').trim().toLowerCase();
  fetch('/api/cms?action=public_pengurus_media', { cache: 'no-store' })
    .then(response => response.json())
    .then(data => {
      if (!data.ok) throw new Error(data.error || 'Foto pengurus belum tersedia.');
      const byName = new Map((data.items || []).map(item => [normalize(item.name), item.url]));
      const byNumber = new Map((data.items || []).map(item => {
        const number = String(item.name || '').match(/^0*(\d+)_/);
        return number ? [String(Number(number[1])), item.url] : null;
      }).filter(Boolean));
      images.forEach(image => {
        const localName = image.dataset.pengurusImage;
        const number = String(localName || '').match(/(?:all-)?pengurus-(\d+)/i);
        const remote = byName.get(normalize(localName)) || (number ? byNumber.get(String(Number(number[1]))) : '');
        if (!remote) return;
        image.src = remote;
        image.dataset.pengurusDrive = 'true';
      });
    })
    .catch(() => {});
})();
