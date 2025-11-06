import React, { useState } from 'react';
import { QuestionCard } from '../QuizComponents';
import { ValidationErrorModal } from '../QuizModal';

// ============================================
// COMPREHENSIVE VALIDATION SYSTEM
// ============================================

export const validateQuestions = (questions) => {
  const errors = [];

  questions.forEach((question, index) => {
    const questionNumber = index + 1;

    // Check for empty question text
    if (!question.question || question.question.trim() === '') {
      errors.push({
        questionNumber,
        message: `Question ${questionNumber}: Empty question text`,
        details: 'Please enter a question'
      });
    }

    // Validation based on question type
    switch (question.type) {
      case 'Multiple Choice':
        validateMultipleChoice(question, questionNumber, errors);
        break;
      
      case 'Fill in the blanks':
        validateFillInBlanks(question, questionNumber, errors);
        break;
      
      case 'True/False':
        validateTrueFalse(question, questionNumber, errors);
        break;
      
      case 'Matching':
        validateMatching(question, questionNumber, errors);
        break;
    }
  });

  return errors;
};

// Multiple Choice Validation
const validateMultipleChoice = (question, questionNumber, errors) => {
  const choices = question.choices || [];

  // Check if choices exist
  if (!choices || choices.length === 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: No choices added`,
      details: 'Multiple choice questions need at least 2 choices'
    });
    return;
  }

  // Check for minimum number of choices (at least 2)
  if (choices.length < 2) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Only ${choices.length} choice`,
      details: 'Multiple choice questions need at least 2 choices'
    });
  }

  // Check for empty choices
  const emptyChoices = [];
  choices.forEach((choice, idx) => {
    if (!choice || choice.trim() === '') {
      emptyChoices.push(idx + 1);
    }
  });

  if (emptyChoices.length > 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Empty choice(s)`,
      details: `Option ${emptyChoices.join(', ')} ${emptyChoices.length === 1 ? 'is' : 'are'} empty`
    });
  }

  // Check for duplicate choices
  const nonEmptyChoices = choices.filter(c => c && c.trim() !== '');
  const duplicates = findDuplicates(nonEmptyChoices);
  
  if (duplicates.length > 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Duplicate choices found`,
      details: `"${duplicates.join('", "')}" appear multiple times`
    });
  }

  // Check if correct answer is selected
  if (!question.correctAnswer || question.correctAnswer.trim() === '') {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: No correct answer selected`,
      details: 'Click on a choice to mark it as the correct answer'
    });
  } else {
    // Check if correct answer exists in choices
    const correctAnswerExists = choices.some(c => c === question.correctAnswer);
    if (!correctAnswerExists) {
      errors.push({
        questionNumber,
        message: `Question ${questionNumber}: Invalid correct answer`,
        details: 'The selected correct answer no longer exists in choices'
      });
    }
  }
};

// Fill in the Blanks Validation
const validateFillInBlanks = (question, questionNumber, errors) => {
  // Check for missing answer
  if (!question.answer || question.answer.trim() === '') {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: No answer provided`,
      details: 'Please enter the correct answer'
    });
  }
};

// True/False Validation
const validateTrueFalse = (question, questionNumber, errors) => {
  // Check if correct answer is selected
  if (!question.correctAnswer) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: No answer selected`,
      details: 'Please select either True or False'
    });
    return;
  }

  // Check if it's a valid True/False value
  if (question.correctAnswer !== 'True' && question.correctAnswer !== 'False') {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Invalid True/False answer`,
      details: 'Answer must be either "True" or "False"'
    });
  }
};

