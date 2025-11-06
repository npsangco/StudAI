import React, { useState, useEffect } from 'react';
import { Plus, Share2, Trash2, Copy, Search, Filter, Clock, FileText, 
         MessageCircle, Edit3, ExternalLink, Pin, PinOff, FolderPlus, 
         Tag, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { syncService } from '../utils/syncService';
import NoteEditor from '../components/NoteEditor';
import Chatbot from '../components/Chatbot';
import { notesApi, sharedNotesApi } from '../api/api';

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
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotesFromDatabase();
    fetchMyShares();
    fetchCategories();
  }, []);

  useEffect(() => {
    const updateSyncStatus = async () => {
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    };

    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 3000);

    return () => clearInterval(interval);
  }, []);

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
      const notes = await syncService.refreshCache();
      
      const mappedNotes = notes.map(note => ({
        id: note.note_id || note.id,
        title: note.title,
        words: note.words || (note.content ? note.content.split(/\s+/).length : 0),
        createdAt: note.created_at || note.createdAt,
        content: note.content || '',
        isShared: note.is_shared || false,
        isPinned: note.is_pinned || false,
        category: note.category || null,
        categoryId: note.category_id || null
      }));

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

  const addNote = async () => {
    if (!newNoteTitle.trim()) return;
    
    try {
      const result = await syncService.addNote({
        title: newNoteTitle,
        content: '',
        file_id: null,
        category_id: newNoteCategory || null
      });

      if (result.queued) {
        alert('📱 Offline: Note will sync when back online');
      }
      
      setNewNoteTitle('');
      setNewNoteCategory('');
      setShowAddNote(false);
      
      await fetchNotesFromDatabase();
    } catch (error) {
      console.error('Error creating note:', error);
      alert('Failed to create note. Please try again.');
    }
  };

  const updateNote = async (updatedNote) => {
    try {
      await syncService.updateNote(updatedNote.id, {
        title: updatedNote.title,
        content: updatedNote.content,
        category_id: updatedNote.categoryId || null
      });
      
      await fetchNotesFromDatabase();
    } catch (error) {
      console.error('Error updating note:', error);
      alert('Failed to update note. Please try again.');
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

      const mappedNote = {
        id: response.data.note.note_id,
        title: response.data.note.title,
        words: response.data.note.words || (response.data.note.content ? response.data.note.content.split(/\s+/).length : 0),
        createdAt: response.data.note.created_at || response.data.note.createdAt,
        content: response.data.note.content || '',
        isShared: response.data.note.is_shared || false,
        isPinned: response.data.note.is_pinned || false,
        category: response.data.note.category || null,
        categoryId: response.data.note.category_id || null
      };
      
      setNotes(notes.map(n => 
        n.id === mappedNote.id ? mappedNote : n
      ));
      
      setShowCategoryPicker(null);
    } catch (error) {
      console.error('Error changing category:', error);
      alert('Failed to change category. Please try again.');
    }
  };

  const deleteNote = async (id) => {
    try {
      await syncService.deleteNote(id);
      await fetchNotesFromDatabase();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const pinNote = async (id) => {
    try {
      await notesApi.pinNote(id);
      fetchNotesFromDatabase();
    } catch (error) {
      console.error('Error pinning note:', error);
      alert('Failed to pin note. Please try again.');
    }
  };

  const unpinNote = async (id) => {
    try {
      await notesApi.unpinNote(id);
      fetchNotesFromDatabase();
    } catch (error) {
      console.error('Error unpinning note:', error);
      alert('Failed to unpin note. Please try again.');
    }
  };

  const shareNote = async (id) => {
    try {
      const response = await notesApi.share(id);

      navigator.clipboard.writeText(response.data.shareCode)
        .then(() => alert(`✅ Share code copied: ${response.data.shareCode}\n\nShare this code with others!`))
        .catch(() => alert(`Share code: ${response.data.shareCode}\n\nCopy this code to share your note.`));

      fetchMyShares();
    } catch (error) {
      console.error('Error sharing note:', error);
      const errorMsg = error.response?.data?.error || 'Failed to share note';
      alert(`❌ ${errorMsg}`);
    }
  };

  const stopSharing = async (noteId) => {
    if (!confirm('Stop sharing this note? The share code will no longer work.')) {
      return;
    }

    try {
      await notesApi.stopSharing(noteId);
      alert('✅ Share deactivated successfully');
      fetchMyShares();
    } catch (error) {
      console.error('Error stopping share:', error);
      const errorMsg = error.response?.data?.error || 'Unknown error';
      alert(`❌ Failed to stop sharing: ${errorMsg}`);
    }
  };

  const copyShareCode = (code) => {
    navigator.clipboard.writeText(code)
      .then(() => alert(`✅ Share code copied: ${code}`))
      .catch(() => alert(`Share code: ${code}`));
  };

  const handleShareLinkSubmit = async () => {
    const code = shareLink.trim().toUpperCase();
    
    if (!code || code.length !== 6) {
      alert('⚠️ Please enter a valid 6-character share code');
      return;
    }

    try {
      await sharedNotesApi.retrieve(code);
      
      setShareLink('');
      alert('✅ Shared note added to your notes!');
      fetchNotesFromDatabase();
    } catch (error) {
      console.error('Error retrieving shared note:', error);
      const errorMsg = error.response?.data?.error;
      
      if (errorMsg === "You already have this shared note") {
        alert('You already have this note in your collection.');
      } else if (errorMsg === "Shared note not found or expired") {
        alert('Invalid share code. Please check and try again.');
      } else {
        alert(`Error: ${errorMsg || 'Failed to retrieve shared note'}`);
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

  const openEditPage = (note) => {
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
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category. It may already exist.');
    }
  };

  const filteredNotes = notes.filter(note => {
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
      className={`group p-3 sm:p-4 border rounded-lg sm:rounded-xl hover:shadow-md transition-all duration-200 bg-white cursor-pointer ${
        note.isPinned 
          ? 'border-yellow-300 bg-yellow-50 hover:border-yellow-400' 
          : 'border-slate-200 hover:border-slate-300'
      }`}
      onClick={() => openEditPage(note)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {note.isPinned && <Pin className="w-3 h-3 text-yellow-600 fill-yellow-600 flex-shrink-0" />}
            <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
              note.isPinned 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-700' 
                : 'bg-gradient-to-r from-green-400 to-green-600'
            }`}></div>
            <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors text-sm sm:text-base truncate">
              {note.title}
            </h3>
            <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
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
          </div>
          {note.content && (
            <p className="text-xs sm:text-sm text-slate-600 mt-2 line-clamp-2">
              {note.content.substring(0, 100)}...
            </p>
          )}
        </div>
        {/* Action buttons - 2 columns on desktop, single row on mobile */}
        <div className="hidden sm:flex flex-col gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2 relative">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleChatbot(note.id);
              }}
              className="p-1.5 sm:p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Ask AI Assistant"
            >
              <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCategoryPicker(showCategoryPicker === note.id ? null : note.id);
              }}
              className="p-1.5 sm:p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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
              className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Share"
            >
              <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteNote(note.id);
              }}
              className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors col-span-2"
              title="Delete"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
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
      </div>
      {/* Mobile action buttons - single row at bottom */}
      <div className="sm:hidden flex items-center justify-end gap-1 mt-2 pt-2 border-t border-slate-200">
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
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Share"
        >
          <Share2 className="w-4 h-4" />
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
      <NoteEditor
        note={editingNote}
        onSave={updateNote}
        onDelete={deleteNote}
        onShare={shareNote}
        onBack={goBackToList}
        onChatbot={handleChatbot}
        formatDate={formatDate}
        categories={categories}
      />
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800">Notes</h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            <div className="relative flex-1 max-w-full sm:max-w-md">
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
                className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
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
                className="flex items-center justify-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-white rounded-lg transition-all text-sm sm:text-base border border-slate-200"
              >
                <Filter className="w-4 h-4" />
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {showCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-800">My Notes</h2>
              <span className="text-xs sm:text-sm text-slate-500">{filteredNotes.length} notes</span>
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
                className="w-full mb-4 sm:mb-6 p-3 sm:p-4 bg-black text-white rounded-xl hover:bg-slate-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Add a note
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
                  {searchTerm ? 'No notes found matching your search.' : 'No notes yet. Create your first note!'}
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
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  Retrieve
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">Enter a 6-character code to retrieve shared notes</p>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
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
    </div>
  );
};

export default Notes;