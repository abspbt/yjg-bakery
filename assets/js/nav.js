/* 站內導覽：攔截同網域連結點擊，改用 fetch 換頁，網址列仍會更新（SEO/分享
   網址不受影響），但不整頁重新載入，並沿用 view-transition-name 標記的頁首／
   頁尾固定區與 <main> 淡入淡出設定（見 style.css）。
   不支援 fetch 或發生錯誤時，直接退回原生整頁跳轉，不影響可用性。 */
(function () {
  /* 站內連結／資源一律用相對路徑，網站才能同時掛在網域根目錄與子路徑
     （例：GitHub Pages 專案頁 /yjg-bakery/）底下，見 CLAUDE.md 路徑慣例。

     但 <head> 裡的相對路徑有個例外要處理：換頁只用 pushState 改網址、不重新
     載入文件，瀏覽器之後若再去解析 <head> 的相對 URL，會以「新網址」為基準，
     favicon 就變成 /about/../assets/img/favicon.svg 之類的錯誤路徑而 404。
     載入時先把它們讀成絕對 URL 再寫回去（讀 .href 得到的就是解析後的絕對值），
     之後網址怎麼變都不會再被重算。 */
  function freezeHeadUrls() {
    var links = document.querySelectorAll('head link[href]');
    Array.prototype.forEach.call(links, function (link) {
      link.setAttribute('href', link.href);
    });
  }

  function shuffleGrid() {
    var grid = document.querySelector('.grid');
    if (!grid) return;
    var cells = Array.prototype.slice.call(grid.children);
    for (var i = cells.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = cells[i]; cells[i] = cells[j]; cells[j] = tmp;
    }
    cells.forEach(function (c) { grid.appendChild(c); });
  }

  /* 換頁時要跟著換的 <head> 欄位：[選擇器, 要複製的屬性]。
     每頁的 <title>／description／og／canonical 都是獨立的，
     換頁若不同步，分享出去的網址與搜尋引擎看到的中繼資料會停在前一頁。 */
  var HEAD_SYNC = [
    ['meta[name="description"]', 'content'],
    ['meta[property="og:title"]', 'content'],
    ['meta[property="og:description"]', 'content'],
    ['link[rel="canonical"]', 'href']
  ];

  function syncHead(doc) {
    document.title = doc.title;
    HEAD_SYNC.forEach(function (field) {
      var source = doc.querySelector(field[0]);
      var target = document.querySelector(field[0]);
      if (source && target) target.setAttribute(field[1], source.getAttribute(field[1]));
    });
  }

  /* 每頁 body 尾端的 #icon-sprite 只放「該頁自己用到的 symbol」，直接輸入網址
     載入時即自給自足。但換頁只替換 <main>，sprite 不會跟著換，新內容的
     <use href="#icon-x"> 就可能指向本頁沒有的 symbol（圖示變空白）。
     因此換頁時先把新頁面缺少的 symbol 補進本地 sprite。
     必須在替換 <main> 之前呼叫：<use> 只在插入當下解析一次，先插入內容
     再補 symbol 的話，已渲染的圖示不會自行補畫。 */
  function mergeSprite(doc) {
    var defs = document.querySelector('#icon-sprite defs');
    var incoming = doc.querySelectorAll('#icon-sprite symbol');
    if (!defs) return;
    Array.prototype.forEach.call(incoming, function (symbol) {
      if (!document.getElementById(symbol.id)) {
        defs.appendChild(document.importNode(symbol, true));
      }
    });
  }

  function applyDocument(doc) {
    syncHead(doc);
    document.body.className = doc.body.className;
    mergeSprite(doc);

    var newQuicknav = doc.querySelector('.grid-hint, .page-nav');
    var oldQuicknav = document.querySelector('.grid-hint, .page-nav');
    if (newQuicknav && oldQuicknav) {
      oldQuicknav.outerHTML = newQuicknav.outerHTML;
    }

    var newMain = doc.querySelector('main');
    var oldMain = document.querySelector('main');
    if (newMain && oldMain) {
      oldMain.innerHTML = newMain.innerHTML;
    }

    shuffleGrid();
    window.scrollTo(0, 0);
    if (oldMain) {
      oldMain.setAttribute('tabindex', '-1');
      oldMain.focus({ preventScroll: true });
    }
  }

  function navigate(url, push) {
    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('bad status');
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var run = function () { applyDocument(doc); };
        if (document.startViewTransition) {
          document.startViewTransition(run);
        } else {
          run();
        }
        if (push) history.pushState(null, '', url);
      })
      .catch(function () {
        window.location.href = url;
      });
  }

  function isNavigableClick(event, link) {
    if (event.defaultPrevented || event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download')) return false;
    var url;
    try {
      url = new URL(link.href, location.href);
    } catch (e) {
      return false;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.origin !== location.origin) return false;
    /* 指向目前這一頁：純錨點交給瀏覽器原生跳轉，指到自己則不必重新抓一次 */
    if (url.pathname === location.pathname && url.search === location.search) return false;
    return url;
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    if (!link) return;
    var url = isNavigableClick(event, link);
    if (!url) return;
    event.preventDefault();
    navigate(url.pathname + url.search, true);
  });

  window.addEventListener('popstate', function () {
    navigate(location.pathname + location.search, false);
  });

  freezeHeadUrls();
  shuffleGrid();
})();
