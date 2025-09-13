// Notes.js - Main Notes List Component
import React, { useState } from 'react';
import { Plus, Share2, Trash2, Save, Copy, Search, Filter, Clock, FileText, MessageCircle, Edit3 } from 'lucide-react';
import NoteEditor from '../components/NoteEditor';
import Chatbot from '../components/Chatbot';

const Notes = () => {
  const [notes, setNotes] = useState([
    {
      id: 1,
      title: 'Data Algorithms',
      words: 500,
      createdAt: new Date().toISOString(),
      content: 'Comprehensive notes on data algorithms including sorting, searching, and optimization techniques.\n\nThis includes various sorting algorithms like quicksort, mergesort, and heapsort. Each algorithm has different time complexities and use cases.\n\nSearching algorithms include binary search, linear search, and hash-based searching methods.',
      isShared: false
    }
  ]);
  
  const [sharedNotes, setSharedNotes] = useState([
    {
      id: 1,
      title: 'Data Structures',
      words: 500,
      createdAt: new Date().toISOString(),
      content: 'Shared notes on fundamental data structures: arrays, linked lists, trees, and graphs.\n\nArrays provide O(1) access time but fixed size. Linked lists offer dynamic sizing but O(n) access time.\n\nTrees are hierarchical structures perfect for searching and sorting operations.',
      isShared: true
    }
  ]);
  
  const [shareLink, setShareLink] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [currentView, setCurrentView] = useState('list');
  const [editingNote, setEditingNote] = useState(null);
  const [chatbotNote, setChatbotNote] = useState(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = today - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Created today';
    if (diffDays === 1) return 'Created yesterday';
    return `Created ${diffDays} days ago`;
  };

  const addNote = () => {
    if (!newNoteTitle.trim()) return;
    
    const newNote = {
      id: Date.now(),
      title: newNoteTitle,
      words: 0,
      createdAt: new Date().toISOString(),
      content: '',
      isShared: false
    };
    
    setNotes([newNote, ...notes]);
    setNewNoteTitle('');
    setShowAddNote(false);
    openEditPage(newNote);
  };

  const updateNote = (updatedNote) => {
    setNotes(notes.map(note => 
      note.id === updatedNote.id ? updatedNote : note
    ));
  };

  const deleteNote = (id) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const shareNote = (id) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      const sharedNote = { ...note, isShared: true };
      setSharedNotes([sharedNote, ...sharedNotes]);
      setShareLink(`https://notes.app/shared/${id}`);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
  };

  const handleShareLinkSubmit = () => {
    if (shareLink.trim()) {
      const newSharedNote = {
        id: Date.now(),
        title: 'Imported Note',
        words: Math.floor(Math.random() * 1000),
        createdAt: new Date().toISOString(),
        content: 'This note was imported from a shared link.',
        isShared: true
      };
      setSharedNotes([newSharedNote, ...sharedNotes]);
      setShareLink('');
    }
  };

  const handleChatbot = (noteId) => {
    // Find the note from either personal notes or shared notes
    let note = notes.find(n => n.id === noteId);
    if (!note) {
      note = sharedNotes.find(n => n.id === noteId);
    }
    
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
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSharedNotes = sharedNotes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show chatbot if chatbot view is active
  if (currentView === 'chatbot' && chatbotNote) {
    return (
      <Chatbot
        currentNote={chatbotNote}
        notes={[...notes, ...sharedNotes]}
        onBack={goBackToList}
      />
    );
  }

  // Show editor if editing
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
      />
    );
  }

  // Main Notes List View
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 mb-3 sm:mb-4">Notes</h1>
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
            <button className="flex items-center justify-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-white rounded-lg transition-all text-sm sm:text-base">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Personal Notes */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-800">Notes</h2>
              <span className="text-xs sm:text-sm text-slate-500">{filteredNotes.length} notes</span>
            </div>

            {/* Add Note Section */}
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
                <div className="flex gap-2">
                  <button
                    onClick={addNote}
                    className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    Create Note
                  </button>
                  <button
                    onClick={() => setShowAddNote(false)}
                    className="px-3 sm:px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddNote(true)}
                className="w-full mb-4 sm:mb-6 p-3 sm:p-4 bg-black text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Add a note
              </button>
            )}

            {/* Notes List */}
            <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="group p-3 sm:p-4 border border-slate-200 rounded-lg sm:rounded-xl hover:border-slate-300 hover:shadow-md transition-all duration-200 bg-white cursor-pointer"
                  onClick={() => openEditPage(note)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex-shrink-0"></div>
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
                      </div>
                      {note.content && (
                        <p className="text-xs sm:text-sm text-slate-600 mt-2 line-clamp-2">
                          {note.content.substring(0, 100)}...
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
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
                        className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredNotes.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-slate-500 text-sm sm:text-base">
                  {searchTerm ? 'No notes found matching your search.' : 'No notes yet. Create your first note!'}
                </div>
              )}
            </div>
          </div>

          {/* Shared Notes */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-800">Shared Notes</h2>
              <span className="text-xs sm:text-sm text-slate-500">{filteredSharedNotes.length} shared</span>
            </div>

            {/* Share Link Input */}
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Enter share link..."
                  value={shareLink}
                  onChange={(e) => setShareLink(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleShareLinkSubmit()}
                  className="flex-1 p-2 sm:p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm sm:text-base"
                />
                <button
                  onClick={handleShareLinkSubmit}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  Enter
                </button>
              </div>
            </div>

            {/* Shared Notes List */}
            <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
              {filteredSharedNotes.map((note) => (
                <div
                  key={note.id}
                  className="group p-3 sm:p-4 border border-slate-200 rounded-lg sm:rounded-xl hover:border-slate-300 hover:shadow-md transition-all duration-200 bg-gradient-to-r from-purple-50 to-pink-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex-shrink-0"></div>
                        <h3 className="font-semibold text-slate-800 group-hover:text-purple-600 transition-colors text-sm sm:text-base truncate">
                          {note.title}
                        </h3>
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
                      </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
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
                        onClick={copyShareLink}
                        className="p-1.5 sm:p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Copy Link"
                      >
                        <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <button 
                        className="p-1.5 sm:p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Save"
                      >
                        <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredSharedNotes.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-slate-500 text-sm sm:text-base">
                  {searchTerm ? 'No shared notes found matching your search.' : 'No shared notes yet. Share a note or add a shared link!'}
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