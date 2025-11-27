import React, { useState, useEffect } from 'react';
import { Plus, Share2, Trash2, Copy, Search, Filter, Clock, FileText,
         MessageCircle, Edit3, ExternalLink, Pin, PinOff, FolderPlus,
         Tag, Wifi, WifiOff, RefreshCw, FileDown, X, Check, Brain,
         Archive, ArchiveRestore, Inbox } from 'lucide-react';
import { notesService } from '../utils/syncService';
import { cacheSingleNote } from '../utils/indexedDB';
import NoteEditor from '../components/NoteEditor';
import Chatbot from '../components/Chatbot';
import TutorialOverlay from '../components/TutorialOverlay';
import { notesApi, sharedNotesApi, quizApi } from '../api/api';
import { exportNoteToPDF, exportMultipleNotesToPDF } from '../utils/pdfExport';
import ToastContainer from '../components/ToastContainer';
import AppLoader from '../components/AppLoader';
import { useToast } from '../hooks/useToast';
import { useTutorial } from '../hooks/useTutorial';
import { notesTutorialSteps } from '../config/tutorialSteps';
import TutorialButton from '../components/TutorialButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import GenerateQuizModal from '../components/GenerateQuizModal';

const normalizeNote = (note) => {
  const category = note.category || null;
  const resolvedCategoryId = note.categoryId || note.category_id || (category ? category.category_id : null);
  return {
    id: note.note_id || note.id,
    title: note.title,
    words: note.words || (note.content ? note.content.split(/\s+/).length : 0),
    createdAt: note.created_at || note.createdAt,
    content: note.content || '',
    isShared: note.isShared ?? (note.is_shared === true || note.is_shared === 1),
    isPinned: note.isPinned ?? (note.is_pinned === true || note.is_pinned === 1),
    isArchived: note.isArchived ?? (note.is_archived === true || note.is_archived === 1),
    archivedAt: note.archivedAt || note.archived_at || null,
    category,
    categoryId: resolvedCategoryId,
    fileId: note.fileId || note.file_id || null
  };
};

