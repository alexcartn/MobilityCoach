// Service worker : tout l'app shell est mis en cache à l'installation (hors ligne complet).
// Le bloc stamp est réécrit par `node tools/stamp.mjs` : ne pas l'éditer à la main.

// <stamp>
const VERSION = '1869b324ec';
const ASSETS = [
  "./",
  "css/app.css",
  "fonts/bricolage-grotesque.woff2",
  "fonts/libre-franklin.woff2",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/icon.svg",
  "index.html",
  "js/app.js",
  "js/assessment.js",
  "js/body.js",
  "js/charts.js",
  "js/data/mobs-hips.js",
  "js/data/mobs-lower.js",
  "js/data/mobs-lowerleg.js",
  "js/data/mobs-rest.js",
  "js/data/mobs-shoulders.js",
  "js/data/mobs-upper.js",
  "js/data/mobs.js",
  "js/data/motions.js",
  "js/data/profile.js",
  "js/data/rules.js",
  "js/data/tests.js",
  "js/data/zones.js",
  "js/diagram.js",
  "js/ics.js",
  "js/install.js",
  "js/motion.js",
  "js/routine.js",
  "js/sessions.js",
  "js/settings.js",
  "js/stats.js",
  "js/store.js",
  "js/theme.js",
  "js/ui.js",
  "js/version.js",
  "js/views/bilan.js",
  "js/views/library.js",
  "js/views/pain.js",
  "js/views/profil.js",
  "js/views/progress.js",
  "js/views/retest.js",
  "js/views/session.js",
  "js/views/settings.js",
  "js/views/stats.js",
  "js/views/today.js",
  "js/views/zone.js",
  "manifest.webmanifest"
];
// </stamp>

const CACHE = `sl-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('sl-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// La mise à jour s'applique quand l'utilisateur appuie sur « Actualiser ».
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) =>
      hit || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./') : Response.error())),
    ),
  );
});
