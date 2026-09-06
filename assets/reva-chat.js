(() => {
  const root = document.querySelector('.reva-chat');
  if (!root) return;
  const panel = root.querySelector('.reva-panel');
  const messages = root.querySelector('.reva-messages');
  const form = root.querySelector('.reva-form');
  const input = root.querySelector('input');
  const history = [];
  const storedPosition = 'parfi-reva-position';
  let drag = null;
  let suppressLauncherClick = false;
  const clampPosition = () => {
    if (!root.style.left || !root.style.top) return;
    const left = Math.max(8, Math.min(window.innerWidth - root.offsetWidth - 8, Number.parseFloat(root.style.left) || 8));
    const top = Math.max(8, Math.min(window.innerHeight - root.offsetHeight - 8, Number.parseFloat(root.style.top) || 8));
    root.style.left = `${left}px`; root.style.top = `${top}px`; root.style.right = 'auto'; root.style.bottom = 'auto';
  };
  try {
    const saved = JSON.parse(localStorage.getItem(storedPosition) || 'null');
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
      root.style.left = `${saved.left}px`; root.style.top = `${saved.top}px`; root.style.right = 'auto'; root.style.bottom = 'auto';
      requestAnimationFrame(clampPosition);
    }
  } catch (_) {}
  const startDrag = (event) => {
    const isLauncher = event.currentTarget === launcher;
    if ((event.button !== undefined && event.button !== 0) || (!isLauncher && event.target.closest('button, input, a, textarea, select, label'))) return;
    event.preventDefault();
    const bounds = root.getBoundingClientRect();
    drag = { id:event.pointerId, startX:event.clientX, startY:event.clientY, left:bounds.left, top:bounds.top, moved:false };
    root.classList.add('reva-dragging');
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveDrag = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const x = event.clientX - drag.startX, y = event.clientY - drag.startY;
    if (Math.abs(x) + Math.abs(y) > 5) drag.moved = true;
    if (!drag.moved) return;
    root.style.left = `${drag.left + x}px`; root.style.top = `${drag.top + y}px`; root.style.right = 'auto'; root.style.bottom = 'auto';
    clampPosition();
  };
  const endDrag = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const moved = drag.moved; drag = null; root.classList.remove('reva-dragging');
    if (moved) {
      suppressLauncherClick = true;
      try { localStorage.setItem(storedPosition, JSON.stringify({ left:Number.parseFloat(root.style.left), top:Number.parseFloat(root.style.top) })); } catch (_) {}
      window.setTimeout(() => { suppressLauncherClick = false; }, 0);
    }
  };
  const launcher = root.querySelector('.reva-launcher');
  launcher.style.touchAction = 'none'; launcher.style.cursor = 'grab';
  panel.querySelector('.reva-head').style.touchAction = 'none'; panel.querySelector('.reva-head').style.cursor = 'grab';
  launcher.addEventListener('pointerdown', startDrag);
  panel.querySelector('.reva-head').addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', clampPosition);
  const add = (role, text) => { const p=document.createElement('p'); p.className=`reva-message reva-message--${role}`; String(text).split(/(https?:\/\/[^\s]+)/g).forEach((part) => { if(/^https?:\/\//.test(part)){const a=document.createElement('a');a.href=part;a.target='_blank';a.rel='noopener';a.textContent='Buka tautan ↗';p.appendChild(a)}else{p.appendChild(document.createTextNode(part))} }); messages.appendChild(p); messages.scrollTop=messages.scrollHeight; };
  launcher.addEventListener('click', () => { if(suppressLauncherClick) return; root.classList.toggle('open'); launcher.setAttribute('aria-expanded', root.classList.contains('open')); requestAnimationFrame(clampPosition); if(root.classList.contains('open')) input.focus(); });
  root.querySelector('.reva-close').addEventListener('click', () => root.classList.remove('open'));
  form.addEventListener('submit', async (event) => { event.preventDefault(); const message=input.value.trim(); if(!message) return; add('visitor', message); history.push({role:'user',text:message}); input.value=''; const pending=document.createElement('p'); pending.className='reva-message reva-message--reva'; pending.textContent='Reva sedang mengetik…'; messages.appendChild(pending); messages.scrollTop=messages.scrollHeight; try{const response=await fetch('/api/reva',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,history})}); const data=await response.json(); pending.remove(); const answer=data.answer||'Maaf, Reva belum dapat menjawab saat ini.'; history.push({role:'model',text:answer}); add('reva',answer)}catch(_){pending.remove();add('reva','Koneksi Reva sedang tidak tersedia. Silakan coba lagi.')}});
})();
