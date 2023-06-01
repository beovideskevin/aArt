const cacheName = 'site-static-v113';
const assets = [
  '/',
  'manifest.json',
  'index.html',
  'favicon.png',
  '/img/icons/icon-72x72.png',
  '/img/icons/icon-96x96.png',
  '/img/icons/icon-128x128.png',
  '/img/icons/icon-144x144.png',
  '/img/icons/icon-152x152.png',
  '/img/icons/icon-192x192.png',
  '/img/icons/icon-384x384.png',
  '/img/icons/icon-512x512.png',
  '/img/icons/maskable_icon.png',
  '/js/app.js',
  '/js/materialize.min.js',
  '/css/styles.css',
  '/css/material-icons.css',
  '/css/materialize.min.css',
  '/fonts/SpaceMono-Regular.ttf',
  '/fonts/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2'
];

// install event
self.addEventListener('install', evt => {
  //console.log('service worker installed');
  evt.waitUntil(
    caches.open(cacheName).then((cache) => {
      // console.log('caching shell assets');
      cache.addAll(assets);
    })
  );
});

// activate event
self.addEventListener('activate', evt => {
  //console.log('service worker activated');
  evt.waitUntil(
    caches.keys().then(keys => {
      //console.log(keys);
      return Promise.all(keys
        .filter(key => key !== cacheName)
        .map(key => caches.delete(key))
      );
    })
  );
});

// fetch events
self.addEventListener('fetch', evt => {
  evt.respondWith(
    fetch(evt.request).then(fetchRes => {
      const resClone = fetchRes.clone();
      caches.open(cacheName).then(cache => {
        cache.put(evt.request, resClone);
      });
      return fetchRes;
    })
    .catch(err => caches.match(evt.request).then(res => res))
  );
});