// =====================================================================
// Service Worker — timer-pwa-v3
// =====================================================================
//
// ■ キャッシュ戦略
//   index.html → Network First（常に最新 JS を取得、オフライン時のみキャッシュ）
//   静的アセット → Cache First（高速化）
//
// ■ v2 → v3 に変更した理由
//   CSS / JS を外部ファイルに分離したため、新規ファイルを STATIC_ASSETS に追加。
//   バージョンを変えることで activate 時に古いキャッシュを削除し、
//   新しいファイル構成が確実に読み込まれるようにする。
// =====================================================================

var CACHE_NAME    = 'timer-pwa-v3';
var OFFLINE_URL   = './index.html';
var STATIC_ASSETS = [
  './manifest.json',
  './style.css',
  './js/audio.js',
  './js/timer.js',
  './js/app.js',
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

// activate: 古いキャッシュ（v1, v2 など）をすべて削除してから制御を引き継ぐ
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

  var url    = new URL(event.request.url);
  var isHTML = url.pathname.endsWith('.html') ||
               url.pathname.endsWith('/') ||
               url.pathname === '/';

  if (isHTML) {
    // ── Network First ──────────────────────────────────────────────
    // 最新の index.html（= 最新 JS）を常に取得する。
    // オフライン時のみキャッシュを返す。
    event.respondWith(
      fetch(event.request).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, copy);
        });
        return response;
      }).catch(function () {
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
