// Hale Servis - Service Worker
// Sayfayı önbelleğe alır, internet kesilse bile uygulama açılır.
// Veri Apps Script üzerinden geldiği için her açılışta tazedir.

const CACHE_NAME = 'hale-servis-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon-32.png',
  './icons/icon-16.png'
];

// Kurulum: temel dosyalari önbellege al
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Aktivasyon: eski önbellekleri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch stratejisi:
// - Apps Script API çağrıları: her zaman ağdan (cache'lenmemeli, veri her seferinde taze)
// - Diğer her şey (HTML, ikonlar, manifest): network-first, başarısızsa cache'ten
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Apps Script çağrılarını cache'e karıştırma
  if (url.hostname.indexOf('script.google.com') >= 0 ||
      url.hostname.indexOf('googleusercontent.com') >= 0) {
    return; // tarayıcı normal yapsın
  }

  // Sadece GET istekleri için
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Başarılı yanıtı cache'e kopyala
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
