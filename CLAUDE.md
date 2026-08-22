# CLAUDE.md — 歪嘴雞烘焙官網 專案規範

此檔案為專案全程共用規範，Claude Code 在每次工作時都應遵守以下規則，無需使用者重複說明。

（2026-08-22：本站改版，架構從「視覺像單頁、實際多頁＋nav.js SPA 換頁」全面換成「傳統多頁靜態站＋PWA 離線快取」，本檔案內容已配合新架構重寫，舊版 SPA／icon sprite／相對路徑規則不再適用。）

## 品牌
- 名稱：歪嘴雞烘焙
- 標語：每一份貝果、蛋糕與沙拉，都是手作的心意。
- 正式網域：`https://yjg-bakery.com`（Cloudflare Pages「連結到 Git」部署，監看本 repo 的 `main` 分支；`wrangler.toml` 只給 Cloudflare Dashboard 讀，本身不含任何邏輯）

## 網站架構
- **傳統多頁靜態站，不是 SPA**：每頁都是完全獨立、自足的 `.html` 檔，彼此用一般 `<a href="xxx.html">` 連結跳轉，交由瀏覽器原生換頁，沒有 client-side router，沒有 `nav.js` fetch 換內容那一套
- 每頁各自擁有完整 `<head>`（獨立 `<title>`／meta description／OG／Twitter card／JSON-LD `Bakery` schema／canonical），SEO 各頁互不共用
- 每頁的 CSS 都寫在自己的 `<style>` 內（無外部共用 CSS 檔，也未使用 Tailwind），對應頁面若要調整樣式直接改該頁 `<style>`，不要假設有全站共用樣式表
- 每頁結尾都有一段幾乎相同的 inline `<script>`：註冊 `touchstart` passive listener（避免 iOS Safari `:active` 延遲）＋註冊 `/sw.js`。新增頁面時比照既有頁面複製這段，不要漏掉

## 頁面清單
| 檔案 | 說明 |
|---|---|
| index.html | 首頁 |
| about.html | 關於我們（含實體店資訊：地址／地圖；不放電話——工作時雙手多接觸食材，不便接聽） |
| bagel.html | 手作貝果介紹 |
| cake.html | 蛋糕訂製 |
| salad.html | 溫沙拉 |
| faq.html | 常見問題 |

側邊導覽（各頁重複出現的 `<nav class="side-nav">`）需與此清單同步；新增/刪除頁面時記得所有頁面的 nav 區塊都要一起改。

## PWA / Service Worker（`sw.js`）
- 策略：cache-first + 背景 stale-while-revalidate（先回快取秒開，同時背景抓新版寫回快取，下次開啟即最新版）；只處理 GET，尊重 `no-store`
- **每次網站內容有實質更新，一定要把 `sw.js` 開頭的 `CACHE_NAME`（目前 `pwa-cache-v22`）版本號往上加**，否則已安裝到主畫面的裝置會被卡在舊版本、新內容送不到使用者手上（這是先前踩過的坑，見檔案內註解）
- `urlsToCache` 需列出所有頁面路徑，新增頁面時記得同步加進去
- `manifest.json`：`name`/`short_name` 為「歪嘴雞烘焙」，`start_url: "/"`，`background_color`/`theme_color` 為 `#2A1F20`，圖示為 `assets/img/icon-192.png`／`icon-512.png`（由 `assets/img/favicon.svg` 光柵化產生，維持同一個金色圓環 mark，不要換成不同構圖，以免品牌不一致）

## 路徑慣例（與舊版不同，注意）
- 本站部署在**網域根目錄**（Cloudflare Pages 自訂網域，不是 GitHub Pages 專案子路徑），所以**可以使用 root-absolute 路徑**（如 `/manifest.json`、`/sw.js`），不需要像舊版那樣堅持全站相對路徑
- 頁面內圖片資源目前用相對路徑 `assets/img/...`，維持現狀即可，不必刻意統一成絕對路徑
- `canonical`／`sitemap.xml`／`robots.txt`／`og:image`／`twitter:image` 一律用絕對網址 `https://yjg-bakery.com/...`

