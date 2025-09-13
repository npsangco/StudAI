// NoteEditor.js - Separate Editor Component
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Share2, Trash2, MessageCircle } from 'lucide-react';

const NoteEditor = ({ 
  note, 
  onSave, 
  onDelete, 
  onShare, 
  onBack, 
  onChatbot, 
  formatDate 
}) => {
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setEditTitle(note.title);
    setEditContent(note.content);
    setHasUnsavedChanges(false);
  }, [note]);

  useEffect(() => {
    const hasChanges = editTitle !== note.title || editContent !== note.content;
    setHasUnsavedChanges(hasChanges);
  }, [editTitle, editContent, note.title, note.content]);

  const saveNote = () => {
    const wordCount = editContent.trim() ? editContent.trim().split(/\s+/).length : 0;
    
    const updatedNote = {
      ...note,
      title: editTitle || 'Untitled Note',
      content: editContent,
      words: wordCount
    };
    
    onSave(updatedNote);
    setHasUnsavedChanges(false);
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to go back?')) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      onDelete(note.id);
      onBack();
    }
  };

  const handleShare = () => {
    onShare(note.id);
    // Show a temporary notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    notification.textContent = 'Note shared successfully!';
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 3000);
  };

  const currentWordCount = editContent.trim() ? editContent.trim().split(/\s+/).length : 0;

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
                  {hasUnsavedChanges && (
                    <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" title="Unsaved changes"></span>
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 truncate">
                  {currentWordCount} words • {formatDate(note.createdAt)}
                </p>
              </div>
            </div>
            
            {/* Mobile Actions */}
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => onChatbot(note.id)}
                className="p-2 sm:px-4 sm:py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all flex items-center gap-2"
                title="Ask AI Assistant"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Ask AI</span>
              </button>
              <button
                onClick={saveNote}
                disabled={!hasUnsavedChanges}
                className={`p-2 sm:px-4 sm:py-2 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-sm ${
                  hasUnsavedChanges 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {hasUnsavedChanges ? 'Save' : 'Saved'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Title Input */}
          <div className="p-4 sm:p-6 border-b border-slate-200">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 placeholder-slate-400 border-none outline-none resize-none bg-transparent"
              placeholder="Untitled Note..."
            />
          </div>

          {/* Content Editor */}
          <div className="p-4 sm:p-6">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[400px] sm:min-h-[500px] md:min-h-[600px] text-slate-700 placeholder-slate-400 border-none outline-none resize-none text-base sm:text-lg leading-relaxed bg-transparent"
              placeholder="Start writing your note here..."
              style={{ fontFamily: 'inherit' }}
            />
          </div>

          {/* Status Bar */}
          <div className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 text-xs sm:text-sm text-slate-500">
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span>Chars: {editContent.length}</span>
              <span>Words: {currentWordCount}</span>
              <span className="hidden sm:inline">Lines: {editContent.split('\n').length}</span>
            </div>
            <div>
              {hasUnsavedChanges ? (
                <span className="text-orange-600 flex items-center gap-1 text-xs sm:text-sm">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                  <span className="hidden sm:inline">Unsaved changes</span>
                  <span className="sm:hidden">Unsaved</span>
                </span>
              ) : (
                <span className="text-green-600 text-xs sm:text-sm">
                  <span className="hidden sm:inline">All changes saved</span>
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
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-all hover:shadow-md text-sm sm:text-base"
            >
              <Share2 className="w-4 h-4" />
              Share Note
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all hover:shadow-md text-sm sm:text-base"
            >
              <Trash2 className="w-4 h-4" />
              Delete Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;