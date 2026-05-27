// =====================================================================
// Service Worker — timer-pwa-v2
// =====================================================================
//
// ■ キャッシュ戦略
//   index.html → Network First（常に最新 JS を取得、オフライン時のみキャッシュ）
//   静的アセット → Cache First（高速化）
//
// ■ v1 → v2 に変更した理由
//   v1 のキャッシュが残っていると修正した index.html が PWA に届かない。
//   バージョンを変えることで activate 時に古いキャッシュを削除し、
//   新しいファイルが確実に読み込まれるようにする。
// =====================================================================

var CACHE_NAME   = 'timer-pwa-v2';
var OFFLINE_URL  = './index.html';
var STATIC_ASSETS = [
  './manifest.json',
  './icons/icon.svg',
  './icons/apple-touch-icon.svg'
];

// install: 静的アセットを事前キャッシュ + index.html もオフライン用にキャッシュ
self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll([OFFLINE_URL].concat(STATIC_ASSETS));
    })
  );
});

// activate: 古いキャッシュ（v1 など）をすべて削除してから制御を引き継ぐ
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// fetch: HTML は Network First、それ以外は Cache First
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);
  var isHTML = url.pathname.endsWith('.html') ||
               url.pathname.endsWith('/') ||
               url.pathname === '/';

  if (isHTML) {
    // ── Network First ──────────────────────────────────────────────
    // 最新の index.html（= 最新 JS）を常に取得する。
    // オフライン時のみキャッシュを返す。
    event.respondWith(
      fetch(event.request).then(function (response) {
        // 成功したらキャッシュを更新してから返す
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, copy);
        });
        return response;
      }).catch(function () {
        // オフライン: キャッシュから返す
        return caches.match(OFFLINE_URL);
      })
    );
  } else {
    // ── Cache First ────────────────────────────────────────────────
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        if (cached) return cached;
        return fetch(event.request).then(function (response) {
          if (response.ok && event.request.url.startsWith(self.location.origin)) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return response;
        }).catch(function () {
          return caches.match(OFFLINE_URL);
        });
      })
    );
  }
});
