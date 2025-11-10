// indexedDB.js — Unified cache and sync for Notes + Plans
const DB_NAME = 'StudAIOfflineDB';
const DB_VERSION = 3;

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Notes cache
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'id' });
      }

      // Plans cache
      if (!db.objectStoreNames.contains('plans')) {
        db.createObjectStore('plans', { keyPath: 'id' });
      }

      // Sync queue for offline operations
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', {
          keyPath: 'queueId',
          autoIncrement: true,
        });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

/* -------------------- NOTES CACHE -------------------- */

export const cacheNotes = async (notes) => {
  try {
    const db = await initDB();
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    for (const note of notes) await store.put(note);
    return true;
  } catch (err) {
    console.error('[IndexedDB] Failed to cache notes:', err);
    return false;
  }
};

export const cacheSingleNote = async (note) => {
  try {
    const db = await initDB();
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    return new Promise((resolve, reject) => {
      const req = store.put(note);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to cache single note:', err);
    return false;
  }
};

export const getCachedNote = async (noteId) => {
  try {
    const db = await initDB();
    const tx = db.transaction('notes', 'readonly');
    const store = tx.objectStore('notes');
    return new Promise((resolve) => {
      const req = store.get(noteId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to read note:', err);
    return null;
  }
};

export const getCachedNotes = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction('notes', 'readonly');
    const store = tx.objectStore('notes');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to read notes:', err);
    return [];
  }
};

/* -------------------- PLANS CACHE -------------------- */

export const cachePlans = async (plans) => {
  try {
    const db = await initDB();
    const tx = db.transaction('plans', 'readwrite');
    const store = tx.objectStore('plans');
    for (const plan of plans) await store.put(plan);
    return true;
  } catch (err) {
    console.error('[IndexedDB] Failed to cache plans:', err);
    return false;
  }
};

export const cacheSinglePlan = async (plan) => {
  try {
    const db = await initDB();
    const tx = db.transaction('plans', 'readwrite');
    const store = tx.objectStore('plans');
    return new Promise((resolve, reject) => {
      const req = store.put(plan);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to cache single plan:', err);
    return false;
  }
};

export const getCachedPlan = async (planId) => {
  try {
    const db = await initDB();
    const tx = db.transaction('plans', 'readonly');
    const store = tx.objectStore('plans');
    return new Promise((resolve) => {
      const req = store.get(planId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to read plan:', err);
    return null;
  }
};

export const getCachedPlans = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction('plans', 'readonly');
    const store = tx.objectStore('plans');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to read plans:', err);
    return [];
  }
};

export const deleteCachedPlan = async (planId) => {
  try {
    const db = await initDB();
    const tx = db.transaction('plans', 'readwrite');
    const store = tx.objectStore('plans');
    return new Promise((resolve, reject) => {
      const req = store.delete(planId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to delete plan:', err);
    return false;
  }
};

/* -------------------- SYNC QUEUE -------------------- */

export const queueOperation = async (operation) => {
  try {
    const db = await initDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    return new Promise((resolve, reject) => {
      const req = store.add({ ...operation, timestamp: Date.now() });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to queue operation:', err);
    throw err;
  }
};

export const getPendingOperations = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to read queue:', err);
    return [];
  }
};

export const removeSyncedOperation = async (queueId) => {
  try {
    const db = await initDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    return new Promise((resolve, reject) => {
      const req = store.delete(queueId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to remove queue item:', err);
    throw err;
  }
};

export const clearSyncQueue = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to clear sync queue:', err);
    throw err;
  }
};
