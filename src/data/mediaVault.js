// Local prototype media store: blobs live in IndexedDB, NOT localStorage.
// Never use this browser store as a public publishing or moderation authority.
const DB = 'chirpr-demo-media-v1';
const STORE = 'attachments';
let dbPromise;
function openDb() {
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('Your browser does not support local media storage.'));
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open media storage.'));
  }).catch(error => { dbPromise = null; throw error; });
  return dbPromise;
}
const allowed = new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']);
export function validateMedia(file) {
  if (!file || !allowed.has(file.type)) throw new Error('Choose a JPG, PNG, WebP, GIF, MP4, or WebM file.');
  const kind = file.type.startsWith('video/') ? 'video' : 'image';
  const limit = kind === 'video' ? 40 * 1024 * 1024 : 12 * 1024 * 1024;
  if (file.size <= 0 || file.size > limit) throw new Error(`${kind === 'video' ? 'Video' : 'Image'} must be smaller than ${Math.round(limit / 1024 / 1024)} MB.`);
  return kind;
}
export async function storeMedia(file, warning = '', altText = '') {
  const kind = validateMedia(file);
  const db = await openDb();
  const id = (crypto.randomUUID?.() || `media-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put({ id, file, createdAt: Date.now() });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('Unable to save media. Check available storage.'));
    transaction.onabort = () => reject(transaction.error || new Error('Unable to save media.'));
  });
  return { id, kind, name: file.name.slice(0, 120), alt: String(altText).slice(0, 180), mime: file.type, bytes: file.size,
    warning: String(warning).slice(0, 120),
    moderation: { status: 'pending_review', reasons: ['Awaiting content review'] } };
}
export async function readMedia(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result?.file || null);
    request.onerror = () => reject(request.error);
  });
}
export async function removeMedia(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
