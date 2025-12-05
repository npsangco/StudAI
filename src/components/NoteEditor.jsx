// NoteEditor.jsx - Fixed auto-save and reload issues
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Save, Share2, Trash2, MessageCircle, Wifi, WifiOff, Cloud, CloudOff, FileDown, Brain, Archive, ArchiveRestore } from 'lucide-react';
import { notesService } from '../utils/syncService';
import ConfirmDialog from './ConfirmDialog';

const NoteEditor = ({ 
  note, 
  onSave, 
  onDelete, 
  onShare, 
  onBack, 
  onChatbot, 
  onExport,
  onGenerateQuiz,
  formatDate,
  onArchive,
  onRestore
}) => {
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const autoSaveTimeoutRef = useRef(null);
  const noteRef = useRef(note);
  const saveNoteRef = useRef();

  // Create a stable saveNote function with useRef to avoid dependency issues
  const saveNote = useCallback(async (isAutoSave = false) => {
    // Don't save if no changes or already saving
    const hasChanges = editTitle !== noteRef.current.title || editContent !== noteRef.current.content;
    if (!hasChanges || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const wordCount = editContent.trim() ? editContent.trim().split(/\s+/).length : 0;
      
      const updatedNote = {
        id: noteRef.current.id,
        title: editTitle || 'Untitled Note',
        content: editContent,
        words: wordCount
      };
      
      const result = await notesService.updateNote(updatedNote.id, {
        title: updatedNote.title,
        content: updatedNote.content,
        words: updatedNote.words
      });
      
      if (result.queued) {

        // Update the local note state to reflect the saved content
        onSave(updatedNote);
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        
        if (!isAutoSave) {
          showNotification('Saved offline ✓', 'success');
        }
      } else {
        // Online save
        onSave(updatedNote);
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        
        if (!isAutoSave) {
          showNotification('Saved ✓', 'success');
        }
      }
    } catch (error) {
      console.error('Error saving note:', error);
      if (!isAutoSave) {
        showNotification('Failed to save', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  // Store the saveNote function in a ref to avoid dependency loops
  useEffect(() => {
    saveNoteRef.current = saveNote;
  }, [saveNote]);

  // Update noteRef when note prop changes
  useEffect(() => {
    noteRef.current = note;
    setEditTitle(note.title);
    setEditContent(note.content);
    setHasUnsavedChanges(false);
  }, [note]);

  // Auto-save effect - separated from state updates to prevent loops
  useEffect(() => {
    const hasChanges = editTitle !== noteRef.current.title || editContent !== noteRef.current.content;
    setHasUnsavedChanges(hasChanges);

    // Only auto-save if there are actual changes
    if (hasChanges && saveNoteRef.current) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        // Only save if we still have unsaved changes
        const currentHasChanges = editTitle !== noteRef.current.title || editContent !== noteRef.current.content;
        if (currentHasChanges && saveNoteRef.current) {
          saveNoteRef.current(true); // true = auto-save
        }
      }, 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [editTitle, editContent]); // Removed saveNote from dependencies

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      setTimeout(() => notesService.syncToServer(), 1000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle input changes with debouncing
  const handleTitleChange = (e) => {
    setEditTitle(e.target.value);
  };

  const handleContentChange = (e) => {
    setEditContent(e.target.value);
  };

  const showNotification = (message, type = 'success') => {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('[data-note-editor-notification]');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.setAttribute('data-note-editor-notification', 'true');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white transition-all duration-300`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (notification.parentNode) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  };

  const handleBack = async () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Save before leaving?')) {
        await saveNote(false);
        onBack();
      } else if (window.confirm('Discard changes and go back?')) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  const handleDelete = () => {
    if (!onDelete) {
      return;
    }
    // Only allow delete if note is archived
    if (!noteRef.current.isArchived) {
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    const deleted = await onDelete(note.id);
    if (deleted) {
      onBack();
    }
  };

  const handleArchive = async () => {
    if (!onArchive) return;
    await onArchive(note.id);
  };

  const handleRestore = async () => {
    if (!onRestore) return;
    await onRestore(note.id);
  };

  const handleShare = () => {
    onShare(note.id);
    showNotification('Note shared successfully!', 'success');
  };

  const handleExport = async () => {
    if (!onExport) {
      console.error('onExport prop is not provided');
      showNotification('Export function not available', 'error');
      return;
    }

    // Get the current state of the note with latest edits
    const currentNote = {
      id: note.id,
      title: editTitle || 'Untitled Note',
      content: editContent,
      createdAt: note.createdAt,
      words: editContent.trim() ? editContent.trim().split(/\s+/).length : 0
    };
    
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Save before exporting?')) {
        await saveNote(false);
        onExport(currentNote);
      } else {
        onExport(currentNote);
      }
    } else {
      onExport(currentNote);
    }
  };

  const handleGenerateQuiz = () => {
    if (!onGenerateQuiz) {
      console.error('onGenerateQuiz prop is not provided');
      showNotification('Quiz generation not available', 'error');
      return;
    }

    // Get the current state of the note with latest edits
    const currentNote = {
      id: note.id,
      title: editTitle || 'Untitled Note',
      content: editContent,
      createdAt: note.createdAt,
      words: editContent.trim() ? editContent.trim().split(/\s+/).length : 0
    };

    onGenerateQuiz(currentNote);
  };

  const handleManualSave = async () => {
    if (hasUnsavedChanges && !isSaving) {
      await saveNote(false);
    }
  };

  const currentWordCount = editContent.trim() ? editContent.trim().split(/\s+/).length : 0;

  const formatLastSaved = () => {
    if (!lastSaved) return 'Never saved';
    const now = new Date();
    const diff = Math.floor((now - lastSaved) / 1000); // seconds
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return lastSaved.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={handleBack}
                className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all flex-shrink-0"
                title="Back to Notes"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-semibold text-slate-800 flex items-center gap-2 truncate">
                  <span className="hidden sm:inline">Editing Note</span>
                  <span className="sm:hidden">Edit</span>
                  {note.isArchived && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                      Archived
                    </span>
                  )}
                  {hasUnsavedChanges && (
                    <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 animate-pulse" title="Unsaved changes"></span>
                  )}
                  {isSaving && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <Cloud className="w-3 h-3 animate-pulse" />
                      Saving...
                    </span>
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 truncate flex items-center gap-2">
                  <span>{currentWordCount} words • {formatDate(note.createdAt)}</span>
                  {isOnline ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Wifi className="w-3 h-3" />
                      <span className="hidden sm:inline">Online</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-orange-600">
                      <WifiOff className="w-3 h-3" />
                      <span className="hidden sm:inline">Offline</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Mobile Actions */}
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
              <button
                onClick={handleExport}
                className="p-2 sm:px-4 sm:py-2 text-green-600 hover:bg-green-50 rounded-lg transition-all flex items-center gap-2"
                title="Export to PDF"
              >
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Export</span>
              </button>
              <button
                onClick={handleGenerateQuiz}
                className="p-2 sm:px-4 sm:py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-2"
                title="Generate Quiz with AI"
              >
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">AI Quiz</span>
              </button>
              <button
                onClick={() => onChatbot(note.id)}
                className="p-2 sm:px-4 sm:py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all flex items-center gap-2"
                title="Ask AI Assistant"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Ask AI</span>
              </button>
              <button
                onClick={handleManualSave}
                disabled={!hasUnsavedChanges || isSaving}
                className={`p-2 sm:px-4 sm:py-2 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-sm ${
                  hasUnsavedChanges && !isSaving
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save' : 'Saved'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Offline Warning Banner */}
      {!isOnline && (
        <div className="bg-orange-100 border-b border-orange-200 px-4 py-2">
          <div className="max-w-6xl mx-auto flex items-center gap-2 text-sm text-orange-800">
            <CloudOff className="w-4 h-4" />
            <span>You're offline. Changes will sync when connection is restored.</span>
          </div>
        </div>
      )}

      {/* Edit Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Title Input */}
          <div className="p-4 sm:p-6 border-b border-slate-200">
            <input
              type="text"
              value={editTitle}
              onChange={handleTitleChange}
              className="w-full text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 placeholder-slate-400 border-none outline-none resize-none bg-transparent"
              placeholder="Untitled Note..."
            />
          </div>

          {/* Content Editor */}
          <div className="p-4 sm:p-6">
            <textarea
              value={editContent}
              onChange={handleContentChange}
              className="w-full min-h-[400px] sm:min-h-[500px] md:min-h-[600px] text-slate-700 placeholder-slate-400 border-none outline-none resize-none text-base sm:text-lg leading-loose bg-transparent whitespace-pre-wrap"
              placeholder="Start writing your note here..."
              style={{ 
                fontFamily: 'inherit',
                lineHeight: '1.8',
                letterSpacing: '0.01em'
              }}
            />
          </div>

          {/* Status Bar */}
          <div className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 text-xs sm:text-sm text-slate-500">
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span>Chars: {editContent.length}</span>
              <span className={currentWordCount > 500 ? 'text-red-600 font-bold' : currentWordCount > 450 ? 'text-orange-600 font-semibold' : ''}>
                Words: {currentWordCount}{currentWordCount > 500 ? ' / 500 (Over Limit!)' : currentWordCount > 450 ? ' / 500' : ''}
              </span>
              <span className="hidden sm:inline">Lines: {editContent.split('\n').length}</span>
            </div>
            <div className="flex items-center gap-2">
              {isSaving ? (
                <span className="text-blue-600 flex items-center gap-1 text-xs sm:text-sm">
                  <Cloud className="w-3 h-3 animate-pulse" />
                  <span>Saving...</span>
                </span>
              ) : hasUnsavedChanges ? (
                <span className="text-orange-600 flex items-center gap-1 text-xs sm:text-sm">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                  <span className="hidden sm:inline">Unsaved changes</span>
                  <span className="sm:hidden">Unsaved</span>
                </span>
              ) : (
                <span className="text-green-600 text-xs sm:text-sm flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  <span className="hidden sm:inline">Saved • {formatLastSaved()}</span>
                  <span className="sm:hidden">Saved</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 sm:mt-6 flex justify-center">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-blue-600 hover:bg-yellow-50 border border-yellow-200 rounded-lg transition-all hover:shadow-md text-sm sm:text-base"
            >
              <Share2 className="w-4 h-4" />
              Share Note
            </button>
            {note.isArchived ? (
              <>
                <button
                  onClick={handleRestore}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-all hover:shadow-md text-sm sm:text-base"
                >
                  <ArchiveRestore className="w-4 h-4" />
                  Restore Note
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all hover:shadow-md text-sm sm:text-base"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Permanently
                </button>
              </>
            ) : (
              <button
                onClick={handleArchive}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg transition-all hover:shadow-md text-sm sm:text-base"
              >
                <Archive className="w-4 h-4" />
                Archive Note
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Note Permanently"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default NoteEditor;
