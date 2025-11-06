import { notesApi } from '../api/api';
import { 
  queueOperation, 
  getPendingOperations, 
  removeSyncedOperation,
  cacheNotes,
  getCachedNotes,
  cacheSingleNote,
  getCachedNote
} from './indexedDB';

class SyncService {
  constructor() {
    this.DB_NAME = 'StudAIOfflineDB';
    this.DB_VERSION = 2;
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
  }

  // Sets up database connection for offline storage
  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { 
            keyPath: 'queueId',
            autoIncrement: true 
          });
        }
      };
    });
  }

  handleOnline() {
    this.isOnline = true;
    this.syncToServer();
  }

  handleOffline() {
    this.isOnline = false;
  }

  // Save your work even without internet - will sync later
  async addNote(noteData) {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create temporary note object for local cache
    const tempNote = {
      id: tempId,
      title: noteData.title || 'Untitled Note',
      content: noteData.content || '',
      words: noteData.content ? noteData.content.split(/\s+/).length : 0,
      createdAt: new Date().toISOString(),
      isShared: false,
      isPinned: false,
      category: null,
      categoryId: noteData.category_id || null
    };

    if (this.isOnline) {
      try {
        // Try to save directly to MySQL via API
        const response = await notesApi.create(noteData);
        const serverNote = {
          id: response.data.note.note_id || response.data.note.id,
          title: response.data.note.title,
          content: response.data.note.content || '',
          words: response.data.note.words,
          createdAt: response.data.note.created_at || response.data.note.createdAt,
          isShared: response.data.note.is_shared || false,
          isPinned: response.data.note.is_pinned || false,
          category: response.data.note.category || null,
          categoryId: response.data.note.category_id || null
        };
        
        // Cache the server response
        await cacheSingleNote(serverNote);
        
        return { success: true, note: serverNote, fromCache: false };
      } catch (error) {
        console.log('API failed, saving offline:', error.message);
        // If API fails, cache locally and queue
        await cacheSingleNote(tempNote);
        await queueOperation({
          type: 'CREATE',
          data: { ...noteData, tempId }
        });
        return { success: true, note: tempNote, fromCache: true, queued: true };
      }
    } else {
      // Offline: cache locally and queue the operation
      await cacheSingleNote(tempNote);
      await queueOperation({
        type: 'CREATE',
        data: { ...noteData, tempId }
      });
      return { success: true, note: tempNote, fromCache: true, queued: true };
    }
  }

  // Changes save instantly offline, sync when connected
  async updateNote(noteId, updates) {
    // Check if this is a temp note
    const isTempNote = typeof noteId === 'string' && noteId.startsWith('temp_');
    
    // First, update the local cache immediately
    const cachedNote = await getCachedNote(noteId);
    if (cachedNote) {
      const updatedNote = {
        ...cachedNote,
        ...updates,
        title: updates.title !== undefined ? updates.title : cachedNote.title,
        content: updates.content !== undefined ? updates.content : cachedNote.content,
        words: updates.content !== undefined 
          ? (updates.content.trim() ? updates.content.split(/\s+/).length : 0)
          : cachedNote.words,
        categoryId: updates.category_id !== undefined ? updates.category_id : cachedNote.categoryId
      };
      await cacheSingleNote(updatedNote);
    }

    // If temp note, only update cache and queue - don't try API call
    if (isTempNote) {
      console.log('⏳ Temp note - queuing update for after sync');
      await queueOperation({
        type: 'UPDATE_TEMP',
        data: { tempId: noteId, updates }
      });
      return { success: true, fromCache: true, queued: true, isTemp: true };
    }

    // For real notes, proceed with API call
    if (this.isOnline) {
      try {
        const response = await notesApi.update(noteId, updates);
        const serverNote = {
          id: response.data.note.note_id || response.data.note.id,
          title: response.data.note.title,
          content: response.data.note.content || '',
          words: response.data.note.words,
          createdAt: response.data.note.created_at || response.data.note.createdAt,
          isShared: response.data.note.is_shared || false,
          isPinned: response.data.note.is_pinned || false,
          category: response.data.note.category || null,
          categoryId: response.data.note.category_id || null
        };
        
        // Update cache with server response
        await cacheSingleNote(serverNote);
        return { success: true, note: serverNote, fromCache: false };
      } catch (error) {
        console.log('Update API failed, queuing for sync:', error.message);
        await queueOperation({
          type: 'UPDATE',
          data: { noteId, updates }
        });
        return { success: true, fromCache: true, queued: true };
      }
    } else {
      // Offline: queue the operation
      await queueOperation({
        type: 'UPDATE',
        data: { noteId, updates }
      });
      return { success: true, fromCache: true, queued: true };
    }
  }

  // Removes note locally first, syncs deletion when online
  async deleteNote(noteId) {
    if (this.isOnline) {
      try {
        await notesApi.delete(noteId);
        return { success: true, fromCache: false };
      } catch (error) {
        console.log('Delete API failed, queuing for sync:', error.message);
        await queueOperation({
          type: 'DELETE',
          data: { noteId }
        });
        return { success: true, fromCache: true, queued: true };
      }
    } else {
      // Offline: queue the operation
      await queueOperation({
        type: 'DELETE',
        data: { noteId }
      });
      return { success: true, fromCache: true, queued: true };
    }
  }

  // Catches up all offline changes with the server
  async syncToServer() {
    if (this.isSyncing || !this.isOnline) return;
    
    this.isSyncing = true;
    console.log('🔄 Syncing queued operations...');

    try {
      const operations = await getPendingOperations();
      
      if (!operations || !Array.isArray(operations) || operations.length === 0) {
        console.log('No operations to sync');
        await this.refreshCache();
        this.isSyncing = false;
        return;
      }
      
      console.log(`Found ${operations.length} operations to sync`);
      
      // Map to track temp ID to real ID conversions
      const tempIdMap = new Map();
      
      for (const op of operations) {
        try {
          let serverNote = null;
          
          switch (op.type) {
            case 'CREATE': {
              // Block scope needed for let/const declarations
              const createResponse = await notesApi.create({
                title: op.data.title,
                content: op.data.content,
                file_id: op.data.file_id,
                category_id: op.data.category_id
              });
              
              serverNote = {
                id: createResponse.data.note.note_id || createResponse.data.note.id,
                title: createResponse.data.note.title,
                content: createResponse.data.note.content || '',
                words: createResponse.data.note.words,
                createdAt: createResponse.data.note.created_at || createResponse.data.note.createdAt,
                isShared: createResponse.data.note.is_shared || false,
                isPinned: createResponse.data.note.is_pinned || false,
                category: createResponse.data.note.category || null,
                categoryId: createResponse.data.note.category_id || null
              };
              
              // Replace temp note with real note in cache
              if (op.data.tempId) {
                const db = await this.openDB();
                const tx = db.transaction('notes', 'readwrite');
                const store = tx.objectStore('notes');
                await store.delete(op.data.tempId);
                
                // Map temp ID to real ID
                tempIdMap.set(op.data.tempId, serverNote.id);
              }
              await cacheSingleNote(serverNote);
              console.log(`✅ Created note: ${serverNote.title}`);
              break;
            }
            
            case 'UPDATE_TEMP': {
              // Check if this temp note was just created in this sync
              const realId = tempIdMap.get(op.data.tempId);
              if (realId) {
                // Apply the update to the real note
                await notesApi.update(realId, op.data.updates);
                console.log(`✅ Applied queued update to note: ${realId}`);
              } else {
                // Temp note hasn't been synced yet, skip for now
                console.log('⏭️  Skipping UPDATE_TEMP - note not yet synced');
                continue; // Don't remove from queue
              }
              break;
            }
              
            case 'UPDATE':
              // SAFETY CHECK: Skip if trying to update a temp note that hasn't been synced yet
              if (typeof op.data.noteId === 'string' && op.data.noteId.startsWith('temp_')) {
                console.log('⏭️  Skipping UPDATE for temp note - converting to UPDATE_TEMP');
                // Convert old UPDATE to UPDATE_TEMP and keep in queue
                await queueOperation({
                  type: 'UPDATE_TEMP',
                  data: { tempId: op.data.noteId, updates: op.data.updates }
                });
                // Remove the old UPDATE operation
                await removeSyncedOperation(op.queueId);
                continue;
              }
              await notesApi.update(op.data.noteId, op.data.updates);
              console.log(`✅ Updated note: ${op.data.noteId}`);
              break;
              
            case 'DELETE':
              await notesApi.delete(op.data.noteId);
              console.log(`✅ Deleted note: ${op.data.noteId}`);
              break;
          }
          
          // Remove from queue after successful sync
          await removeSyncedOperation(op.queueId);
        } catch (error) {
          console.error(`❌ Failed to sync ${op.type}:`, error);
          // Keep in queue for retry
        }
      }
      
      console.log('✅ Sync complete!');
      
      // refresh cache
      await this.refreshCache();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async refreshCache() {
    if (!this.isOnline) {
      // return cached data if offline
      return await getCachedNotes();
    }

    try {
      const response = await notesApi.getAll();
      const notes = response.data.notes;
      
      const mappedNotes = notes.map(note => ({
        id: note.note_id || note.id,
        title: note.title,
        content: note.content || '',
        words: note.words || (note.content ? note.content.split(/\s+/).length : 0),
        createdAt: note.created_at || note.createdAt,
        isShared: note.is_shared || false,
        isPinned: note.is_pinned || false,
        category: note.category || null,
        categoryId: note.category_id || null
      }));
      
      await cacheNotes(mappedNotes);
      
      return mappedNotes;
    } catch (error) {
      console.error('Failed to refresh cache:', error);
      return await getCachedNotes();
    }
  }

  async getSyncStatus() {
    const pending = await getPendingOperations();
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingOperations: Array.isArray(pending) ? pending.length : 0
    };
  }
}

export const syncService = new SyncService();

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncService.handleOnline();
  });
  
  window.addEventListener('offline', () => {
    syncService.handleOffline();
  });
}