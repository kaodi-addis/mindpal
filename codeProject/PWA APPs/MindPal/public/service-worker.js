// public/service-worker.js
const CACHE_NAME = 'mindpal-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/notes.js',
  '/js/tasks.js',
  '/js/media.js',
  '/js/utilities.js',
  '/js/wellness.js',
  '/js/db.js',
  '/fonts/roboto.woff2',
  '/icons/logo.svg',
  '/offline.html'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        // Try network request
        return fetch(fetchRequest)
          .then(response => {
            // Check for valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the new response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(() => {
            // For navigation requests, return offline page
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            // For API requests, return empty JSON with offline flag
            if (event.request.url.includes('/api/')) {
              return new Response(JSON.stringify({
                offline: true,
                message: 'You are currently offline'
              }), {
                headers: {'Content-Type': 'application/json'}
              });
            }
          });
      })
  );
});

// Background sync for offline operations
self.addEventListener('sync', event => {
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncNotes());
  } else if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

// Helper functions for background sync
function syncNotes() {
  return getOfflineNotes()
    .then(notes => {
      return Promise.all(notes.map(note => {
        return fetch('/api/notes', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(note)
        })
        .then(response => {
          if (response.ok) {
            return deleteOfflineNote(note.id);
          }
        });
      }));
    });
}

function syncTasks() {
  // Similar implementation for tasks
}