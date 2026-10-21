
const CACHE_NAME = 'app-surtok-v1';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './Logo%20Surtok.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        for (const file of APP_FILES) {
          try {
            const response = await fetch(file, { cache: 'no-store' });
            if (response.ok) {
              await cache.put(file, response);
            }
          } catch (error) {
            console.warn('Gagal menyimpan cache:', file, error);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('app-surtok-') &&
                key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Jangan mengintervensi permintaan ke domain lain,
  // termasuk layanan Supabase.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, copy))
            .catch((error) =>
              console.warn('Gagal memperbarui cache:', error)
            );
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) return cached;

        if (request.mode === 'navigate') {
          const appPage = await caches.match('./index.html');
          if (appPage) return appPage;
        }

        return new Response(
          'Halaman tidak tersedia. Periksa koneksi internet Anda.',
          {
            status: 503,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8'
            }
          }
        );
      })
  );
});
