// Stockage local clé/valeur (IndexedDB). Repli en mémoire si IndexedDB est indisponible.

const DB_NAME = 'supple-leopard';
const STORE = 'kv';
const mem = new Map();
let dbPromise;

function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    }).catch(() => null);
  }
  return dbPromise;
}

function run(d, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req && req.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function get(key, fallback) {
  const d = await db();
  if (!d) return mem.has(key) ? mem.get(key) : fallback;
  const v = await run(d, 'readonly', (s) => s.get(key));
  return v === undefined ? fallback : v;
}

export async function set(key, value) {
  const d = await db();
  if (!d) { mem.set(key, value); return; }
  await run(d, 'readwrite', (s) => s.put(value, key));
}

export async function exportAll() {
  const d = await db();
  if (!d) return Object.fromEntries(mem);
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, 'readonly');
    const s = t.objectStore(STORE);
    const keys = s.getAllKeys();
    const vals = s.getAll();
    t.oncomplete = () => resolve(Object.fromEntries(keys.result.map((k, i) => [k, vals.result[i]])));
    t.onerror = () => reject(t.error);
  });
}

export async function importAll(obj) {
  for (const [k, v] of Object.entries(obj)) await set(k, v);
}

export async function clearAll() {
  mem.clear();
  const d = await db();
  if (d) await run(d, 'readwrite', (s) => s.clear());
}

// Demande au navigateur de ne pas purger les données (important sans compte ni serveur).
export async function requestPersistence() {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function isPersistent() {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}
