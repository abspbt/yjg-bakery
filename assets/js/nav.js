/* 站內導覽：攔截同網域連結點擊，改用 fetch 換頁，網址列仍會更新（SEO/分享
   網址不受影響），但不整頁重新載入，並沿用 view-transition-name 標記的頁首／
   頁尾固定區與 <main> 淡入淡出設定（見 style.css）。
   不支援 fetch 或發生錯誤時，直接退回原生整頁跳轉，不影響可用性。 */
(function () {
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

  function setMeta(selector, attr, value) {
    var el = document.querySelector(selector);
    if (el && value != null) el.setAttribute(attr, value);
  }

  function applyDocument(doc) {
    document.title = doc.title;
    setMeta('meta[name="description"]', 'content', doc.querySelector('meta[name="description"]') && doc.querySelector('meta[name="description"]').getAttribute('content'));
    setMeta('meta[property="og:title"]', 'content', doc.querySelector('meta[property="og:title"]') && doc.querySelector('meta[property="og:title"]').getAttribute('content'));
    setMeta('meta[property="og:description"]', 'content', doc.querySelector('meta[property="og:description"]') && doc.querySelector('meta[property="og:description"]').getAttribute('content'));
    setMeta('link[rel="canonical"]', 'href', doc.querySelector('link[rel="canonical"]') && doc.querySelector('link[rel="canonical"]').getAttribute('href'));

    document.body.className = doc.body.className;

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
      oldMain.focus();
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
    if (url.pathname === location.pathname && url.hash) return false;
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

  shuffleGrid();
})();
