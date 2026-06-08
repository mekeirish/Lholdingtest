const CACHE_NAME = 'markethub-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // Polices / styles (Tailwind est chargé via CDN, mais on peut le mettre en cache)
  'https://cdn.tailwindcss.com',
  // React & ReactDOM (CDN)
  'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.development.js',
  // Babel (pour le JSX dans le navigateur)
  'https://cdn.jsdelivr.net/npm/@babel/standalone/babel.min.js',
  // Firebase
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js',
  // SheetJS
  'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js'
];

// Installation : ajout des fichiers en cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie : Stale-while-revalidate (utilise le cache puis met à jour en arrière-plan)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Met à jour le cache avec la réponse réseau (si valide)
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // En cas d'échec réseau, on retourne la réponse en cache (si elle existe)
            // Pour les requêtes API (Firebase), on ne fait rien car c'est géré par Firebase offline persistence
            return cachedResponse;
          });
        // Retourne la réponse en cache immédiatement (stale) et met à jour en arrière-plan
        return cachedResponse || fetchPromise;
      })
  );
});