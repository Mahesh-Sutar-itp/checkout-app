const CACHE_NAME = 'shopfast-v1'

// Ye files offline bhi kaam karengi
const STATIC_ASSETS = [
  '/',
  '/index.html',
]

// ===== INSTALL =====
// Pehli baar SW load hone par
self.addEventListener('install', (event) => {
  console.log('SW: Installing... 🔧')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Caching static files')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
  // ↑ Turant activate ho jao
  //   Purane SW ka wait mat karo
})

// ===== ACTIVATE =====
// Purana cache delete karo
self.addEventListener('activate', (event) => {
  console.log('SW: Activating... ✅')
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          // ↑ Purane cache versions dhundho
          .map(key => {
            console.log('SW: Deleting old cache:', key)
            return caches.delete(key)
          })
      )
    })
  )
  self.clients.claim()
  // ↑ Sab tabs pe turant control lo
})

// ===== FETCH =====
// Har network request intercept karo
self.addEventListener('fetch', (event) => {

  // API calls cache mat karo
  // (Fresh data chahiye hamesha)
  if (
    event.request.url.includes('fakestoreapi') ||
    event.request.url.includes('jsonplaceholder')
  ) {
    return
    // ↑ Normal fetch hone do
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // ✅ Online hai - response cache mein save karo
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone)
        })
        return response
      })
      .catch(() => {
        // ❌ Offline hai - cache se do
        return caches.match(event.request)
          .then(cachedResponse => {

            // Cache mein hai? Do!
            if (cachedResponse) return cachedResponse

            // Cache mein bhi nahi? Offline page!
            return new Response(
              `<!DOCTYPE html>
              <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" 
                    content="width=device-width, initial-scale=1.0">
                  <title>ShopFast - Offline</title>
                  <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                      font-family: sans-serif;
                      background: #f0f2f5;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      height: 100vh;
                      text-align: center;
                      padding: 20px;
                    }
                    .emoji { font-size: 80px; margin-bottom: 20px; }
                    h1 { color: #1a1a2e; margin-bottom: 12px; font-size: 24px; }
                    p  { color: #666; margin-bottom: 24px; font-size: 16px; }
                    button {
                      padding: 14px 28px;
                      background: #e94560;
                      color: white;
                      border: none;
                      border-radius: 10px;
                      cursor: pointer;
                      font-size: 16px;
                      font-weight: bold;
                    }
                    button:hover { background: #c73652; }
                  </style>
                </head>
                <body>
                  <div class="emoji">📶</div>
                  <h1>You Are Offline!</h1>
                  <p>Please check your internet connection and try again</p>
                  <button onclick="location.reload()">
                    🔄 Retry
                  </button>
                </body>
              </html>`,
              {
                status: 200,
                headers: { 'Content-Type': 'text/html' }
              }
            )
          })
      })
  )
})