
const CACHE_NAME = 'app-surtok-v2';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './Logo%20Surtok.png'
];

// Instalasi service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        for (const file of APP_FILES) {
          try {
            const response = await fetch(file, {
              cache: 'no-store'
            });

            if (response.ok) {
              await cache.put(file, response);
            }
          } catch (error) {
            console.warn('File tidak berhasil di-cache:', file);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

// Aktifkan versi baru dan bersihkan cache lama milik App Surtok
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

// Ambil data dari jaringan, gunakan cache jika offline
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Jangan mengubah permintaan ke domain lain, termasuk Supabase
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, copy))
            .catch((error) => {
              console.warn('Pembaruan cache gagal:', error);
            });
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
          'Koneksi internet tidak tersedia dan halaman belum tersimpan.',
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
