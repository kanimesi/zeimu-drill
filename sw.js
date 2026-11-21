/* 租税法ドリル Service Worker — HTML（ナビゲーション）はネットワーク優先（更新を届けるため。失敗時はキャッシュにフォールバック）、それ以外は cache-first のオフライン対応 */
var CACHE_NAME = 'zeimu-drill-v2';
var PRECACHE_URLS = [
  './',
  './index.html'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(key) {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  var accept = event.request.headers.get('accept') || '';
  var isHtml = event.request.mode === 'navigate' || accept.indexOf('text/html') !== -1;
  if (isHtml) {
    // ネットワーク優先：最新を取得できたらそれを返し、キャッシュも更新する。失敗時はキャッシュにフォールバック
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function() {
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          return caches.match('./index.html');
        });
      })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      });
    })
  );
});
