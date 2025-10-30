import React, { useState } from 'react';
import { QuestionCard } from '../QuizComponents';

// Quiz Controls Component with Editable Title AND VALIDATION
const QuizControls = ({ quiz, onBack, onAddQuestion, onSave, onUpdateTitle, questionCount }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(quiz.title);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);

  const handleSaveClick = () => {
    if (questionCount === 0) {
      setShowEmptyWarning(true);
      setTimeout(() => setShowEmptyWarning(false), 3000);
      return;
    }
    onSave();
  };

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
    <>
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
            {/* Question Count Badge */}
            <span className={`px-3 py-1 text-xs rounded-full font-medium ${
              questionCount === 0 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {questionCount} {questionCount === 1 ? 'Question' : 'Questions'}
            </span>
          </div>
          
          <div className="flex gap-3 items-center relative">
            {/* Warning Message */}
            {showEmptyWarning && (
              <div className="absolute right-0 top-full mt-2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-shake whitespace-nowrap z-50">
                ⚠️ Add at least 1 question before saving!
              </div>
            )}
            
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
              onClick={handleSaveClick}
              disabled={questionCount === 0}
              className={`px-4 py-2 text-sm rounded-md font-medium transition-all ${
                questionCount === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
              title={questionCount === 0 ? 'Add questions before saving' : 'Save quiz'}
            >
              Save
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </>
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
        questionCount={questions.length}
        onBack={onBack}
        onAddQuestion={onAddQuestion}
        onSave={onSave}
        onUpdateTitle={onUpdateTitle}
      />
      
      <div className="max-w-4xl mx-auto p-6">
        {/* Empty State inside Editor */}
        {questions.length === 0 ? (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-12 text-center border-2 border-dashed border-yellow-300">
            <div className="w-20 h-20 bg-yellow-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📝</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              No Questions Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start building your quiz by adding your first question
            </p>
            <button
              onClick={onAddQuestion}
              className="bg-yellow-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-all transform hover:scale-105 shadow-md"
            >
              ✨ Add First Question
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};