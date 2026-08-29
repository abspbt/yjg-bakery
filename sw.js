const CACHE_NAME = 'pwa-cache-v71';
const urlsToCache = ['/', '/index.html', '/about.html', '/faq.html', '/cake.html', '/bagel.html', '/salad.html', '/manifest.json'];

// 導覽請求等網路回應的時限——純網路優先（無逾時）在網路很慢或卡住時會讓
// 整頁一直轉圈，逾時就先用快取讓畫面出現，網路仍在背景跑完並更新快取。
// 2.5 秒是折衷值：太短在多數行動網路環境下來不及回應，太長會讓慢網路下的
// 開啟體感變慢。
const NAVIGATION_NETWORK_TIMEOUT_MS = 2500;

// 若途中被導向過（例如 /about.html 被 Cloudflare 301 導向 /about），
// response.redirected 會是 true；這種 response 直接存進 Cache 或拿去
// respondWith() 回應 navigate 請求，Safari 都會丟出「Response served by
// service worker has redirections」整頁打不開。用 new Response() 重新包
// 一層即可拿掉導向紀錄，內容不變。
function stripRedirected(response) {
  return response.redirected ? new Response(response.body, response) : response;
}

// 安裝並強制等待接管
// 不能直接用 cache.addAll(urlsToCache)：它內部的 fetch 一樣會跟隨
// 301 導向，存進快取的就是「經過導向」的 response，之後 caches.match()
// 命中的都是這個壞掉的版本，跟 fetch 事件裡的防護完全無關，照樣會讓
// Safari 打不開頁面。改成逐一 fetch 後用 stripRedirected() 處理過再存。
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(urlsToCache.map(url =>
        fetch(url).then(response => cache.put(url, stripRedirected(response)))
      ))
    )
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

// 攔截網路請求
// 頁面導覽（HTML）用限時網路搶先：stale-while-revalidate 對 HTML 來說，
// 使用者這次打開永遠看到的是「上一次」快取的舊內容，新版要等下一次重新
// 整理才生效；手機（尤其 iOS 加到主畫面後）常常是從背景喚醒而非真正重新
// 整理，導致新內容遲遲送不到使用者手上。HTML 檔案小、網路成本低，改成
// 優先打網路拿最新版；但網路很慢或卡住時不能無限期等待（純 network-first
// 沒有逾時保護），逾時或離線才退回快取，網路仍在背景跑完並更新快取。
// 其餘靜態資源（圖片／字型／manifest 等）維持 cache-first + 背景更新，
// 兼顧秒開與最終一致。
self.addEventListener('fetch', event => {
  const request = event.request;

  // 只處理 GET；POST 等一律直接走網路
  if (request.method !== 'GET') return;

  // 尊重 no-store：完全不碰 Cache Storage
  if (request.cache === 'no-store') return;

  const isNavigation = request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));

  if (isNavigation) {
    event.respondWith(
      caches.match(request).then(async cached => {
        const networkFetch = fetch(request).then(response => {
          const safeResponse = stripRedirected(response);
          if (safeResponse && safeResponse.ok) {
            const copy = safeResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return safeResponse;
        }).catch(() => cached);

        const timedOut = new Promise(resolve => setTimeout(resolve, NAVIGATION_NETWORK_TIMEOUT_MS));
        const fast = await Promise.race([networkFetch, timedOut]);
        if (fast) return fast;
        if (cached) return cached;
        const resolved = await networkFetch;
        return resolved || new Response(
          '目前離線，且尚無可用的快取版本，請確認網路連線後再試一次。',
          { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
        );
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        const safeResponse = stripRedirected(response);
        // 跨網域資源為 opaque（status 0），不能只看 response.ok
        if (safeResponse && (safeResponse.ok || safeResponse.type === 'opaque')) {
          const copy = safeResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return safeResponse;
      }).catch(() => cached);

      // 有快取先回應，網路更新在背景進行；沒快取才等網路
      return cached || networkFetch;
    })
  );
});
