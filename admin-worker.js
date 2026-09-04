const DB_NAME = 'parfi-admin-jobs';
const STORE_NAME = 'jobs';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
function database() { return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, 1); request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' }); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function saveJob(job) { const db = await database(); return new Promise((resolve, reject) => { const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(job); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); }
async function jobs() { const db = await database(); return new Promise((resolve, reject) => { const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll(); request.onsuccess = () => resolve(request.result || []); request.onerror = () => reject(request.error); }); }
async function notify(message) { const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); clients.forEach(client => client.postMessage(message)); }
async function runJob(job) {
  const pending = { id: job.id, contentType: job.contentType, status: 'processing', startedAt: job.startedAt };
  await saveJob(pending); await notify({ kind: 'parfi-job', job: pending });
  try {
    const response = await fetch('/api/generate-content', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${job.token}` }, body: JSON.stringify(job.body), cache: 'no-store' });
    const data = await response.json().catch(() => ({})); if (!response.ok || !data.ok) throw Error(data.error || 'Konten gagal dibuat.');
    const complete = { ...pending, status: 'complete', item: data.item, completedAt: Date.now() }; await saveJob(complete); await notify({ kind: 'parfi-job', job: complete });
  } catch (error) { const failed = { ...pending, status: 'error', error: error.message || 'Konten gagal dibuat.', completedAt: Date.now() }; await saveJob(failed); await notify({ kind: 'parfi-job', job: failed }); }
}
self.addEventListener('message', event => { const data = event.data || {}; if (data.kind === 'parfi-generate' && data.job) event.waitUntil(runJob(data.job)); if (data.kind === 'parfi-job-status') event.waitUntil(jobs().then(list => notify({ kind: 'parfi-job-list', jobs: list }))); });