## 配色
- 背景：`#2A1F20`（深咖啡棕；`<meta name="theme-color">` 同色，讓 iOS 狀態列與底圖融合；首頁背景漸層上緣 `#312425`／下緣 `#1F171C`）
- 文字：白色系 `#fff` / `rgba(255,255,255,.78~.88)`（`--ink` / `--ink-dim` / `--ink-soft`）
- 強調色／金色重點：`#f4e3c1`
- LINE 導流按鈕固定用 LINE 官方綠 `#06C755`，不要換成品牌金色，維持可辨識度

## 字型
- 品牌標題字型為自架子集化 `woff2`（`Brand LXGW WenKai TC Light`），以 base64 內嵌在各頁 `<style>` 的 `@font-face` 裡，避免多一個網路請求
- 目前只子集化了「歪嘴雞烘焙」這幾個字（見 `fonts/` 內授權檔 `LICENSE-LXGW-WenKai-TC.txt` 與原始 woff2）。**若要用這個字型顯示子集化範圍以外的文字，字會顯示不出來（fallback 到 serif），必須重新子集化並更新 base64**，不要假設任何中文字都能正常顯示

## 圖示
- Favicon／App icon 統一用 `assets/img/favicon.svg`（24×24 viewBox，深底＋金色線條圓環），全站沒有另外的 line-icon sprite 系統（舊版 icon sprite／`mergeSprite()` 慣例已隨 SPA 架構一起淘汰）

## 圖片規範
- 格式：WebP（`logo.webp`／`about-chef.webp`／`bagle.webp`／`warmsalad.webp`），首頁背景例外用 `home-bg.jpg` 並以 `<link rel="preload">` 預載
- 一律加 `loading="lazy"`（首屏關鍵圖除外）、`width`/`height` 屬性避免版面跳動
- alt 文字需含地區＋品項關鍵字（例如「高雄手作貝果 職人手工烘焙貝果特寫」）

## 效能優先原則（PageSpeed Insights）
- 避免大量 JS 動畫與高運算效果；沒有 client-side router、沒有大型 JS framework，維持現狀
- 圖示／光暈效果一律用 CSS/SVG 實作，不用圖片模擬
- 圖片全面壓縮＋lazy load＋WebP＋關鍵圖 preload

## 新增／修改頁面時的檢查清單
1. `<head>` 內 title／description／OG／Twitter／JSON-LD／canonical 是否都填好且用絕對網址
   - `<title>` 需包含主要關鍵字＋地區（「品項｜高雄鳳山手工烘焙坊・歪嘴雞烘焙」這種格式），不要只放品牌名，SERP 顯示空間留白等於浪費排名機會
   - 每頁都要有 `Bakery` JSON-LD（不是只有首頁/關於我們），`servesCuisine`／`address` 照現有頁面複製即可
   - `og:image`／`twitter:image` 一律用**橫式（約 1.91:1）**圖片，直式人像/情境照會在 FB／LINE／Twitter 分享預覽被裁切難看；沒有現成橫式圖就參考 `assets/img/og-cover.jpg`／`about-chef-og.jpg` 的做法另外裁一張，並補上對應的 `og:image:width`／`og:image:height`／`og:image:alt`
2. 側邊 `<nav class="side-nav">` 是否所有頁面同步更新
3. 頁尾 inline `<script>`（touchstart + `/sw.js` 註冊）是否存在
4. 若改動了會被快取的既有頁面內容，`sw.js` 的 `CACHE_NAME` 版本號是否有升版
5. 新頁面路徑是否加進 `sw.js` 的 `urlsToCache`、`sitemap.xml`
6. 圖片是否為 WebP、`loading="lazy"`、有描述性 alt
