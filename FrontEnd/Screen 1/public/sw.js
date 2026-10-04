const CACHE_NAME = 'lecturepulse-shell-v2'
const SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest']

self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data?.json() || {} } catch { /* Malformed data must not crash the worker. */ }
  event.waitUntil(self.registration.showNotification(String(payload.title || 'LecturePulse').slice(0,100), {
    body:String(payload.body || 'Your study update is ready.').slice(0,300), icon:'/favicon.svg',
    tag:String(payload.tag || 'lecturepulse').slice(0,200), data:{url:payload.url || '/dashboard'},
  }))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async()=>{
    const requested=new URL(event.notification.data?.url || '/dashboard', self.location.origin)
    const target=requested.origin===self.location.origin ? requested.href : new URL('/dashboard',self.location.origin).href
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true})
    for (const client of windows) {
      if (new URL(client.url).origin===self.location.origin) {await client.navigate(target);await client.focus();return}
    }
    await self.clients.openWindow(target)
  })())
})

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith('lecturepulse-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  // Hashed bundles must always reach the network; an HTML fallback is not JavaScript.
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy)))
      }
      return response
    }).catch(async () => (await caches.match('/index.html')) || Response.error()),
  )
})
