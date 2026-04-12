/* SeenShown Service Worker — v12 */
var CACHE='seenshown-v15';
var PRECACHE=['/manifest.json'];

self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){return c.addAll(PRECACHE);}).then(function(){return self.skipWaiting();})
  );
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){return caches.delete(k);}));
    }).then(function(){return self.clients.claim();})
  );
});

self.addEventListener('fetch',function(e){
  /* Network first for EVERYTHING — always get fresh HTML/JS */
  if(e.request.method!=='GET')return;
  /* API and supabase always network only */
  if(e.request.url.includes('/api/')||e.request.url.includes('supabase')){
    e.respondWith(fetch(e.request));
    return;
  }
  /* HTML files — always network first, cache as fallback only */
  if(e.request.destination==='document'||e.request.url.endsWith('.html')||e.request.url.endsWith('/')){
    e.respondWith(
      fetch(e.request).then(function(res){
        var clone=res.clone();
        caches.open(CACHE).then(function(c){c.put(e.request,clone);});
        return res;
      }).catch(function(){
        return caches.match(e.request);
      })
    );
    return;
  }
  /* JS/CSS — network first */
  e.respondWith(
    fetch(e.request).then(function(res){
      var clone=res.clone();
      caches.open(CACHE).then(function(c){c.put(e.request,clone);});
      return res;
    }).catch(function(){
      return caches.match(e.request);
    })
  );
});