const Notes = () => {
  const [notes, setNotes] = useState([]);
  const [myShares, setMyShares] = useState([]);
  const [shareLink, setShareLink] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState('');
  const [currentView, setCurrentView] = useState('list');
  const [editingNote, setEditingNote] = useState(null);
  const [chatbotNote, setChatbotNote] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCategoryPicker, setShowCategoryPicker] = useState(null);
  const [syncStatus, setSyncStatus] = useState({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingOperations: 0
  });
  const [notesView, setNotesView] = useState('active');
  const [archivingAll, setArchivingAll] = useState(false);
  
  // PDF Export states
  const [exportMode, setExportMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  
  // Quiz Generation states
  const [showGenerateQuizModal, setShowGenerateQuizModal] = useState(false);
  const [quizGenerationNote, setQuizGenerationNote] = useState(null);
  
  const { toasts, removeToast, toast } = useToast();
  const { confirmState, confirm, closeConfirm } = useConfirm();
  const { showTutorial, completeTutorial, skipTutorial, startTutorial } = useTutorial('notes');
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchNotesFromDatabase(),
        fetchMyShares(),
        fetchCategories()
      ]);
      setInitialLoading(false);
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    const updateSyncStatus = async () => {
      const status = await notesService.getSyncStatus();
      setSyncStatus(status);
    };

    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 3000);

    return () => clearInterval(interval);
  }, []);

  // Add/remove body class when chatbot is active
  useEffect(() => {
    if (currentView === 'chatbot') {
      document.body.classList.add('chatbot-active');
    } else {
      document.body.classList.remove('chatbot-active');
    }

    return () => {
      document.body.classList.remove('chatbot-active');
    };
  }, [currentView]);

  const fetchCategories = async () => {
    try {
      const response = await notesApi.getCategories();
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchNotesFromDatabase = async () => {
    try {
      const remoteNotes = await notesService.getAllNotes();
      const mappedNotes = remoteNotes.map(normalizeNote);

      setNotes(mappedNotes);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  };

  const fetchMyShares = async () => {
    try {
      const response = await sharedNotesApi.getMyShares();
      setMyShares(response.data.shares);
    } catch (error) {
      console.error('Failed to fetch my shares:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = today - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Created today';
    if (diffDays === 1) return 'Created yesterday';
    return `Created ${diffDays} days ago`;
  };

  const formatArchivedDate = (dateString) => {
    if (!dateString) return 'Archived';
    const formatted = new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    return `Archived on ${formatted}`;
  };

  const addNote = async () => {
    if (!newNoteTitle.trim()) return;
    
    try {
      const result = await notesService.addNote({
        title: newNoteTitle,
        content: '',
        file_id: null,
        category_id: newNoteCategory || null
      });

      if (result.queued) {
        toast.info('📱 Offline: Note will sync when back online');
      } else {
        toast.success('Note created successfully!');
        // Trigger quest refresh
        window.dispatchEvent(new Event('questActivity'));
      }
      
      setNewNoteTitle('');
      setNewNoteCategory('');
      setShowAddNote(false);
      setNotesView('active');
      
      await fetchNotesFromDatabase();
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create note. Please try again.');
    }
  };

  const updateNote = async (updatedNote) => {
    try {
      await notesService.updateNote(updatedNote.id, {
        title: updatedNote.title,
        content: updatedNote.content,
        category_id: updatedNote.categoryId || null
      });
      
      toast.success('Note updated successfully!');
      await fetchNotesFromDatabase();
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note. Please try again.');
    }
  };

  const changeNoteCategory = async (noteId, categoryId) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      const response = await notesApi.update(noteId, {
        title: note.title,
        content: note.content,
        category_id: categoryId
      });

      const mappedNote = normalizeNote(response.data.note);
      
      setNotes(notes.map(n => 
        n.id === mappedNote.id ? mappedNote : n
      ));
      
      await cacheSingleNote(mappedNote);
      
      toast.success('Category updated successfully!');
      setShowCategoryPicker(null);
    } catch (error) {
      console.error('Error changing category:', error);
      toast.error('Failed to change category. Please try again.');
    }
  };

  const deleteNote = async (id) => {
    const targetNote = notes.find(n => n.id === id);
    if (targetNote && !targetNote.isArchived) {
      toast.info('Archive this note before deleting permanently.');
      return;
    }

    let deleted = false;
    await confirm({
      title: 'Delete Note',
      message: 'Are you sure you want to delete this note? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await notesService.deleteNote(id);
          toast.success('Note deleted successfully!');
          await fetchNotesFromDatabase();
          deleted = true;
        } catch (error) {
          console.error('Error deleting note:', error);
          const message = error.response?.data?.error || 'Failed to delete note. Please try again.';
          toast.error(message);
        }
      }
    });

    return deleted;
  };

  const pinNote = async (id) => {
    try {
      const response = await notesApi.pinNote(id);
      
      const updatedNote = normalizeNote(response.data.note);
      
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === id ? updatedNote : note
        )
      );
      
      await cacheSingleNote(updatedNote);
      toast.success('Note pinned!');
    } catch (error) {
      console.error('Error pinning note:', error);
      toast.error('Failed to pin note. Please try again.');
    }
  };

  const unpinNote = async (id) => {
    try {
      const response = await notesApi.unpinNote(id);
      
      const updatedNote = normalizeNote(response.data.note);
      
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === id ? updatedNote : note
        )
      );
      
      await cacheSingleNote(updatedNote);
      toast.success('Note unpinned!');
    } catch (error) {
      console.error('Error unpinning note:', error);
      toast.error('Failed to unpin note. Please try again.');
    }
  };
  
  const archiveSingleNote = async (id) => {
    try {
      const response = await notesApi.archive(id);
      const updatedNote = normalizeNote(response.data.note);

      setNotes(prevNotes =>
        prevNotes.map(note => (note.id === updatedNote.id ? updatedNote : note))
      );

      setEditingNote(prev => (prev && prev.id === updatedNote.id ? updatedNote : prev));

      await cacheSingleNote(updatedNote);
      toast.success('Note archived!');
    } catch (error) {
      console.error('Error archiving note:', error);
      const message = error.response?.data?.error || 'Failed to archive note. Please try again.';
      toast.error(message);
    }
  };
  
  const restoreSingleNote = async (id) => {
    try {
      const response = await notesApi.restore(id);
      const updatedNote = normalizeNote(response.data.note);

      setNotes(prevNotes =>
        prevNotes.map(note => (note.id === updatedNote.id ? updatedNote : note))
      );

      setEditingNote(prev => (prev && prev.id === updatedNote.id ? updatedNote : prev));

      await cacheSingleNote(updatedNote);
      toast.success('Note restored!');
    } catch (error) {
      console.error('Error restoring note:', error);
      const message = error.response?.data?.error || 'Failed to restore note. Please try again.';
      toast.error(message);
    }
  };
  
  const archiveAllNotes = async () => {
    if (notes.filter(note => !note.isArchived).length === 0) {
      toast.info('No active notes to archive.');
      return;
    }

    await confirm({
      title: 'Archive All Notes',
      message: 'This will move all active notes to the Archived view. You can restore them anytime.',
      confirmText: 'Archive All',
      cancelText: 'Cancel',
      variant: 'warning',
      onConfirm: async () => {
        try {
          setArchivingAll(true);
          await notesApi.archiveAll();
          toast.success('All notes archived!');
          await fetchNotesFromDatabase();
        } catch (error) {
          console.error('Error archiving all notes:', error);
          toast.error('Failed to archive all notes. Please try again.');
        } finally {
          setArchivingAll(false);
        }
      }
    });
  };

  const shareNote = async (id) => {
    try {
      const response = await notesApi.share(id);

      navigator.clipboard.writeText(response.data.shareCode)
        .then(() => toast.success(`Share code copied: ${response.data.shareCode}\n\nShare this code with others!`))
        .catch(() => toast.info(`Share code: ${response.data.shareCode}\n\nCopy this code to share your note.`));

      fetchMyShares();
    } catch (error) {
      console.error('Error sharing note:', error);
      const errorMsg = error.response?.data?.error || 'Failed to share note';
      toast.error(errorMsg);
    }
  };

  const stopSharing = async (noteId) => {
    await confirm({
      title: 'Stop Sharing',
      message: 'Stop sharing this note? The share code will no longer work.',
      confirmText: 'Stop Sharing',
      cancelText: 'Cancel',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await notesApi.stopSharing(noteId);
          toast.success('Share deactivated successfully');
          fetchMyShares();
        } catch (error) {
          console.error('Error stopping share:', error);
          const errorMsg = error.response?.data?.error || 'Unknown error';
          toast.error(`Failed to stop sharing: ${errorMsg}`);
        }
      }
    });
  };

  const copyShareCode = (code) => {
    navigator.clipboard.writeText(code)
      .then(() => toast.success(`Share code copied: ${code}`))
      .catch(() => toast.info(`Share code: ${code}`));
  };

  const handleShareLinkSubmit = async () => {
    const code = shareLink.trim().toUpperCase();
    
    if (!code || code.length !== 6) {
      toast.warning('Please enter a valid 6-character share code');
      return;
    }

    try {
      await sharedNotesApi.retrieve(code);
      
      setShareLink('');
      toast.success('Shared note added to your notes!');
      fetchNotesFromDatabase();
    } catch (error) {
      console.error('Error retrieving shared note:', error);
      const errorMsg = error.response?.data?.error;
      
      if (errorMsg === "You already have this shared note") {
        toast.info('You already have this note in your collection.');
      } else if (errorMsg === "Shared note not found or expired") {
        toast.error('Invalid share code. Please check and try again.');
      } else {
        toast.error(`Error: ${errorMsg || 'Failed to retrieve shared note'}`);
      }
    }
  };

  const handleChatbot = (noteId) => {
    let note = notes.find(n => n.id === noteId);
    
    if (note) {
      setChatbotNote(note);
      setCurrentView('chatbot');
    }
  };

  const handleGenerateQuiz = (note) => {
    setQuizGenerationNote(note);
    setShowGenerateQuizModal(true);
  };

  const openEditPage = (note) => {
    if (exportMode) return; // Don't open editor in export mode
    setEditingNote(note);
    setCurrentView('edit');
  };

  const goBackToList = () => {
    setCurrentView('list');
    setEditingNote(null);
    setChatbotNote(null);
    fetchNotesFromDatabase();
    fetchMyShares();
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const response = await notesApi.createCategory({
        name: newCategoryName.trim(),
        color: '#3B82F6'
      });
      
      setCategories([...categories, response.data.category]);
      setNewCategoryName('');
      setShowCategoryModal(false);
      toast.success('Category created successfully!');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category. It may already exist.');
    }
  };

  // PDF Export Functions
  const startExportMode = (noteId) => {
    setExportMode(true);
    setSelectedNotes(new Set([noteId]));
  };

  const toggleNoteSelection = (noteId) => {
    setSelectedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const cancelExportMode = () => {
    setExportMode(false);
    setSelectedNotes(new Set());
  };

  const handleExportPDF = () => {
    if (selectedNotes.size === 0) {
      toast.warning('Please select at least one note to export');
      return;
    }

    const notesToExport = notes.filter(note => selectedNotes.has(note.id));

    if (notesToExport.length === 1) {
      const result = exportNoteToPDF(notesToExport[0]);
      if (result.success) {
        toast.success(`PDF exported successfully!\n\nFile: ${result.fileName}`);
        cancelExportMode();
      } else {
        toast.error(`Export failed: ${result.error}`);
      }
    } else {
      const result = exportMultipleNotesToPDF(notesToExport);
      if (result.success) {
        toast.success(`${result.count} notes exported successfully!\n\nFile: ${result.fileName}`);
        cancelExportMode();
      } else {
        toast.error(`Export failed: ${result.error}`);
      }
    }
  };

  const activeNotes = notes.filter(note => !note.isArchived);
  const archivedNotes = notes.filter(note => note.isArchived);
  const visibleNotes = notesView === 'archived' ? archivedNotes : activeNotes;

  const filteredNotes = visibleNotes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                            (note.category && note.category.category_id === parseInt(selectedCategory));
    return matchesSearch && matchesCategory;
  });

  const filteredMyShares = myShares.filter(share =>
    share.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pinnedNotes = filteredNotes.filter(note => note.isPinned);
  const unpinnedNotes = filteredNotes.filter(note => !note.isPinned);

  const renderNoteItem = (note) => (
    <div
      key={note.id}
      className={`group p-3 sm:p-4 border rounded-lg sm:rounded-xl hover:shadow-md transition-all duration-200 ${
        exportMode 
          ? selectedNotes.has(note.id)
            ? 'border-blue-500 bg-yellow-50'
            : 'border-slate-200 bg-white'
          : note.isArchived
            ? 'border-slate-200 bg-slate-50 hover:border-slate-300 opacity-90'
            : note.isPinned 
              ? 'border-yellow-300 bg-yellow-50 hover:border-yellow-400' 
              : 'border-slate-200 bg-white hover:border-slate-300'
      } ${exportMode ? 'cursor-pointer' : 'cursor-pointer'}`}
      onClick={() => exportMode ? toggleNoteSelection(note.id) : openEditPage(note)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {exportMode && (
            <div className="flex-shrink-0 pt-1">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                selectedNotes.has(note.id)
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-slate-300'
              }`}>
                {selectedNotes.has(note.id) && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {!exportMode && note.isPinned && <Pin className="w-3 h-3 text-yellow-600 fill-yellow-600 flex-shrink-0" />}
              <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                note.isArchived
                  ? 'bg-gradient-to-r from-slate-300 to-slate-500'
                  : note.isPinned 
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-700' 
                    : 'bg-gradient-to-r from-green-400 to-green-600'
              }`}></div>
              <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors text-sm sm:text-base truncate">
                {note.title}
              </h3>
              {!exportMode && <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-slate-500 mb-2">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 flex-shrink-0" />
                {note.words} words
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{formatDate(note.createdAt)}</span>
              </span>
              {note.category && (
                <span 
                  className="px-2 py-1 rounded-full text-xs"
                  style={{ 
                    backgroundColor: `${note.category.color}20`,
                    color: note.category.color,
                    border: `1px solid ${note.category.color}`
                  }}
                >
                  {note.category.name}
                </span>
              )}
              {note.isArchived && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Archive className="w-3 h-3 flex-shrink-0" />
                  {formatArchivedDate(note.archivedAt)}
                </span>
              )}
            </div>
            {note.content && (
              <p className="text-xs sm:text-sm text-slate-600 mt-2 line-clamp-2">
                {note.content.substring(0, 100)}...
              </p>
            )}
          </div>
        </div>
        {!exportMode && !note.isArchived && (
          <div className="hidden sm:flex flex-col gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2 relative" data-tutorial="note-actions">
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleChatbot(note.id);
                }}
                className="p-1.5 sm:p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Ask AI Assistant"
              >
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCategoryPicker(showCategoryPicker === note.id ? null : note.id);
                }}
                className="p-1.5 sm:p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Change category"
              >
                <Tag className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              {note.isPinned ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    unpinNote(note.id);
                  }}
                  className="p-1.5 sm:p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                  title="Unpin note"
                >
                  <PinOff className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    pinNote(note.id);
                  }}
                  className="p-1.5 sm:p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  title="Pin note"
                >
                  <Pin className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  shareNote(note.id);
                }}
                className="p-1.5 sm:p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Share"
              >
                <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  archiveSingleNote(note.id);
                }}
                className="p-1.5 sm:p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Archive"
              >
                <Archive className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startExportMode(note.id);
                }}
                className="p-1.5 sm:p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Export to PDF"
              >
                <FileDown className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateQuiz(note);
                }}
                className="p-1.5 sm:p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Generate Quiz with AI"
              >
                <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
            {showCategoryPicker === note.id && (
              <div 
                className="absolute right-full mr-2 top-0 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-10 w-64"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-xs font-semibold text-slate-600 mb-2">Select Category</div>
                <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      changeNoteCategory(note.id, null);
                    }}
                    className="text-left px-2 py-1.5 text-xs hover:bg-slate-100 rounded transition-colors text-slate-600 col-span-2"
                  >
                    None
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.category_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        changeNoteCategory(note.id, cat.category_id);
                      }}
                      className="text-left px-2 py-1.5 text-xs hover:bg-slate-100 rounded transition-colors flex items-center gap-1.5"
                      style={{ color: cat.color }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></span>
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {!exportMode && note.isArchived && (
          <div className="hidden sm:flex flex-col gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  restoreSingleNote(note.id);
                }}
                className="p-1.5 sm:p-2 text-blue-600 hover:bg-yellow-50 rounded-lg transition-colors"
                title="Restore"
              >
                <ArchiveRestore className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNote(note.id);
                }}
                className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startExportMode(note.id);
                }}
                className="p-1.5 sm:p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Export to PDF"
              >
                <FileDown className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      {!exportMode && !note.isArchived && (
        <div className="sm:hidden flex items-center justify-end gap-1 mt-2 pt-2 border-t border-slate-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              startExportMode(note.id);
            }}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Export to PDF"
          >
            <FileDown className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleGenerateQuiz(note);
            }}
            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Generate Quiz with AI"
          >
            <Brain className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleChatbot(note.id);
            }}
            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Ask AI Assistant"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCategoryPicker(showCategoryPicker === note.id ? null : note.id);
            }}
            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors relative"
            title="Change category"
          >
            <Tag className="w-4 h-4" />
            {showCategoryPicker === note.id && (
              <div 
                className="absolute right-0 bottom-full mb-2 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-10 w-64"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-xs font-semibold text-slate-600 mb-2">Select Category</div>
                <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      changeNoteCategory(note.id, null);
                    }}
                    className="text-left px-2 py-1.5 text-xs hover:bg-slate-100 rounded transition-colors text-slate-600 col-span-2"
                  >
                    None
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.category_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        changeNoteCategory(note.id, cat.category_id);
                      }}
                      className="text-left px-2 py-1.5 text-xs hover:bg-slate-100 rounded transition-colors flex items-center gap-1.5"
                      style={{ color: cat.color }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></span>
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </button>
          {note.isPinned ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                unpinNote(note.id);
              }}
              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
              title="Unpin note"
            >
              <PinOff className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                pinNote(note.id);
              }}
              className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              title="Pin note"
            >
              <Pin className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              shareNote(note.id);
            }}
            className="p-1.5 text-blue-600 hover:bg-yellow-50 rounded-lg transition-colors"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              archiveSingleNote(note.id);
            }}
            className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            title="Archive"
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      )}
      {!exportMode && note.isArchived && (
        <div className="sm:hidden flex items-center justify-end gap-1 mt-2 pt-2 border-t border-slate-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              startExportMode(note.id);
            }}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Export to PDF"
          >
            <FileDown className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              restoreSingleNote(note.id);
            }}
            className="p-1.5 text-blue-600 hover:bg-yellow-50 rounded-lg transition-colors"
            title="Restore"
          >
            <ArchiveRestore className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNote(note.id);
            }}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  if (currentView === 'chatbot' && chatbotNote) {
    return (
      <Chatbot
        currentNote={chatbotNote}
        notes={notes}
        onBack={goBackToList}
      />
    );
  }

  if (currentView === 'edit' && editingNote) {
    return (
      <>
        <NoteEditor
          note={editingNote}
          onSave={updateNote}
          onDelete={deleteNote}
          onShare={shareNote}
          onBack={goBackToList}
          onChatbot={handleChatbot}
          onGenerateQuiz={handleGenerateQuiz}
          formatDate={formatDate}
          onArchive={archiveSingleNote}
          onRestore={restoreSingleNote}
          categories={categories}
          onExport={(note) => {
            const result = exportNoteToPDF(note);
            if (result.success) {
            toast.success(`PDF exported successfully!\n\nFile: ${result.fileName}`);
            } else {
            toast.error(`Export failed: ${result.error}`);
            }
          }}
        />
        
        {/* Generate Quiz Modal - for Edit View */}
        {showGenerateQuizModal && quizGenerationNote && (
          <GenerateQuizModal
            note={quizGenerationNote}
            onClose={() => {
              setShowGenerateQuizModal(false);
              setQuizGenerationNote(null);
            }}
            onQuizCreated={() => {
              setShowGenerateQuizModal(false);
              setQuizGenerationNote(null);
              toast.success('Quiz generated successfully! Redirecting...');
            }}
            toast={toast}
          />
        )}
      </>
    );
  }

  if (initialLoading) {
    return <AppLoader message="Loading Notes..." />;
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      
      {/* Tutorial Overlay */}
      {showTutorial && (
        <TutorialOverlay 
          steps={notesTutorialSteps}
          onComplete={completeTutorial}
          onSkip={skipTutorial}
        />
      )}
      
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
      />
      
      <div className="max-w-7xl mx-auto">
        {/* Export Mode Banner */}
        {exportMode && (
          <div className="mb-4 bg-blue-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileDown className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Export Mode</h3>
                  <p className="text-sm text-blue-100">
                    {selectedNotes.size} note{selectedNotes.size !== 1 ? 's' : ''} selected - Click notes to select/deselect
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  disabled={selectedNotes.size === 0}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedNotes.size > 0
                      ? 'bg-white text-blue-600 hover:bg-yellow-50'
                      : 'bg-blue-400 text-blue-200 cursor-not-allowed'
                  }`}
                >
                  Export PDF
                </button>
                <button
                  onClick={cancelExportMode}
                  className="p-2 hover:bg-yellow-500 rounded-lg transition-colors"
                  title="Cancel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800">Notes</h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            <div className="relative flex-1 max-w-full sm:max-w-md" data-tutorial="search-notes">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                data-tutorial="categories"
                className="px-3 py-2 border-2 border-slate-300 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all text-sm sm:text-base border-2 border-slate-300 bg-slate-50 font-medium"
              >
                <span>Add Category</span>
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setNotesView('active')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm sm:text-base transition-colors ${
                notesView === 'active'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Active ({activeNotes.length})
            </button>
            <button
              onClick={() => setNotesView('archived')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm sm:text-base transition-colors ${
                notesView === 'archived'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Archive className="w-4 h-4" />
              Archived ({archivedNotes.length})
            </button>
          </div>
        </div>

        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Create New Category</h3>
              <input
                type="text"
                placeholder="Enter category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4"
                onKeyPress={(e) => e.key === 'Enter' && addCategory()}
              />
              <div className="flex gap-2">
                <button
                  onClick={addCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-1"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6" data-tutorial="notes-header">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-800">
                {notesView === 'archived' ? 'Archived Notes' : 'My Notes'}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-slate-500">
                  {filteredNotes.length} {notesView === 'archived' ? 'archived' : 'active'}
                </span>
                {notesView === 'active' && activeNotes.length > 0 && (
                  <button
                    onClick={archiveAllNotes}
                    disabled={archivingAll}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs sm:text-sm transition-colors ${
                      archivingAll
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <Archive className="w-3 h-3" />
                    {archivingAll ? 'Archiving...' : 'Archive All'}
                  </button>
                )}
              </div>
            </div>

            {showAddNote ? (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                <input
                  type="text"
                  placeholder="Enter note title..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addNote()}
                  className="w-full p-2 sm:p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3 text-sm sm:text-base"
                  autoFocus
                />
                <select
                  value={newNoteCategory}
                  onChange={(e) => setNewNoteCategory(e.target.value)}
                  className="w-full p-2 sm:p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3 text-sm sm:text-base"
                >
                  <option value="">No Category</option>
                  {categories.map(category => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={addNote}
                    className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    Create Note
                  </button>
                  <button
                    onClick={() => {
                      setShowAddNote(false);
                      setNewNoteTitle('');
                      setNewNoteCategory('');
                    }}
                    className="px-3 sm:px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddNote(true)}
                disabled={exportMode}
                data-tutorial="create-note"
                className={`mb-4 sm:mb-6 px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md text-sm font-medium group ${
                  exportMode
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-slate-800 hover:shadow-lg'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Note</span>
              </button>
            )}

            <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
              {pinnedNotes.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2 px-2">
                    <Pin className="w-4 h-4 text-yellow-600" />
                    <span className="text-xs font-medium text-yellow-600">PINNED</span>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    {pinnedNotes.map((note) => renderNoteItem(note))}
                  </div>
                </div>
              )}
              
              {unpinnedNotes.length > 0 && (
                <div>
                  {pinnedNotes.length > 0 && (
                    <div className="flex items-center gap-2 mb-2 px-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-medium text-slate-500">OTHER NOTES</span>
                    </div>
                  )}
                  <div className="space-y-2 sm:space-y-3">
                    {unpinnedNotes.map((note) => renderNoteItem(note))}
                  </div>
                </div>
              )}
              
              {filteredNotes.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-slate-500 text-sm sm:text-base">
                  {searchTerm
                    ? 'No notes found matching your search.'
                    : notesView === 'archived'
                      ? 'No archived notes yet. Archived notes will appear here.'
                      : 'No notes yet. Create your first note!'}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-800">My Shares</h2>
              <span className="text-xs sm:text-sm text-slate-500">{filteredMyShares.length} shared</span>
            </div>

            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Enter share code..."
                  value={shareLink}
                  onChange={(e) => setShareLink(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleShareLinkSubmit()}
                  maxLength={6}
                  className="flex-1 p-2 sm:p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm sm:text-base uppercase tracking-wider font-mono"
                />
                <button
                  onClick={handleShareLinkSubmit}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-black text-white rounded-lg hover:bg-slate-800 transition-all font-medium shadow-md hover:shadow-lg text-sm sm:text-base flex items-center gap-2"
                >
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
                    <Share2 className="w-3 h-3" />
                  </div>
                  Retrieve
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">Enter a 6-character code to retrieve shared notes</p>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-slate-600">
                Your shared notes. Click the copy icon to share the code with others.
              </p>
            </div>

            <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
              {filteredMyShares.map((share) => (
                <div
                  key={share.share_code}
                  className="group p-3 sm:p-4 border border-slate-200 rounded-lg sm:rounded-xl hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-gradient-to-r from-blue-50 to-indigo-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-blue-400 to-indigo-600 rounded-full flex-shrink-0"></div>
                        <h3 className="font-semibold text-slate-800 text-sm sm:text-base truncate">
                          {share.title}
                        </h3>
                        <ExternalLink className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-white border border-blue-300 rounded text-xs font-mono font-bold text-blue-700">
                          {share.share_code}
                        </span>
                        <button
                          onClick={() => copyShareCode(share.share_code)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Copy share code"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{formatDate(share.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                      <button
                        onClick={() => stopSharing(share.note_id)}
                        className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Stop sharing"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredMyShares.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-slate-500 text-sm sm:text-base">
                  {searchTerm ? 'No shared notes found.' : 'No notes shared yet. Share a note to get started!'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Generate Quiz Modal */}
      {showGenerateQuizModal && quizGenerationNote && (
        <GenerateQuizModal
          note={quizGenerationNote}
          onClose={() => {
            setShowGenerateQuizModal(false);
            setQuizGenerationNote(null);
          }}
          onQuizCreated={() => {
            setShowGenerateQuizModal(false);
            setQuizGenerationNote(null);
            toast.success('Quiz generated successfully! Redirecting...');
            // The modal will handle navigation to the quiz
          }}
          toast={toast}
        />
      )}

      {/* Tutorial Button */}
      <TutorialButton onClick={startTutorial} />
    </div>
  );
};

export default Notes;
