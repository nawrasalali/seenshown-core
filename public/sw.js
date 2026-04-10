/* SeenShown Service Worker — v9 */
var CACHE='seenshown-v9';
var PRECACHE=[
  '/',
  '/index.html',
  '/auth.js',
  '/manifest.json'
];

self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){return c.addAll(PRECACHE);}).then(function(){return self.skipWaiting();})
  );
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    }).then(function(){return self.clients.claim();})
  );
});

self.addEventListener('fetch',function(e){
  /* Network first for API calls, cache first for static */
  if(e.request.url.includes('/api/')||e.request.url.includes('supabase')||e.request.url.includes('elevenlabs')){
    e.respondWith(fetch(e.request).catch(function(){return new Response('{}',{headers:{'Content-Type':'application/json'}});}));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached){
      var fetchPromise=fetch(e.request).then(function(res){
        if(res&&res.status===200){
          var clone=res.clone();
          caches.open(CACHE).then(function(c){c.put(e.request,clone);});
        }
        return res;
      });
      return cached||fetchPromise;
    })
  );
});
