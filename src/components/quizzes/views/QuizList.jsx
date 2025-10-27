import React, { useState } from 'react';
import { Edit, Play, GripVertical, Trash2 } from 'lucide-react';

// Quiz Item Component with Drag & Drop
const QuizItem = ({ quiz, index, draggedIndex, onDragStart, onDragOver, onDrop, onEdit, onSelect, onDelete }) => {
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