// Matching Validation
const validateMatching = (question, questionNumber, errors) => {
  const pairs = question.matchingPairs || [];

  // Check if pairs exist
  if (!pairs || pairs.length === 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: No matching pairs added`,
      details: 'Add at least 2 matching pairs'
    });
    return;
  }

  // Check for minimum number of pairs (at least 2)
  if (pairs.length < 2) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Only ${pairs.length} matching pair`,
      details: 'Matching questions need at least 2 pairs'
    });
  }

  // Check for empty items in pairs
  const emptyPairs = [];
  pairs.forEach((pair, idx) => {
    const pairNum = idx + 1;
    const leftEmpty = !pair.left || pair.left.trim() === '';
    const rightEmpty = !pair.right || pair.right.trim() === '';

    if (leftEmpty && rightEmpty) {
      emptyPairs.push(`Pair ${pairNum} (both sides empty)`);
    } else if (leftEmpty) {
      emptyPairs.push(`Pair ${pairNum} (left side empty)`);
    } else if (rightEmpty) {
      emptyPairs.push(`Pair ${pairNum} (right side empty)`);
    }
  });

  if (emptyPairs.length > 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Empty matching items`,
      details: emptyPairs.join('; ')
    });
  }

  // Check for duplicates in left column
  const leftItems = pairs
    .map(p => p.left)
    .filter(item => item && item.trim() !== '');
  
  const leftDuplicates = findDuplicates(leftItems);
  
  if (leftDuplicates.length > 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Duplicate items in left column`,
      details: `"${leftDuplicates.join('", "')}" appear multiple times`
    });
  }

  // Check for duplicates in right column
  const rightItems = pairs
    .map(p => p.right)
    .filter(item => item && item.trim() !== '');
  
  const rightDuplicates = findDuplicates(rightItems);
  
  if (rightDuplicates.length > 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Duplicate items in right column`,
      details: `"${rightDuplicates.join('", "')}" appear multiple times`
    });
  }
};

// Helper function to find duplicates in an array
const findDuplicates = (arr) => {
  const seen = new Map();
  const duplicates = new Set();

  arr.forEach(item => {
    const normalized = item.trim().toLowerCase();
    if (seen.has(normalized)) {
      duplicates.add(item.trim());
    }
    seen.set(normalized, true);
  });

  return Array.from(duplicates);
};

// ============================================
// QUIZ CONTROLS COMPONENT
// ============================================

const QuizControls = ({ quiz, onBack, onAddQuestion, onSave, onUpdateTitle, questions }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(quiz.title);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Get all validation errors
  const getAllErrors = () => {
    const errors = [];
    
    // Check if title is empty
    if (!quiz.title || quiz.title.trim() === '') {
      errors.push({
        questionNumber: 0,
        message: 'Quiz title is empty',
        details: 'Please add a title to your quiz'
      });
    }
    
    // Check if there are no questions
    if (questions.length === 0) {
      errors.push({
        questionNumber: 0,
        message: 'No questions added',
        details: 'Add at least 1 question to save this quiz'
      });
    }
    
    // Validate all questions
    const questionErrors = validateQuestions(questions);
    errors.push(...questionErrors);
    
    return errors;
  };

  const errors = getAllErrors();
  const hasErrors = errors.length > 0;
  const questionCount = questions.length;

  const handleSaveClick = () => {
    if (hasErrors) {
      setShowErrorModal(true);
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
            {/* ERROR BADGE - CLICKABLE */}
            {hasErrors && (
              <button
                onClick={() => setShowErrorModal(true)}
                className="px-3 py-1 bg-red-500 text-white text-xs rounded-full font-medium hover:bg-red-600 transition-colors animate-pulse cursor-pointer shadow-lg"
                title="Click to view all errors"
              >
                ⚠️ {errors.length} {errors.length === 1 ? 'Error' : 'Errors'}
              </button>
            )}
          </div>
          
          <div className="flex gap-3 items-center relative">
            {/* Warning Message */}
            {showEmptyWarning && (
              <div className="absolute right-0 top-full mt-2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-shake whitespace-nowrap z-50">
                ⚠️ Fix all errors before saving!
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
              disabled={questions.length >= 30}
              className={`px-4 py-2 text-sm rounded-md font-medium ${
                questions.length >= 30 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Add a question {questions.length >= 30 && '(Max 30)'}
            </button>
            <button 
              onClick={handleSaveClick}
              disabled={hasErrors}
              className={`px-4 py-2 text-sm rounded-md font-medium transition-all ${
                hasErrors
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
              title={hasErrors ? 'Fix errors before saving' : 'Save quiz'}
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Error Modal - Imported from QuizModal.jsx */}
      <ValidationErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        errors={errors}
      />
      
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

// ============================================
// QUIZ EDITOR COMPONENT
// ============================================

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
        questions={questions}
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