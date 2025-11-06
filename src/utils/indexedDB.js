// indexedDB.js - Enhanced for offline-first with MySQL sync
const DB_NAME = 'StudAIOfflineDB';
const DB_VERSION = 2;

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Cache for notes from MySQL
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'id' });
      }
      
      // Queue for operations to sync to MySQL
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { 
          keyPath: 'queueId', 
          autoIncrement: true 
        });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

// Cache notes from MySQL
export const cacheNotes = async (notes) => {
  try {
    const db = await initDB();
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    
    for (const note of notes) {
      await store.put(note);
    }
    
    return true;
  } catch (error) {
    console.error('Error caching notes:', error);
    return false;
  }
};

// Cache a single note (for immediate offline updates)
export const cacheSingleNote = async (note) => {
  try {
    const db = await initDB();
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    
    return new Promise((resolve, reject) => {
      const request = store.put(note);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error caching single note:', error);
    return false;
  }
};

// Get a single cached note by ID
export const getCachedNote = async (noteId) => {
  try {
    const db = await initDB();
    const tx = db.transaction('notes', 'readonly');
    const store = tx.objectStore('notes');
    
    return new Promise((resolve) => {
      const request = store.get(noteId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => {
        console.error('Error reading cached note:', request.error);
        resolve(null);
      };
    });
  } catch (error) {
    console.error('Error getting cached note:', error);
    return null;
  }
};

// Get cached notes (for offline use)
export const getCachedNotes = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction('notes', 'readonly');
    const store = tx.objectStore('notes');
    
    // Wrap getAll() in a Promise
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const notes = request.result;
        resolve(Array.isArray(notes) ? notes : []);
      };
      request.onerror = () => {
        console.error('Error reading cached notes:', request.error);
        resolve([]); // Return empty array on error
      };
    });
  } catch (error) {
    console.error('Error getting cached notes:', error);
    return []; // Return empty array on error
  }
};

// Add operation to sync queue
export const queueOperation = async (operation) => {
  try {
    const db = await initDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    
    return new Promise((resolve, reject) => {
      const request = store.add({
        ...operation,
        timestamp: Date.now()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error queuing operation:', error);
    throw error;
  }
};

// Get all pending operations
export const getPendingOperations = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    
    // Wrap getAll() in a Promise
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const operations = request.result;
        resolve(Array.isArray(operations) ? operations : []);
      };
      request.onerror = () => {
        console.error('Error reading pending operations:', request.error);
        resolve([]); // Return empty array on error
      };
    });
  } catch (error) {
    console.error('Error getting pending operations:', error);
    return []; // Return empty array on error
  }
};

// Remove synced operation from queue
export const removeSyncedOperation = async (queueId) => {
  try {
    const db = await initDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(queueId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error removing synced operation:', error);
    throw error;
  }
};

// Clear all synced operations
export const clearSyncQueue = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing sync queue:', error);
    throw error;
  }
};