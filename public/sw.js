// 最小 service worker：不做任何快取，只是讓瀏覽器判定網站符合可安裝條件
// （Android Chrome 的 beforeinstallprompt 需要有註冊 fetch handler 的 service worker）
self.addEventListener('fetch', () => {});
