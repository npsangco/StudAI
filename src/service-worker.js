const CACHE_NAME = 'studai-v1';
const NOTES_PLANNER_CACHE = 'studai-data-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/src/index.css',
  '/notes',
  '/planner'
];

const DB_NAME = 'StudAIOfflineDB';
const DB_VERSION = 1;

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('planner')) {
        db.createObjectStore('planner', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME)
        .then(cache => cache.addAll(urlsToCache)),
      initDB()
    ])
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.includes('/api/notes') || url.pathname.includes('/api/planner')) {
    event.respondWith(
      fetch(event.request)
        .then(async response => {
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();
          
          const db = await initDB();
          const tx = db.transaction(
            url.pathname.includes('notes') ? 'notes' : 'planner',
            'readwrite'
          );
          const store = tx.objectStore(
            url.pathname.includes('notes') ? 'notes' : 'planner'
          );
          store.put(data);
          
          return response;
        })
        .catch(async () => {
          const db = await initDB();
          const tx = db.transaction(
            url.pathname.includes('notes') ? 'notes' : 'planner',
            'readonly'
          );
          const store = tx.objectStore(
            url.pathname.includes('notes') ? 'notes' : 'planner'
          );
          const data = await store.getAll();
          
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});