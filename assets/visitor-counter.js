(() => {
  const output = document.querySelector('[data-visitor-count]');
  if (!output) return;
  const countKey = 'parfi-home-visitor-count';
  const sessionKey = 'parfi-home-visitor-recorded';
  const initialCount = Number.parseInt(output.dataset.visitorCount || '71', 10);
  let count = initialCount;
  try {
    count = Number.parseInt(localStorage.getItem(countKey), 10) || initialCount;
    if (!sessionStorage.getItem(sessionKey)) {
      count += 1;
      localStorage.setItem(countKey, String(count));
      sessionStorage.setItem(sessionKey, '1');
    }
  } catch (_) {}
  output.textContent = new Intl.NumberFormat('id-ID').format(count);
})();
