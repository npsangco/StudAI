import React, { useState } from 'react';
import { QuestionCard } from '../QuizComponents';
import { ValidationErrorModal } from '../QuizModal';
import { Copy, Check } from 'lucide-react';
import { API_URL } from '../../../config/api.config';

// ============================================
// SHARE TOGGLE COMPONENT
// ============================================

const ShareToggle = ({ quiz, onPublicStatusChange }) => {
  // ✅ Check both camelCase and snake_case, default to false (private)
  const initialIsPublic = quiz.isPublic ?? quiz.is_public ?? false;
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [shareCode, setShareCode] = useState(quiz.share_code || null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ✅ Check if this is a temp quiz (not saved yet)
  const isTempQuiz = quiz.isTemp || quiz.id?.toString().startsWith('temp-');

  // ✅ Update state when quiz prop changes (important for editor refresh)
  React.useEffect(() => {
    const updatedIsPublic = quiz.isPublic ?? quiz.is_public ?? false;
    const updatedShareCode = quiz.share_code || null;
    
    console.log('📋 ShareToggle useEffect:', { updatedIsPublic, updatedShareCode, isTempQuiz });
    
    setIsPublic(updatedIsPublic);
    setShareCode(updatedShareCode);
  }, [quiz.isPublic, quiz.is_public, quiz.share_code, isTempQuiz]);

  const handleToggle = async () => {
    // ✅ Prevent toggle for unsaved quizzes
    if (isTempQuiz) {
      alert('⚠️ Please save the quiz first before changing visibility settings.');
      return;
    }
    
    try {
      setLoading(true);
      const newIsPublic = !isPublic;

      console.log('🔄 Toggling quiz visibility:', { 
        quizId: quiz.id, 
        currentPublic: isPublic, 
        newPublic: newIsPublic,
        currentShareCode: shareCode 
      });

      const response = await fetch(`${API_URL}/api/quizzes/${quiz.id}/toggle-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_public: newIsPublic })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Toggle successful:', data);
        const newShareCode = data.share_code || shareCode; // Keep existing code if not in response
        
        setIsPublic(newIsPublic);
        setShareCode(newShareCode);
        
        console.log('✅ State updated:', { newIsPublic, newShareCode });
        
        // ✅ Notify parent component of the change (pass shareCode too)
        if (onPublicStatusChange) {
          onPublicStatusChange(newIsPublic, newShareCode);
        }
      } else {
        console.error('❌ Toggle failed:', data);
        alert(data.error || 'Failed to update quiz sharing');
      }
    } catch (error) {
      console.error('❌ Toggle error:', error);
      alert('Failed to update quiz sharing');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareCode) return;
    
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {/* Toggle Section */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggle}
          disabled={loading || isTempQuiz}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isPublic ? 'bg-green-500' : 'bg-gray-300'
          } ${loading || isTempQuiz ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={isTempQuiz ? 'Save quiz first to change visibility' : ''}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isPublic ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {isPublic ? '🌍 Public' : '🔒 Private'}
        </span>
        {isTempQuiz && (
          <span className="text-xs text-gray-500 italic">(Save quiz first)</span>
        )}
      </div>

      {/* Share Code Display - Using key to force re-render */}
      {isPublic && shareCode && (
        <div key={shareCode} className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Share Code:</span>
          <div className="flex items-center gap-1 px-2 py-1 bg-white rounded border border-gray-300">
            <code className="text-sm font-mono font-bold text-blue-600">{shareCode}</code>
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={copied ? 'Copied!' : 'Copy code'}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
  let choices = question.choices || [];
  
  // Parse choices if it's a JSON string
  if (typeof choices === 'string') {
    try {
      choices = JSON.parse(choices);
    } catch (e) {
      choices = [];
    }
  }

  if (!choices || !Array.isArray(choices) || choices.length === 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: No choices added`,
      details: 'Multiple choice questions need at least 2 choices'
    });
    return;
  }

  if (choices.length < 2) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Only ${choices.length} choice`,
      details: 'Multiple choice questions need at least 2 choices'
    });
  }

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

  const nonEmptyChoices = choices.filter(c => c && c.trim() !== '');
  const duplicates = findDuplicates(nonEmptyChoices);
  
  if (duplicates.length > 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Duplicate choices found`,
      details: `"${duplicates.join('", "')}" appear multiple times`
    });
  }

  if (!question.correctAnswer || question.correctAnswer.trim() === '') {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: No correct answer selected`,
      details: 'Click on a choice to mark it as the correct answer'
    });
  } else {
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
  if (!question.correctAnswer) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: No answer selected`,
      details: 'Please select either True or False'
    });
    return;
  }

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
  let pairs = question.matchingPairs || [];
  
  // Parse matchingPairs if it's a JSON string
  if (typeof pairs === 'string') {
    try {
      pairs = JSON.parse(pairs);
    } catch (e) {
      pairs = [];
    }
  }

  if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: No matching pairs added`,
      details: 'Add at least 2 matching pairs'
    });
    return;
  }

  if (pairs.length < 2) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Only ${pairs.length} matching pair`,
      details: 'Matching questions need at least 2 pairs'
    });
  }

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
// QUIZ CONTROLS COMPONENT - RESPONSIVE
// ============================================

