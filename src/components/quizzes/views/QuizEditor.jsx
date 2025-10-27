import React, { useState } from 'react';
import { QuestionCard } from '../QuizComponents';
import { createNewQuestion } from '../utils/questionHelpers';

// Quiz Controls Component with Editable Title
const QuizControls = ({ quiz, onBack, onAddQuestion, onSave, onUpdateTitle }) => {
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

export const QuizEditor = ({ 
  quiz, 
  questions, 
  onBack, 
  onSave, 
  onUpdateTitle,
  onAddQuestion,
  onDeleteQuestion,
  onUpdateQuestion,
  onUpdateChoice,
  onAddChoice,
  onAddMatchingPair,
  onUpdateMatchingPair,
  onRemoveMatchingPair
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <QuizControls 
        quiz={quiz}
        onBack={onBack}
        onAddQuestion={onAddQuestion}
        onSave={onSave}
        onUpdateTitle={onUpdateTitle}
      />
      
      <div className="max-w-4xl mx-auto p-6">
        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              onUpdateQuestion={onUpdateQuestion}
              onUpdateChoice={onUpdateChoice}
              onAddChoice={onAddChoice}
              onDeleteQuestion={onDeleteQuestion}
              onAddMatchingPair={onAddMatchingPair}
              onUpdateMatchingPair={onUpdateMatchingPair}
              onRemoveMatchingPair={onRemoveMatchingPair}
            />
          ))}
        </div>
      </div>
    </div>
  );
};