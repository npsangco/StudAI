import React, { useState } from 'react';
import { Edit, Play, GripVertical, Trash2 } from 'lucide-react';
import EmptyQuizState from './EmptyState';

// Share Code Input Component
const ShareCodeInput = ({ onImportQuiz }) => {
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (shareCode.length !== 6) {
      setError('Enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('http://localhost:4000/api/quizzes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ share_code: shareCode })
      });

      const data = await response.json();

      if (response.ok) {
        setShareCode('');
        if (onImportQuiz) onImportQuiz();
        alert(`Quiz "${data.quiz.title}" imported successfully!`);
      } else {
        setError(data.error || 'Failed to import quiz');
      }
    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to import quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setShareCode(cleaned);
    setError('');
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-gray-600 uppercase">
        Import Quiz
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          placeholder="6-digit code"
          maxLength={6}
          value={shareCode}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 px-3 py-2 text-sm font-mono border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          disabled={loading}
        />
        <button
          onClick={handleImport}
          disabled={shareCode.length !== 6 || loading}
          className={`px-4 py-2 text-sm rounded-lg font-semibold transition-all ${
            shareCode.length === 6 && !loading
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? '...' : 'Import'}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
};

// Quiz Item Component with Drag & Drop
const QuizItem = ({ quiz, index, draggedIndex, onDragStart, onDragOver, onDrop, onEdit, onSelect, onDelete }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const isBeingDragged = draggedIndex === index;
  const showDropIndicator = isDragOver && !isBeingDragged;
  const isEmpty = !quiz.questionCount || quiz.questionCount === 0;
  const isShared = quiz.shared_by_username; // Check if quiz is shared

  const handleDragStart = (e) => {
    e.currentTarget.style.cursor = 'grabbing';
    onDragStart(e, index);
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.cursor = 'grab';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isBeingDragged) {
      setIsDragOver(true);
      onDragOver(e);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    setIsDragOver(false);
    onDrop(e, index);
  };

  const showTopIndicator = showDropIndicator && draggedIndex > index;
  const showBottomIndicator = showDropIndicator && draggedIndex < index;

  return (
    <div className="relative">
      {showTopIndicator && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 z-10">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full -ml-1"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full -mr-1"></div>
        </div>
      )}
      
      {showBottomIndicator && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 z-10">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full -ml-1"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full -mr-1"></div>
        </div>
      )}
      
      <div 
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col p-2.5 sm:p-3 bg-gray-50 rounded-lg transition-all duration-200 gap-2 sm:gap-3 ${
          isEmpty ? 'opacity-60' : ''
        } ${
          isBeingDragged 
            ? 'opacity-40 scale-95 shadow-2xl border-2 border-dashed border-blue-400 bg-blue-50' 
            : showDropIndicator
            ? 'bg-blue-50 border-2 border-blue-200'
            : 'hover:bg-gray-100 border-2 border-transparent'
        } ${isBeingDragged ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          touchAction: 'none'
        }}
      >
        {/* Mobile Layout - Stacked */}
        <div className="flex items-start justify-between gap-2">
          {/* Left: Drag Handle + Title */}
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="hidden sm:flex items-center justify-center flex-shrink-0 pt-1">
              <GripVertical className={`w-4 h-4 transition-colors ${isBeingDragged ? 'text-blue-500' : 'text-gray-400'}`} />
            </div>
            
            <div 
              onClick={() => !isEmpty && onSelect(quiz)}
              className={`flex-1 min-w-0 ${
                isEmpty ? 'cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <h3 className={`font-semibold text-sm sm:text-base text-black transition-colors truncate ${
                isEmpty ? 'text-gray-400' : 'hover:text-blue-600'
              }`}>
                {quiz.title}
                {isEmpty && (
                  <span className="ml-2 text-xs text-red-500 font-normal">(Empty)</span>
                )}
              </h3>
              {/* Shared By Indicator */}
              {isShared && (
                <p className="text-xs text-blue-600 font-medium mt-0.5">
                  📤 Shared by {quiz.shared_by_username}
                </p>
              )}
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (!isEmpty) onSelect(quiz);
              }}
              disabled={isEmpty}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                isEmpty 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-green-600 hover:bg-green-100'
              }`}
              title={isEmpty ? "Add questions first" : "Start Quiz"}
            >
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(quiz);
              }}
              className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Edit Quiz"
            >
              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(quiz);
              }}
              className="p-1.5 sm:p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
              title="Delete Quiz"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Metadata Row - Compact on Mobile */}
        <div className="flex flex-wrap gap-2 text-xs sm:text-sm ml-0 sm:ml-6">
          <span className={`whitespace-nowrap ${isEmpty ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
            {quiz.questionCount || 0} Questions
          </span>
          <span className="text-gray-400 hidden sm:inline">•</span>
          <span className="text-gray-500 whitespace-nowrap">{quiz.created}</span>
        </div>
      </div>
    </div>
  );
};

// Quiz List Component
export const QuizList = ({ 
  quizzes, 
  draggedIndex, 
  onDragStart, 
  onDragOver, 
  onDrop, 
  onEditQuiz, 
  onQuizSelect, 
  onDeleteQuiz, 
  onCreateQuiz,
  onImportQuiz
}) => {
  // If no quizzes, show empty state with import option
  if (quizzes.length === 0) {
    return (
      <div className="h-full bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <EmptyQuizState onCreateQuiz={onCreateQuiz} />
        </div>
        {/* Import Quiz Section at bottom */}
        <div className="pt-4 border-t border-gray-200">
          <ShareCodeInput onImportQuiz={onImportQuiz} />
        </div>
      </div>
    );
  }

  // Quiz list with internal scroll
  return (
    <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4 border-b border-gray-100">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 text-center">My Quizzes</h2>
      </div>
      
      {/* Scrollable Quiz List */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 scrollbar-thin scrollbar-thumb-yellow-400 scrollbar-track-yellow-100">
        <div className="space-y-2 sm:space-y-3">
          {quizzes.map((quiz, index) => (
            <QuizItem
              key={quiz.id}
              quiz={quiz}
              index={index}
              draggedIndex={draggedIndex}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onEdit={onEditQuiz}
              onSelect={onQuizSelect}
              onDelete={onDeleteQuiz}
            />
          ))}
        </div>
        {/* Extra padding at bottom */}
        <div className="h-3 sm:h-4"></div>
      </div>
      
      {/* Bottom Section - Create + Import */}
      <div className="flex-shrink-0 p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 border-t border-gray-100 bg-white space-y-3">
        {/* Create Button */}
        <button 
          onClick={onCreateQuiz}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2.5 sm:py-3 px-4 rounded-lg font-semibold text-sm sm:text-base hover:from-yellow-600 hover:to-orange-600 transition-all transform hover:scale-105 shadow-md hover:shadow-lg active:scale-95"
        >
          Create Quiz
        </button>
        
        {/* Import Quiz Input */}
        <ShareCodeInput onImportQuiz={onImportQuiz} />
      </div>
    </div>
  );
};
