import React, { useState } from 'react';
import { Edit, Play, GripVertical, Trash2 } from 'lucide-react';

// Quiz Controls Component with Editable Title
export const QuizControls = ({ quiz, onBack, onAddQuestion, onSave, onUpdateTitle }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(quiz.title);

  const handleTitleClick = () => {
    setIsEditing(true);
    setTempTitle(quiz.title);
  };

  const handleTitleBlur = () => {
    setIsEditing(false);
    if (tempTitle.trim() && tempTitle !== quiz.title) {
      onUpdateTitle(tempTitle.trim());
    } else if (!tempTitle.trim()) {
      setTempTitle(quiz.title);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTempTitle(quiz.title);
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-white px-6 py-4 shadow-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEditing ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="text-xl font-bold text-black border-2 border-blue-500 rounded px-2 py-1 focus:outline-none"
              placeholder="Enter quiz title..."
            />
          ) : (
            <h1 
              onClick={handleTitleClick}
              className="text-xl font-bold text-black cursor-pointer hover:text-blue-600 transition-colors px-2 py-1 hover:bg-gray-100 rounded"
              title="Click to edit title"
            >
              {quiz.title}
            </h1>
          )}
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full font-medium">
              Public
            </span>
            <span className="px-3 py-1 bg-gray-400 text-white text-xs rounded-full font-medium">
              Private
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onBack}
            className="text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            Back
          </button>
          <button 
            onClick={onAddQuestion}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 font-medium"
          >
            Add a question
          </button>
          <button 
            onClick={onSave}
            className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Quiz Item Component with Drag & Drop
export const QuizItem = ({ quiz, index, draggedIndex, onDragStart, onDragOver, onDrop, onEdit, onSelect, onDelete }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const isBeingDragged = draggedIndex === index;
  const showDropIndicator = isDragOver && !isBeingDragged;

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
    // Only clear isDragOver if we're actually leaving the component
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    setIsDragOver(false);
    onDrop(e, index);
  };

  // Determine drop indicator position based on drag direction
  const showTopIndicator = showDropIndicator && draggedIndex > index;
  const showBottomIndicator = showDropIndicator && draggedIndex < index;

  return (
    <div className="relative">
      {/* Drop zone indicator - top */}
      {showTopIndicator && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 z-10">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full -ml-1"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full -mr-1"></div>
        </div>
      )}
      
      {/* Drop zone indicator - bottom */}
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
        className={`flex flex-col sm:flex-row sm:items-center p-3 bg-gray-50 rounded-lg transition-all duration-200 gap-3 sm:gap-0 ${
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
      
        {/* Drag handle - hidden on mobile */}
        <div className="hidden sm:flex items-center justify-center gap-2 mr-3">
          <GripVertical className={`w-4 h-4 transition-colors ${isBeingDragged ? 'text-blue-500' : 'text-gray-400'}`} />
        </div>
        
        <div 
          onClick={() => onSelect(quiz)}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-6 flex-1 cursor-pointer"
        >
          <h3 className="font-semibold text-black text-left sm:text-left min-w-0 flex-1 hover:text-blue-600 transition-colors">
            {quiz.title}
          </h3>
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-6 text-sm">
            <span className="text-gray-500 whitespace-nowrap">{quiz.questionCount || quiz.questions} Questions</span>
            <span className="text-gray-500 whitespace-nowrap">{quiz.created}</span>
          </div>
        </div>
        
        <div className="flex gap-2 ml-0 sm:ml-3 self-end sm:self-center">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onSelect(quiz);
            }}
            className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600"
            title="Start Quiz"
          >
            <Play className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(quiz);
            }}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Edit Quiz"
          >
            <Edit className="w-4 h-4 text-gray-600" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(quiz);
            }}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
            title="Delete Quiz"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Quiz List Component
export const QuizList = ({ quizzes, draggedIndex, onDragStart, onDragOver, onDrop, onEditQuiz, onQuizSelect, onDeleteQuiz, onCreateQuiz }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm text-center">
    <h2 className="text-2xl font-bold text-black mb-6">Your Quizzes</h2>
    
    <div className="space-y-3 mb-6">
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
    
    <button 
      onClick={onCreateQuiz}
      className="bg-black text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
    >
      Create Quiz
    </button>
  </div>
);

// Quiz Battles Component
export const QuizBattles = ({ gamePin, setGamePin }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm h-fit">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-black mb-3">Join Quiz Battles</h2>
      <p className="text-gray-600 mb-6 text-sm">
        Challenge your friends or join an ongoing quiz battles!
      </p>
      
      <div className="space-y-4">
        <input
          type="text"
          placeholder="GAME PIN"
          value={gamePin}
          onChange={(e) => setGamePin(e.target.value)}
          className="w-full max-w-xs mx-auto block px-4 py-3 bg-gray-100 border-0 rounded-lg text-center placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black text-sm font-medium tracking-wider"
        />
        
        <button className="bg-black text-white py-2 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors">
          Enter
        </button>
      </div>
    </div>
  </div>
);