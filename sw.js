const CACHE_NAME = 'pwa-cache-v22';
const urlsToCache = ['/', '/index.html', '/about.html', '/faq.html', '/cake.html', '/bagel.html', '/salad.html', '/manifest.json'];

// 安裝並強制等待接管
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// 啟動並清除舊快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 攔截網路請求：cache-first + 背景更新（stale-while-revalidate）
// 先前為純 cache-first 且完全不回頭打網路，導致已安裝的裝置永遠停留在
// 舊版頁面，任何後續修正都送不到使用者手上。改為有快取先秒回、同時在
// 背景抓最新版寫回快取，下次開啟即為新版。
self.addEventListener('fetch', event => {
  const request = event.request;

  // 只處理 GET；POST 等一律直接走網路
  if (request.method !== 'GET') return;

  // 尊重 no-store：完全不碰 Cache Storage
  if (request.cache === 'no-store') return;

  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        // 跨網域資源為 opaque（status 0），不能只看 response.ok
        if (response && (response.ok || response.type === 'opaque')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);

      // 有快取先回應，網路更新在背景進行；沒快取才等網路
      return cached || networkFetch;
    })
  );
});
