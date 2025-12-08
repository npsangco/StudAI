// Sync services for Notes and Planner with offline support

import axios from 'axios';
import { API_URL } from '../config/api.config';
import { notesApi, plansApi } from '../api/api';
import {
  queueOperation,
  getPendingOperations,
  removeSyncedOperation,
  cacheNotes,
  cacheSingleNote,
  getCachedNote,
  getCachedNotes,
  cachePlans,
  cacheSinglePlan,
  getCachedPlan,
  getCachedPlans,
  deleteCachedPlan,
} from './indexedDB';

class NotesService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  handleOnline() {
    this.isOnline = true;
    console.info('[Notes] Online – syncing...');
    this.syncToServer();
  }

  handleOffline() {
    this.isOnline = false;
    console.info('[Notes] Offline mode');
  }

  async getAllNotes() {
    if (!this.isOnline) {
      console.info('[Notes] Loading from cache (offline)');
      const cached = await getCachedNotes();
      return cached || [];
    }

    try {
      console.info('[Notes] Fetching from server...');
      const res = await notesApi.getAll('all');
      const notes = (res.data.notes || []).map((n) => this.mapNotePayload(n));
      
      await cacheNotes(notes);
      console.info(`[Notes] Loaded ${notes.length} notes from server`);
      return notes;
    } catch (err) {
      console.error('[Notes] Server fetch failed, using cache:', err);
      const cached = await getCachedNotes();
      return cached || [];
    }
  }

  async addNote(noteData) {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const tempNote = {
      id: tempId,
      title: noteData.title || 'Untitled Note',
      content: noteData.content || '',
      words: noteData.content ? noteData.content.split(/\s+/).length : 0,
      createdAt: new Date().toISOString(),
      isShared: false,
      isPinned: false,
      isArchived: false,
      archivedAt: null,
      category: null,
      categoryId: noteData.category_id || null,
      fileId: noteData.file_id || null,
    };

    if (this.isOnline) {
      try {
        const res = await notesApi.create(noteData);
        const note = this.mapNotePayload(res.data.note);
        await cacheSingleNote(note);
        return { success: true, note };
      } catch (err) {
        console.error('[Notes] Create failed:', err);
        if (err.response?.status === 400 && err.response?.data?.error) {
          throw err;
        }
        await cacheSingleNote(tempNote);
        await queueOperation({ entityType: 'note', type: 'CREATE', data: { ...noteData, tempId } });
        return { success: true, note: tempNote, queued: true };
      }
    } else {
      await cacheSingleNote(tempNote);
      await queueOperation({ entityType: 'note', type: 'CREATE', data: { ...noteData, tempId } });
      return { success: true, note: tempNote, queued: true };
    }
  }

  async updateNote(noteId, updates) {
    const cachedNote = await getCachedNote(noteId);
    if (cachedNote) {
      await cacheSingleNote({ ...cachedNote, ...updates });
    }

    if (this.isOnline) {
      try {
        const res = await notesApi.update(noteId, updates);
        const note = this.mapNotePayload(res.data.note);
        await cacheSingleNote(note);
        return { success: true, note };
      } catch {
        await queueOperation({ entityType: 'note', type: 'UPDATE', data: { noteId, updates } });
        return { success: true, queued: true };
      }
    } else {
      await queueOperation({ entityType: 'note', type: 'UPDATE', data: { noteId, updates } });
      return { success: true, queued: true };
    }
  }

  async deleteNote(noteId) {
    if (this.isOnline) {
      try {
        await notesApi.delete(noteId);
        return { success: true };
      } catch (err) {
        if (err.response && err.response.status >= 400 && err.response.status < 500) {
          throw err;
        }
        await queueOperation({ entityType: 'note', type: 'DELETE', data: { noteId } });
        return { success: true, queued: true };
      }
    } else {
      await queueOperation({ entityType: 'note', type: 'DELETE', data: { noteId } });
      return { success: true, queued: true };
    }
  }

  async syncToServer() {
    if (this.isSyncing || !this.isOnline) return;
    this.isSyncing = true;

    try {
      const operations = await getPendingOperations();
      const noteOps = operations.filter(op => op.entityType === 'note');
      
      if (noteOps.length === 0) {
        console.info('[Notes] No pending operations');
        this.isSyncing = false;
        return;
      }

      console.info(`[Notes] Syncing ${noteOps.length} operations`);

      for (const op of noteOps) {
        try {
          await this.processOperation(op);
          await removeSyncedOperation(op.queueId);
        } catch (err) {
          console.error('[Notes] Operation failed:', err);
        }
      }

      console.info('[Notes] Sync completed');
      await this.getAllNotes(); // Refresh cache
    } catch (err) {
      console.error('[Notes] Sync error:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  async processOperation(op) {
    switch (op.type) {
      case 'CREATE': {
        const res = await notesApi.create(op.data);
        const note = this.mapNotePayload(res.data.note);
        await cacheSingleNote(note);
        break;
      }
      case 'UPDATE':
        await notesApi.update(op.data.noteId, op.data.updates);
        break;
      case 'DELETE':
        await notesApi.delete(op.data.noteId);
        break;
    }
  }

  async getSyncStatus() {
    const pending = await getPendingOperations();
    const notePending = pending.filter(op => op.entityType === 'note');
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingOperations: notePending.length,
    };
  }

  mapNotePayload(note) {
    return {
      id: note.note_id || note.id,
      title: note.title,
      content: note.content || '',
      words: note.words ?? (note.content ? note.content.split(/\s+/).length : 0),
      createdAt: note.created_at || note.createdAt,
      isShared: note.is_shared === true || note.is_shared === 1,
      isPinned: note.is_pinned === true || note.is_pinned === 1,
      isArchived: note.is_archived === true || note.is_archived === 1,
      archivedAt: note.archived_at || note.archivedAt || null,
      category: note.category || null,
      categoryId: note.category_id || note.categoryId || (note.category ? note.category.category_id : null),
      fileId: note.file_id || note.fileId || null,
    };
  }
}