const QuizControls = ({ quiz, onBack, onAddQuestion, onSave, onUpdateTitle, onUpdatePublicStatus, questions }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(quiz.title);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Get all validation errors
  const getAllErrors = () => {
    const errors = [];
    
    if (!quiz.title || quiz.title.trim() === '') {
      errors.push({
        questionNumber: 0,
        message: 'Quiz title is empty',
        details: 'Please add a title to your quiz'
      });
    }
    
    if (questions.length === 0) {
      errors.push({
        questionNumber: 0,
        message: 'No questions added',
        details: 'Add at least 1 question to save this quiz'
      });
    }
    
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
      <div className="sticky top-0 z-50 bg-white shadow-md">
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="max-w-4xl mx-auto">
            {/* Mobile Layout - Stacked */}
            <div className="flex flex-col gap-3 sm:hidden">
              {/* Title Row */}
              <div className="flex items-center justify-between">
                {isEditing ? (
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={handleTitleKeyDown}
                    autoFocus
                    className="flex-1 text-lg font-bold text-black border-2 border-blue-500 rounded px-2 py-1 focus:outline-none"
                    placeholder="Enter quiz title..."
                  />
                ) : (
                  <h1 
                    onClick={handleTitleClick}
                    className="flex-1 text-lg font-bold text-black cursor-pointer hover:text-blue-600 transition-colors px-2 py-1 hover:bg-gray-100 rounded truncate"
                    title="Click to edit title"
                  >
                    {quiz.title}
                  </h1>
                )}
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  questionCount === 0 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {questionCount} {questionCount === 1 ? 'Question' : 'Questions'}
                </span>
                
                {hasErrors && (
                  <button
                    onClick={() => setShowErrorModal(true)}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded-full font-medium hover:bg-red-600 transition-colors animate-pulse cursor-pointer shadow-lg"
                    title="Click to view all errors"
                  >
                    ⚠️ {errors.length} {errors.length === 1 ? 'Error' : 'Errors'}
                  </button>
                )}
              </div>

              {/* Share Toggle Row */}
              <ShareToggle quiz={quiz} onPublicStatusChange={onUpdatePublicStatus} />

              {/* Actions Row */}
              <div className="flex gap-2">
                <button 
                  onClick={onBack}
                  className="px-3 py-2 text-xs text-gray-600 hover:text-gray-800 font-medium border border-gray-300 rounded-md hover:bg-gray-50 flex-1"
                >
                  Back
                </button>
                <button 
                  onClick={onAddQuestion}
                  disabled={questions.length >= 30}
                  className={`px-3 py-2 text-xs rounded-md font-medium flex-1 ${
                    questions.length >= 30 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Add Question {questions.length >= 30 && '(Max)'}
                </button>
                <button 
                  onClick={handleSaveClick}
                  disabled={hasErrors}
                  className={`px-3 py-2 text-xs rounded-md font-medium transition-all flex-1 ${
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

            {/* Tablet/Desktop Layout */}
            <div className="hidden sm:flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onBlur={handleTitleBlur}
                      onKeyDown={handleTitleKeyDown}
                      autoFocus
                      className="text-lg md:text-xl font-bold text-black border-2 border-blue-500 rounded px-2 py-1 focus:outline-none flex-1 min-w-0"
                      placeholder="Enter quiz title..."
                    />
                  ) : (
                    <h1 
                      onClick={handleTitleClick}
                      className="text-lg md:text-xl font-bold text-black cursor-pointer hover:text-blue-600 transition-colors px-2 py-1 hover:bg-gray-100 rounded truncate"
                      title="Click to edit title"
                    >
                      {quiz.title}
                    </h1>
                  )}
                  
                  <span className={`px-2 md:px-3 py-1 text-xs rounded-full font-medium flex-shrink-0 ${
                    questionCount === 0 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {questionCount} {questionCount === 1 ? 'Question' : 'Questions'}
                  </span>
                  
                  {hasErrors && (
                    <button
                      onClick={() => setShowErrorModal(true)}
                      className="px-2 md:px-3 py-1 bg-red-500 text-white text-xs rounded-full font-medium hover:bg-red-600 transition-colors animate-pulse cursor-pointer shadow-lg flex-shrink-0"
                      title="Click to view all errors"
                    >
                      ⚠️ {errors.length} {errors.length === 1 ? 'Error' : 'Errors'}
                    </button>
                  )}
                </div>
                
                <div className="flex gap-2 md:gap-3 items-center relative flex-shrink-0">
                  {showEmptyWarning && (
                    <div className="absolute right-0 top-full mt-2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-shake whitespace-nowrap z-50">
                      ⚠️ Fix all errors before saving!
                    </div>
                  )}
                  
                  <button 
                    onClick={onBack}
                    className="text-xs md:text-sm text-gray-600 hover:text-gray-800 font-medium px-2"
                  >
                    Back
                  </button>
                  <button 
                    onClick={onAddQuestion}
                    disabled={questions.length >= 30}
                    className={`px-3 md:px-4 py-2 text-xs md:text-sm rounded-md font-medium ${
                      questions.length >= 30 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Add Question {questions.length >= 30 && '(Max 30)'}
                  </button>
                  <button 
                    onClick={handleSaveClick}
                    disabled={hasErrors}
                    className={`px-3 md:px-4 py-2 text-xs md:text-sm rounded-md font-medium transition-all ${
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

              {/* Share Toggle Row - Full width on desktop */}
              <ShareToggle quiz={quiz} onPublicStatusChange={onUpdatePublicStatus} />
            </div>
          </div>
        </div>
      </div>

      {/* Error Modal */}
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
  onUpdatePublicStatus,
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
        onUpdatePublicStatus={onUpdatePublicStatus}
      />
      
      <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6">
        {/* Empty State inside Editor */}
        {questions.length === 0 ? (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 sm:p-8 md:p-12 text-center border-2 border-dashed border-yellow-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl sm:text-4xl">📝</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              No Questions Yet
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Start building your quiz by adding your first question
            </p>
            <button
              onClick={onAddQuestion}
              className="bg-yellow-500 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-all transform hover:scale-105 shadow-md text-sm sm:text-base"
            >
              ✨ Add First Question
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
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
