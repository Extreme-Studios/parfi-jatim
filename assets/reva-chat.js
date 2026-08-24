(() => {
  const root = document.querySelector('.reva-chat');
  if (!root) return;
  const panel = root.querySelector('.reva-panel');
  const messages = root.querySelector('.reva-messages');
  const form = root.querySelector('.reva-form');
  const input = root.querySelector('input');
  const add = (role, text) => { const p=document.createElement('p'); p.className=`reva-message reva-message--${role}`; p.textContent=text; messages.appendChild(p); messages.scrollTop=messages.scrollHeight; };
  root.querySelector('.reva-launcher').addEventListener('click', () => { root.classList.toggle('open'); root.querySelector('.reva-launcher').setAttribute('aria-expanded', root.classList.contains('open')); if(root.classList.contains('open')) input.focus(); });
  root.querySelector('.reva-close').addEventListener('click', () => root.classList.remove('open'));
  form.addEventListener('submit', async (event) => { event.preventDefault(); const message=input.value.trim(); if(!message) return; add('visitor', message); input.value=''; const pending=document.createElement('p'); pending.className='reva-message reva-message--reva'; pending.textContent='Reva sedang mengetik…'; messages.appendChild(pending); messages.scrollTop=messages.scrollHeight; try{const response=await fetch('/api/reva',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})}); const data=await response.json(); pending.remove(); add('reva',data.answer||'Maaf, Reva belum dapat menjawab saat ini.')}catch(_){pending.remove();add('reva','Koneksi Reva sedang tidak tersedia. Silakan coba lagi.')}});
})();
