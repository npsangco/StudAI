import React, { useState } from 'react';
import { QuestionCard } from '../QuizComponents';
import { ValidationErrorModal } from '../QuizModal';
import { Copy, Check, Clock, ChevronDown, ArrowLeft } from 'lucide-react';
import { API_URL } from '../../../config/api.config';
import { validateAdaptiveRequirements } from '../utils/validation';

// ============================================
// COMPACT SETTINGS BAR COMPONENT
// ============================================

const CompactSettingsBar = ({ quiz, onPublicStatusChange, onTimerChange }) => {
  const initialIsPublic = quiz.isPublic ?? quiz.is_public ?? false;
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [shareCode, setShareCode] = useState(quiz.share_code || null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const initialTimer = quiz.timer_per_question ?? quiz.timerPerQuestion ?? 30;
  const [timerValue, setTimerValue] = useState(initialTimer);

  const isTempQuiz = quiz.isTemp || quiz.id?.toString().startsWith('temp-');

  // Update state when quiz prop changes
  React.useEffect(() => {
    const updatedIsPublic = quiz.isPublic ?? quiz.is_public ?? false;
    const updatedShareCode = quiz.share_code || null;
    const updatedTimer = quiz.timer_per_question ?? quiz.timerPerQuestion ?? 30;

    setIsPublic(updatedIsPublic);
    setShareCode(updatedShareCode);
    setTimerValue(updatedTimer);
  }, [quiz.isPublic, quiz.is_public, quiz.share_code, quiz.timer_per_question, quiz.timerPerQuestion]);

  const handleToggle = async () => {
    if (isTempQuiz) {
      alert('⚠️ Please save the quiz first before changing visibility settings.');
      return;
    }

    try {
      setLoading(true);
      const newIsPublic = !isPublic;

      const response = await fetch(`${API_URL}/api/quizzes/${quiz.id}/toggle-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_public: newIsPublic })
      });

      const data = await response.json();

      if (response.ok) {
        const newShareCode = data.share_code || shareCode;
        setIsPublic(newIsPublic);
        setShareCode(newShareCode);

        if (onPublicStatusChange) {
          onPublicStatusChange(newIsPublic, newShareCode);
        }
      } else {
        alert(data.error || 'Failed to update quiz sharing');
      }
    } catch (error) {
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

  const handleTimerChange = (newTimer) => {
    setTimerValue(newTimer);
    if (onTimerChange) {
      onTimerChange(newTimer);
    }
  };

  const timerOptions = [
    { value: 15, label: '15s', emoji: '⚡' },
    { value: 30, label: '30s', emoji: '⏱️' },
    { value: 45, label: '45s', emoji: '🕐' },
    { value: 60, label: '60s', emoji: '⏰' },
    { value: 0, label: 'No Limit', emoji: '∞' }
  ];

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Privacy Section */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Privacy:</span>
            <button
              onClick={handleToggle}
              disabled={loading || isTempQuiz}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isPublic
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } ${loading || isTempQuiz ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={isTempQuiz ? 'Save quiz first to change visibility' : ''}
            >
              {isPublic ? '🌍 Public' : '🔒 Private'}
              <ChevronDown className="w-3 h-3" />
            </button>

            {isPublic && shareCode && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-300 shadow-sm">
                <span className="text-xs text-gray-500">Code:</span>
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
            )}
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-gray-300"></div>

          {/* Timer Section */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Timer:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {timerOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTimerChange(option.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    timerValue === option.value
                      ? 'bg-yellow-500 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-yellow-500 hover:bg-yellow-50'
                  }`}
                >
                  <span className="mr-1">{option.emoji}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// VALIDATION SYSTEM (Same as before)
// ============================================

export const validateQuestions = (questions) => {
  const errors = [];

  questions.forEach((question, index) => {
    const questionNumber = index + 1;

    if (!question.question || question.question.trim() === '') {
      errors.push({
        questionNumber,
        message: `Question ${questionNumber}: Empty question text`,
        details: 'Please enter a question'
      });
    }

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

const validateMultipleChoice = (question, questionNumber, errors) => {
  let choices = question.choices || [];

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

const validateFillInBlanks = (question, questionNumber, errors) => {
  if (!question.answer || question.answer.trim() === '') {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: No answer provided`,
      details: 'Please enter the correct answer'
    });
  }
};

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

const validateMatching = (question, questionNumber, errors) => {
  let pairs = question.matchingPairs || [];

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

  const leftItems = pairs.map(p => p.left).filter(item => item && item.trim() !== '');
  const leftDuplicates = findDuplicates(leftItems);

  if (leftDuplicates.length > 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Duplicate items in left column`,
      details: `"${leftDuplicates.join('", "')}" appear multiple times`
    });
  }

  const rightItems = pairs.map(p => p.right).filter(item => item && item.trim() !== '');
  const rightDuplicates = findDuplicates(rightItems);

  if (rightDuplicates.length > 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Duplicate items in right column`,
      details: `"${rightDuplicates.join('", "')}" appear multiple times`
    });
  }
};

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
// POLISHED HEADER COMPONENT
// ============================================

const PolishedHeader = ({ quiz, onBack, onAddQuestion, onSave, onUpdateTitle, questions }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(quiz.title);
  const [showErrorModal, setShowErrorModal] = useState(false);

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
      <div className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between gap-4">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                onClick={onBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to quizzes"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {isEditing ? (
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  autoFocus
                  className="text-2xl font-bold text-gray-900 border-2 border-blue-500 rounded-lg px-3 py-1.5 focus:outline-none flex-1 min-w-0"
                  placeholder="Enter quiz title..."
                />
              ) : (
                <h1
                  onClick={handleTitleClick}
                  className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors px-3 py-1.5 hover:bg-gray-50 rounded-lg truncate"
                  title="Click to edit title"
                >
                  {quiz.title}
                </h1>
              )}
            </div>

            {/* Right: Badges + Actions */}
            <div className="flex items-center gap-3">
              {/* Question Count Badge */}
              <span className={`px-3 py-1.5 text-sm rounded-full font-medium ${
                questionCount === 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {questionCount} {questionCount === 1 ? 'Question' : 'Questions'}
              </span>

              {/* Adaptive Mode Indicator */}
              {(() => {
                const adaptiveCheck = validateAdaptiveRequirements(questions);
                if (adaptiveCheck.canUseAdaptive) {
                  return (
                    <span
                      className="px-3 py-1.5 text-sm rounded-full font-medium bg-purple-100 text-purple-700 flex items-center gap-1.5"
                      title="Adaptive difficulty enabled for solo mode"
                    >
                      🎯 Adaptive Mode
                    </span>
                  );
                } else if (questionCount > 0 && questionCount < 5) {
                  return (
                    <span
                      className="px-3 py-1.5 text-sm rounded-full font-medium bg-gray-100 text-gray-600 flex items-center gap-1.5"
                      title={adaptiveCheck.warning}
                    >
                      ⚪ Classic Mode
                    </span>
                  );
                }
                return null;
              })()}

              {/* Error Badge */}
              {hasErrors && (
                <button
                  onClick={() => setShowErrorModal(true)}
                  className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-full font-medium hover:bg-red-600 transition-all animate-pulse cursor-pointer shadow-md"
                  title="Click to view all errors"
                >
                  ⚠️ {errors.length} {errors.length === 1 ? 'Error' : 'Errors'}
                </button>
              )}

              {/* Add Question Button */}
              <button
                onClick={onAddQuestion}
                disabled={questions.length >= 30}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                  questions.length >= 30
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-sm'
                }`}
              >
                + Add Question {questions.length >= 30 && '(Max 30)'}
              </button>

              {/* Save Button - Yellow Primary */}
              <button
                onClick={handleSaveClick}
                disabled={hasErrors}
                className={`px-5 py-2 text-sm rounded-lg font-medium transition-all ${
                  hasErrors
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-md hover:shadow-lg'
                }`}
                title={hasErrors ? 'Fix errors before saving' : 'Save quiz'}
              >
                💾 Save
              </button>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="flex md:hidden flex-col gap-3">
            {/* Title Row */}
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {isEditing ? (
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  autoFocus
                  className="text-lg font-bold text-gray-900 border-2 border-blue-500 rounded px-2 py-1 focus:outline-none flex-1"
                  placeholder="Enter quiz title..."
                />
              ) : (
                <h1
                  onClick={handleTitleClick}
                  className="text-lg font-bold text-gray-900 cursor-pointer flex-1 truncate"
                >
                  {quiz.title}
                </h1>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                questionCount === 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {questionCount} Q
              </span>

              {hasErrors && (
                <button
                  onClick={() => setShowErrorModal(true)}
                  className="px-2 py-1 bg-red-500 text-white text-xs rounded-full font-medium animate-pulse"
                >
                  ⚠️ {errors.length}
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onAddQuestion}
                disabled={questions.length >= 30}
                className={`px-3 py-2 text-xs rounded-lg font-medium flex-1 ${
                  questions.length >= 30
                    ? 'bg-gray-200 text-gray-400'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                + Add Q
              </button>

              <button
                onClick={handleSaveClick}
                disabled={hasErrors}
                className={`px-3 py-2 text-xs rounded-lg font-medium flex-1 ${
                  hasErrors
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-yellow-500 text-white'
                }`}
              >
                💾 Save
              </button>
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
  onUpdateTimer,
  onAddQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onUpdateQuestion,
  onUpdateChoice,
  onAddChoice,
  onAddMatchingPair,
  onUpdateMatchingPair,
  onRemoveMatchingPair,
  onReorderQuestions
}) => {
  const [draggedQuestionIndex, setDraggedQuestionIndex] = useState(null);
  const [dragOverQuestionIndex, setDragOverQuestionIndex] = useState(null);

  const handleQuestionDragStart = (e, index) => {
    setDraggedQuestionIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleQuestionDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedQuestionIndex !== index) {
      setDragOverQuestionIndex(index);
    }
  };

  const handleQuestionDragLeave = () => {
    setDragOverQuestionIndex(null);
  };

  const handleQuestionDrop = (e, dropIndex) => {
    e.preventDefault();

    if (draggedQuestionIndex === null || draggedQuestionIndex === dropIndex) {
      setDraggedQuestionIndex(null);
      setDragOverQuestionIndex(null);
      return;
    }

    const newQuestions = [...questions];
    const draggedQuestion = newQuestions[draggedQuestionIndex];

    newQuestions.splice(draggedQuestionIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedQuestion);

    if (onReorderQuestions) {
      onReorderQuestions(newQuestions);
    }

    setDraggedQuestionIndex(null);
    setDragOverQuestionIndex(null);
  };

  const handleQuestionDragEnd = () => {
    setDraggedQuestionIndex(null);
    setDragOverQuestionIndex(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PolishedHeader
        quiz={quiz}
        questions={questions}
        onBack={onBack}
        onAddQuestion={onAddQuestion}
        onSave={onSave}
        onUpdateTitle={onUpdateTitle}
      />

      <CompactSettingsBar
        quiz={quiz}
        onPublicStatusChange={onUpdatePublicStatus}
        onTimerChange={onUpdateTimer}
      />

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {questions.length === 0 ? (
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-8 md:p-12 text-center border-2 border-dashed border-yellow-300 shadow-sm">
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
              <div
                key={question.id}
                draggable
                onDragStart={(e) => handleQuestionDragStart(e, index)}
                onDragOver={(e) => handleQuestionDragOver(e, index)}
                onDragLeave={handleQuestionDragLeave}
                onDrop={(e) => handleQuestionDrop(e, index)}
                onDragEnd={handleQuestionDragEnd}
                className={`transition-all ${
                  draggedQuestionIndex === index ? 'opacity-50 scale-95' : ''
                } ${
                  dragOverQuestionIndex === index && draggedQuestionIndex !== index
                    ? 'scale-[1.02] border-2 border-blue-400 rounded-lg'
                    : ''
                }`}
              >
                <QuestionCard
                  question={question}
                  index={index}
                  onUpdateQuestion={onUpdateQuestion}
                  onUpdateChoice={onUpdateChoice}
                  onAddChoice={onAddChoice}
                  onDeleteQuestion={onDeleteQuestion}
                  onDuplicateQuestion={onDuplicateQuestion}
                  onAddMatchingPair={onAddMatchingPair}
                  onUpdateMatchingPair={onUpdateMatchingPair}
                  onRemoveMatchingPair={onRemoveMatchingPair}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