class PlannerService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  handleOnline() {
    this.isOnline = true;
    console.info('[Planner] Online – syncing...');
    this.syncToServer();
  }

  handleOffline() {
    this.isOnline = false;
    console.info('[Planner] Offline mode');
  }

  async getAllPlans() {
    if (!this.isOnline) {
      console.info('[Planner] Loading from cache (offline)');
      const cached = await getCachedPlans();
      return cached || [];
    }

    try {
      console.info('[Planner] Fetching from server...');
      const res = await axios.get(`${API_URL}/api/plans`, { withCredentials: true });
      const plans = (res.data.plans || []).map((p) => ({
        id: p.planner_id,
        planner_id: p.planner_id,
        title: p.title,
        description: p.description || '',
        due_date: p.due_date,
        created_at: p.created_at,
        completed: p.completed || false,        // ADD THIS
        completed_at: p.completed_at || null   // ADD THIS
      }));
      
      await cachePlans(plans);
      console.info(`[Planner] Loaded ${plans.length} plans from server`);
      return plans;
    } catch (err) {
      console.error('[Planner] Server fetch failed, using cache:', err);
      const cached = await getCachedPlans();
      return cached || [];
    }
  }

  async addPlan(planData) {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const tempPlan = {
      id: tempId,
      planner_id: tempId,
      title: planData.title || 'Untitled Plan',
      description: planData.description || '',
      due_date: planData.due_date,
      created_at: new Date().toISOString(),
      completed: false,        // ADD THIS
      completed_at: null      // ADD THIS
    };

    if (this.isOnline) {
      try {
        const res = await plansApi.create(planData);
        
        // Check if response indicates validation error (400)
        if (res.status === 400) {
          return { success: false, error: res.data.error };
        }
        
        const p = res.data.plan;
        const plan = {
          id: p.planner_id,
          planner_id: p.planner_id,
          title: p.title,
          description: p.description || '',
          due_date: p.due_date,
          created_at: p.created_at,
          completed: p.completed || false,
          completed_at: p.completed_at || null
        };
        await cacheSinglePlan(plan);
        return { success: true, plan };
      } catch (err) {
        // Handle different types of errors
        if (err.response) {
          // Server responded with error status (4xx, 5xx)
          if (err.response.status === 400) {
            // Validation error - don't queue, just return error
            return { success: false, error: err.response.data.error };
          }
          // Other server errors - don't queue for offline
          console.error('[Planner] Server error:', err.response.status);
          return { success: false, error: 'Server error' };
        } else if (err.request) {
          // Network error - no response received, queue for offline
          console.error('[Planner] Network error, queuing:', err);
          await cacheSinglePlan(tempPlan);
          await queueOperation({ entityType: 'plan', type: 'CREATE', data: { ...planData, tempId } });
          return { success: true, plan: tempPlan, queued: true };
        } else {
          // Other errors
          console.error('[Planner] Unexpected error:', err);
          return { success: false, error: 'Unexpected error' };
        }
      }
    } else {
      // Offline mode - always queue
      await cacheSinglePlan(tempPlan);
      await queueOperation({ entityType: 'plan', type: 'CREATE', data: { ...planData, tempId } });
      return { success: true, plan: tempPlan, queued: true };
    }
  }

  async updatePlan(planId, updates) {
    const cached = await getCachedPlan(planId);
    if (cached) await cacheSinglePlan({ ...cached, ...updates });

    // Check if this is a completion update
    if (updates.completed === true) {
      return this.completePlan(planId);
    }

    if (this.isOnline) {
      try {
        const res = await plansApi.update(planId, updates);
        
        // Check for validation errors
        if (res.status === 400) {
          return { success: false, error: res.data.error };
        }
        
        const p = res.data.plan;
        const plan = {
          id: p.planner_id,
          planner_id: p.planner_id,
          title: p.title,
          description: p.description || '',
          due_date: p.due_date,
          created_at: p.created_at,
          completed: p.completed || false,
          completed_at: p.completed_at || null
        };
        await cacheSinglePlan(plan);
        return { success: true, plan };
      } catch (err) {
        // Handle different types of errors
        if (err.response) {
          if (err.response.status === 400) {
            return { success: false, error: err.response.data.error };
          }
          console.error('[Planner] Server error:', err.response.status);
          return { success: false, error: 'Server error' };
        } else if (err.request) {
          // Network error - queue for offline
          await queueOperation({ entityType: 'plan', type: 'UPDATE', data: { planId, updates } });
          return { success: true, queued: true };
        } else {
          console.error('[Planner] Unexpected error:', err);
          return { success: false, error: 'Unexpected error' };
        }
      }
    } else {
      await queueOperation({ entityType: 'plan', type: 'UPDATE', data: { planId, updates } });
      return { success: true, queued: true };
    }
  }

  async completePlan(planId) {
    // Update cache immediately
    const cached = await getCachedPlan(planId);
    if (cached) {
      await cacheSinglePlan({ ...cached, completed: true, completed_at: new Date().toISOString() });
    }

    if (this.isOnline) {
      try {
        const res = await plansApi.complete(planId);
        const p = res.data.plan;
        const plan = {
          id: p.planner_id,
          planner_id: p.planner_id,
          title: p.title,
          description: p.description || '',
          due_date: p.due_date,
          created_at: p.created_at,
          completed: true,
          completed_at: p.completed_at || new Date().toISOString()
        };
        await cacheSinglePlan(plan);
        return { success: true, plan };
      } catch (err) {
        if (err.response) {
          if (err.response.status === 400) {
            return { success: false, error: err.response.data.error };
          }
          console.error('[Planner] Server error:', err.response.status);
          return { success: false, error: 'Server error' };
        } else if (err.request) {
          await queueOperation({ entityType: 'plan', type: 'COMPLETE', data: { planId } });
          return { success: true, queued: true };
        } else {
          console.error('[Planner] Unexpected error:', err);
          return { success: false, error: 'Unexpected error' };
        }
      }
    } else {
      await queueOperation({ entityType: 'plan', type: 'COMPLETE', data: { planId } });
      return { success: true, queued: true };
    }
  }

  async deletePlan(planId) {
    await deleteCachedPlan(planId);
    if (this.isOnline) {
      try {
        await plansApi.delete(planId);
        return { success: true };
      } catch (err) {
        if (err.response) {
          if (err.response.status === 400) {
            return { success: false, error: err.response.data.error };
          }
          console.error('[Planner] Server error:', err.response.status);
          return { success: false, error: 'Server error' };
        } else if (err.request) {
          await queueOperation({ entityType: 'plan', type: 'DELETE', data: { planId } });
          return { success: true, queued: true };
        } else {
          console.error('[Planner] Unexpected error:', err);
          return { success: false, error: 'Unexpected error' };
        }
      }
    } else {
      await queueOperation({ entityType: 'plan', type: 'DELETE', data: { planId } });
      return { success: true, queued: true };
    }
  }

  async syncToServer() {
    if (this.isSyncing || !this.isOnline) return;
    this.isSyncing = true;

    try {
      const operations = await getPendingOperations();
      const planOps = operations.filter(op => op.entityType === 'plan');
      
      if (planOps.length === 0) {
        console.info('[Planner] No pending operations');
        this.isSyncing = false;
        return;
      }

      console.info(`[Planner] Syncing ${planOps.length} operations`);

      for (const op of planOps) {
        try {
          await this.processOperation(op);
          await removeSyncedOperation(op.queueId);
        } catch (err) {
          console.error('[Planner] Operation failed:', err);
          // Don't remove from queue if it failed (will retry later)
        }
      }

      console.info('[Planner] Sync completed');
      await this.getAllPlans(); // Refresh cache
    } catch (err) {
      console.error('[Planner] Sync error:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  async processOperation(op) {
    switch (op.type) {
      case 'CREATE': {
        const res = await plansApi.create(op.data);
        const p = res.data.plan;
        await cacheSinglePlan({
          id: p.planner_id,
          planner_id: p.planner_id,
          title: p.title,
          description: p.description || '',
          due_date: p.due_date,
          created_at: p.created_at,
          completed: p.completed || false,        // ADD THIS
          completed_at: p.completed_at || null   // ADD THIS
        });
        break;
      }
      case 'UPDATE': {
        const res = await plansApi.update(op.data.planId, op.data.updates);
        const p = res.data.plan;
        await cacheSinglePlan({
          id: p.planner_id,
          planner_id: p.planner_id,
          title: p.title,
          description: p.description || '',
          due_date: p.due_date,
          created_at: p.created_at,
          completed: p.completed || false,        // ADD THIS
          completed_at: p.completed_at || null   // ADD THIS
        });
        break;
      }
      case 'COMPLETE': {
        const res = await plansApi.complete(op.data.planId);
        const p = res.data.plan;
        await cacheSinglePlan({
          id: p.planner_id,
          planner_id: p.planner_id,
          title: p.title,
          description: p.description || '',
          due_date: p.due_date,
          created_at: p.created_at,
          completed: true,
          completed_at: p.completed_at || new Date().toISOString()
        });
        break;
      }
      case 'DELETE':
        await plansApi.delete(op.data.planId);
        break;
    }
  }

  async getSyncStatus() {
    const pending = await getPendingOperations();
    const planPending = pending.filter(op => op.entityType === 'plan');
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingOperations: planPending.length,
    };
  }
}

// Export both services
export const notesService = new NotesService();
export const plannerService = new PlannerService();