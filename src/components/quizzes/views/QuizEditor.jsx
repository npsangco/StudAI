import React, { useState } from 'react';
import { QuestionCard } from '../QuizComponents';
import { ValidationErrorModal } from '../QuizModal';
import { Copy, Check, ArrowLeft, Globe, Lock, Zap, Infinity, Target, Circle, AlertCircle, Save, Sparkles, Info, X, Database, Loader2 } from 'lucide-react';
import { API_URL } from '../../../config/api.config';
import { canUseAdaptiveMode } from '../utils/adaptiveDifficultyEngine';
import { TEXT_LIMITS } from '../utils/constants';
import { QuestionBankBrowser } from '../QuestionBankBrowser';

// Settings bar for privacy & timer controls
const CompactSettingsBar = ({ quiz, onPublicStatusChange, onTimerChange, toast }) => {
  const initialIsPublic = quiz.isPublic ?? quiz.is_public ?? false;
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [shareCode, setShareCode] = useState(quiz.share_code || null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const initialTimer = quiz.timer_per_question ?? quiz.timerPerQuestion ?? 30;
  const [timerValue, setTimerValue] = useState(initialTimer);

  const isTempQuiz = quiz.isTemp || quiz.id?.toString().startsWith('temp-');

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
      toast.warning('Please save the quiz first before changing visibility settings.');
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

        toast.success(newIsPublic ? 'Quiz is now public' : 'Quiz is now private');
      } else {
        toast.error(data.error || 'Failed to update quiz visibility');
      }
    } catch (error) {
      toast.error('Failed to update quiz sharing');
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
      toast.success('Share code copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy share code');
    }
  };

  const handleTimerChange = (newTimer) => {
    const parsedTimer = parseInt(newTimer);
    const validTimer = isNaN(parsedTimer) || parsedTimer < 0 ? 30 : parsedTimer;
    setTimerValue(validTimer);
    if (onTimerChange) {
      onTimerChange(validTimer);
    }
  };

  const handleTimerInputChange = (e) => {
    const value = e.target.value;
    // Allow empty string while typing
    if (value === '') {
      setTimerValue('');
      return;
    }
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setTimerValue(numValue);
    }
  };

  const handleTimerBlur = () => {
    if (timerValue === '' || timerValue < 0) {
      const defaultTimer = 30;
      setTimerValue(defaultTimer);
      if (onTimerChange) {
        onTimerChange(defaultTimer);
      }
    } else if (onTimerChange) {
      onTimerChange(timerValue);
    }
  };

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">

          {/* Privacy toggle & share code */}
          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto">
            <span className="text-xs md:text-sm font-medium text-gray-700 flex-shrink-0">Privacy:</span>
            <button
              onClick={handleToggle}
              disabled={loading || isTempQuiz}
              className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all flex-shrink-0 ${
                isPublic
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } ${loading || isTempQuiz ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={isTempQuiz ? 'Save quiz first to change visibility' : ''}
            >
              {isPublic ? (
                <>
                  <Globe className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span>Private</span>
                </>
              )}
            </button>

            {isPublic && shareCode && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-300 shadow-sm flex-shrink-0">
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

          {/* Timer per question */}
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-xs md:text-sm font-medium text-gray-700 flex-shrink-0">Timer:</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={timerValue}
                onChange={handleTimerInputChange}
                onBlur={handleTimerBlur}
                placeholder="30"
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
              />
              <span className="text-xs text-gray-600">seconds</span>
              <button
                onClick={() => handleTimerChange(0)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  timerValue === 0
                    ? 'bg-yellow-400 text-gray-900'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-yellow-400 hover:bg-yellow-50'
                }`}
                title="No time limit"
              >
                <Infinity className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Validation system for quiz questions
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
    } else if (question.question.length > TEXT_LIMITS.QUESTION.maximum) {
      errors.push({
        questionNumber,
        message: `Question ${questionNumber}: Text too long`,
        details: `Question text is ${question.question.length} characters (max ${TEXT_LIMITS.QUESTION.maximum})`
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
  const tooLongChoices = [];
  choices.forEach((choice, idx) => {
    if (!choice || choice.trim() === '') {
      emptyChoices.push(idx + 1);
    } else if (choice.length > TEXT_LIMITS.CHOICE.maximum) {
      tooLongChoices.push({ index: idx + 1, length: choice.length });
    }
  });

  if (emptyChoices.length > 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Empty choice(s)`,
      details: `Option ${emptyChoices.join(', ')} ${emptyChoices.length === 1 ? 'is' : 'are'} empty`
    });
  }

  if (tooLongChoices.length > 0) {
    const details = tooLongChoices.map(c =>
      `Option ${c.index}: ${c.length} chars (max ${TEXT_LIMITS.CHOICE.maximum})`
    ).join(', ');
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Choice(s) too long`,
      details
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
    return;
  }
  
  // Check if answer is JSON format (with alternatives)
  let primaryAnswer = question.answer;
  try {
    const parsed = JSON.parse(question.answer);
    if (parsed.primary !== undefined) {
      primaryAnswer = parsed.primary;
    }
  } catch (e) {
    // Not JSON, use the whole answer as primary
  }
  
  // Validate primary answer length only (not the full JSON string)
  if (primaryAnswer.length > TEXT_LIMITS.FILL_ANSWER.maximum) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Answer too long`,
      details: `Answer is ${primaryAnswer.length} characters (max ${TEXT_LIMITS.FILL_ANSWER.maximum})`
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
  const tooLongPairs = [];

  pairs.forEach((pair, idx) => {
    const pairNum = idx + 1;
    const leftEmpty = !pair.left || pair.left.trim() === '';
    const rightEmpty = !pair.right || pair.right.trim() === '';

    // Check for empty pairs
    if (leftEmpty && rightEmpty) {
      emptyPairs.push(`Pair ${pairNum} (both sides empty)`);
    } else if (leftEmpty) {
      emptyPairs.push(`Pair ${pairNum} (left side empty)`);
    } else if (rightEmpty) {
      emptyPairs.push(`Pair ${pairNum} (right side empty)`);
    }

    // Check for too long text
    if (pair.left && pair.left.length > TEXT_LIMITS.MATCHING_ITEM.maximum) {
      tooLongPairs.push(`Pair ${pairNum} left: ${pair.left.length} chars (max ${TEXT_LIMITS.MATCHING_ITEM.maximum})`);
    }
    if (pair.right && pair.right.length > TEXT_LIMITS.MATCHING_ITEM.maximum) {
      tooLongPairs.push(`Pair ${pairNum} right: ${pair.right.length} chars (max ${TEXT_LIMITS.MATCHING_ITEM.maximum})`);
    }
  });

  if (emptyPairs.length > 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Empty matching items`,
      details: emptyPairs.join('; ')
    });
  }

  if (tooLongPairs.length > 0) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Matching item(s) too long`,
      details: tooLongPairs.join('; ')
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

// Modal explaining quiz modes
const QuizModesInfoModal = ({ isOpen, onClose, currentQuiz }) => {
  if (!isOpen) return null;

  const adaptiveCheck = canUseAdaptiveMode(currentQuiz);
  const isAdaptive = adaptiveCheck.enabled;
  const distribution = adaptiveCheck.distribution;
  const questionCount = currentQuiz.length;

  return (
    <>
      <div
        className="fixed inset-0 bg-[rgba(107,114,128,0.6)] z-[999] flex items-center justify-center p-3"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between rounded-t-xl">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-gray-600" />
              Quiz Modes: How It Works
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="p-4 space-y-2">
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center flex-shrink-0">
                  <Database className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-purple-900 text-xs mb-1">Question Bank</h4>
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    Your personal question library! Every question auto-saves here for instant reuse across any quiz. Build a pool of 15+ and each session pulls fresh, randomized questions—no two attempts feel the same!
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center flex-shrink-0">
                  <Circle className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-xs mb-1">Classic Difficulty</h4>
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    Consistent challenge from start to finish. Perfect for competitive Battle Mode or when your questions share the same difficulty level.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-xs mb-1">Adaptive Difficulty</h4>
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    Smart system that reads your performance! Levels up when you ace it, scales down when you struggle. Requires <strong>2+ difficulty levels</strong> to activate.
                  </p>
                </div>
              </div>
            </div>

            {questionCount > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-gray-400 rounded flex items-center justify-center flex-shrink-0">
                    <Info className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-xs mb-1">Your Quiz</h4>
                    <p className="text-[10px] text-gray-600 leading-relaxed">
                      {questionCount} question{questionCount !== 1 ? 's' : ''}
                      {distribution && ` • Easy: ${distribution.easy}, Medium: ${distribution.medium}, Hard: ${distribution.hard}`}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {isAdaptive ? (
                        <span className="text-purple-700 font-medium">✓ Adaptive Enabled</span>
                      ) : (
                        <span className="text-gray-600">Classic Mode</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-2.5 flex justify-end rounded-b-xl">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-yellow-500 text-white text-sm font-semibold rounded-lg hover:bg-yellow-600 transition-colors shadow-sm"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Quiz editor header with title, actions & validation status
const PolishedHeader = ({ quiz, onBack, onAddQuestion, onSave, onUpdateTitle, questions, isDirty, onOpenQuestionBank, isSaving }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(quiz.title);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showModesInfoModal, setShowModesInfoModal] = useState(false);

  const getAllErrors = () => {
    const errors = [];

    if (!quiz.title || quiz.title.trim() === '') {
      errors.push({
        questionNumber: 0,
        message: 'Quiz title is empty',
        details: 'Please add a title to your quiz'
      });
    }

    if (questions.length > 105) {
      errors.push({
        questionNumber: 0,
        message: 'Too many questions',
        details: `You have ${questions.length} questions. Maximum is 105 questions per quiz.`
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
    onSave(); // Allow saving WIP quizzes with errors
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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="hidden md:flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                onClick={onBack}
                disabled={isSaving}
                className={`p-2 rounded-lg transition-colors ${
                  isSaving
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title={isSaving ? 'Please wait while saving...' : 'Back to quizzes'}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {isEditing ? (
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={handleTitleKeyDown}
                    autoFocus
                    maxLength={50}
                    className="text-2xl font-bold text-gray-900 border-2 border-blue-500 rounded-lg px-3 py-1.5 focus:outline-none w-full"
                    placeholder="Enter quiz title..."
                  />
                  <p className="text-xs text-gray-500 mt-1 px-3">{tempTitle.length}/50</p>
                </div>
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

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                {/* Question Count Badge */}
                <span className={`px-3 py-1.5 text-sm rounded-full font-medium ${
                  questionCount === 0
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {questionCount} {questionCount === 1 ? 'Question' : 'Questions'}
                </span>

                {hasErrors && (
                  <button
                    onClick={() => setShowErrorModal(true)}
                    className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-full font-medium hover:bg-red-600 transition-all animate-pulse cursor-pointer shadow-md flex items-center gap-1.5"
                    title="Click to view all errors"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.length} {errors.length === 1 ? 'Error' : 'Errors'}</span>
                  </button>
                )}
              </div>

              <div className="h-8 w-px bg-gray-300"></div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={onOpenQuestionBank}
                  disabled={isSaving}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-all flex items-center gap-2 ${
                    isSaving
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-sm'
                  }`}
                  title={isSaving ? 'Please wait while saving...' : 'Browse and insert questions from your question bank'}
                >
                  <Database className="w-4 h-4" />
                  <span className="hidden lg:inline">Question Bank</span>
                </button>

                <button
                  onClick={onAddQuestion}
                  disabled={isSaving}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                    isSaving
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-sm'
                  }`}
                  title={isSaving ? 'Please wait while saving...' : 'Add a new question'}
                >
                  + Add Question
                </button>

                <button
                  onClick={handleSaveClick}
                  disabled={!isDirty || isSaving}
                  className={`flex items-center gap-2 px-5 py-2 text-sm rounded-lg font-medium transition-all ${
                    !isDirty || isSaving
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-md hover:shadow-lg'
                  }`}
                  title={
                    isSaving ? `Saving ${questionCount} questions... Please wait` :
                    !isDirty ? 'No changes to save' :
                    hasErrors ? 'Save quiz (has validation errors - fix before playing)' :
                    'Save quiz'
                  }
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex md:hidden flex-col gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {isEditing ? (
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={handleTitleKeyDown}
                    autoFocus
                    maxLength={50}
                    className="text-lg font-bold text-gray-900 border-2 border-blue-500 rounded px-2 py-1 focus:outline-none w-full"
                    placeholder="Enter quiz title..."
                  />
                  <p className="text-xs text-gray-500 mt-0.5 px-2">{tempTitle.length}/50</p>
                </div>
              ) : (
                <h1
                  onClick={handleTitleClick}
                  className="text-lg font-bold text-gray-900 cursor-pointer flex-1 truncate"
                >
                  {quiz.title}
                </h1>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                questionCount === 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {questionCount} Q
              </span>

              {(() => {
                const adaptiveCheck = canUseAdaptiveMode(questions);
                
                if (adaptiveCheck.enabled) {
                  return (
                    <button
                      onClick={() => setShowModesInfoModal(true)}
                      className="px-2 py-1 text-xs rounded-full font-medium bg-purple-100 text-purple-700 flex items-center gap-1 active:bg-purple-200"
                      title="Click to learn how quiz modes work"
                    >
                      <Target className="w-3 h-3" />
                      <span>Adaptive</span>
                      <Info className="w-3 h-3 opacity-70" />
                    </button>
                  );
                } else if (questionCount > 0) {
                  return (
                    <button
                      onClick={() => setShowModesInfoModal(true)}
                      className="px-2 py-1 text-xs rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1 active:bg-amber-200"
                      title="Click to learn how quiz modes work"
                    >
                      <Circle className="w-3 h-3" />
                      <span>Classic</span>
                      <Info className="w-3 h-3 opacity-70" />
                    </button>
                  );
                }
                return null;
              })()}

              {hasErrors && (
                <button
                  onClick={() => setShowErrorModal(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs rounded-full font-medium animate-pulse"
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.length}</span>
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onOpenQuestionBank}
                className="px-3 py-2 text-xs rounded-lg font-medium bg-purple-100 text-purple-700 flex items-center justify-center gap-1"
                title="Question Bank"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Bank</span>
              </button>

              <button
                onClick={onAddQuestion}
                className="px-3 py-2 text-xs rounded-lg font-medium flex-1 bg-gray-200 text-gray-700"
              >
                + Add Question
              </button>

              <button
                onClick={handleSaveClick}
                disabled={!isDirty}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg font-medium flex-1 ${
                  !isDirty
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-yellow-500 text-white'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ValidationErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        errors={errors}
      />

      <QuizModesInfoModal
        isOpen={showModesInfoModal}
        onClose={() => setShowModesInfoModal(false)}
        currentQuiz={questions}
      />
    </>
  );
};

// Main quiz editor component
export const QuizEditor = ({
  quiz,
  questions,
  isDirty,
  isSaving,
  onBack,
  onSave,
  onUpdateTitle,
  onUpdatePublicStatus,
  onUpdateTimer,
  onAddQuestion,
  onBatchAddQuestions,
  onDeleteQuestion,
  onDuplicateQuestion,
  onUpdateQuestion,
  onUpdateChoice,
  onAddChoice,
  onAddMatchingPair,
  onUpdateMatchingPair,
  onRemoveMatchingPair,
  onReorderQuestions,
  onReloadQuiz,
  toast
}) => {
  const [draggedQuestionIndex, setDraggedQuestionIndex] = useState(null);
  const [dragOverQuestionIndex, setDragOverQuestionIndex] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [showQuestionBank, setShowQuestionBank] = useState(false);

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

  // Touch event handlers for mobile drag & drop
  const handleTouchStart = (e, index) => {
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setDraggedQuestionIndex(index);
  };

  const handleTouchMove = (e, currentIndex) => {
    if (draggedQuestionIndex === null || touchStartY === null) return;

    e.preventDefault();

    const touch = e.touches[0];
    const currentY = touch.clientY;

    const elements = document.querySelectorAll('[data-question-wrapper]');
    let targetIndex = null;

    elements.forEach((el, idx) => {
      const rect = el.getBoundingClientRect();
      if (currentY >= rect.top && currentY <= rect.bottom) {
        targetIndex = idx;
      }
    });

    if (targetIndex !== null && targetIndex !== draggedQuestionIndex) {
      setDragOverQuestionIndex(targetIndex);
    }
  };

  const handleTouchEnd = (e) => {
    if (draggedQuestionIndex === null || dragOverQuestionIndex === null) {
      setDraggedQuestionIndex(null);
      setDragOverQuestionIndex(null);
      setTouchStartY(null);
      return;
    }

    if (draggedQuestionIndex !== dragOverQuestionIndex) {
      const newQuestions = [...questions];
      const draggedQuestion = newQuestions[draggedQuestionIndex];

      newQuestions.splice(draggedQuestionIndex, 1);
      newQuestions.splice(dragOverQuestionIndex, 0, draggedQuestion);

      if (onReorderQuestions) {
        onReorderQuestions(newQuestions);
      }
    }

    setDraggedQuestionIndex(null);
    setDragOverQuestionIndex(null);
    setTouchStartY(null);
  };

  const handleInsertFromBank = async (selectedQuestions) => {
    if (!quiz || !quiz.id || quiz.isTemp) {
      if (onBatchAddQuestions) {
        onBatchAddQuestions(selectedQuestions);
        toast.success(`Added ${selectedQuestions.length} question${selectedQuestions.length !== 1 ? 's' : ''} from question bank. Save quiz to persist.`);
        setShowQuestionBank(false);
      } else {
        toast.warning('Unable to add questions. Please try again.');
      }
      return;
    }

    try {
      const questionIds = selectedQuestions.map(q => q.question_id);

      const response = await fetch(`${API_URL}/api/question-bank/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          quizId: quiz.id,
          questionIds
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Inserted ${data.inserted} question${data.inserted !== 1 ? 's' : ''} from question bank.`);
        setShowQuestionBank(false);
        
        if (onReloadQuiz) {
          await onReloadQuiz(quiz.id);
        }
      } else {
        toast.error(data.error || 'Failed to insert questions');
      }
    } catch (error) {
      console.error('Error inserting questions:', error);
      toast.error('Failed to insert questions from bank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white shadow-md">
        <PolishedHeader
          quiz={quiz}
          questions={questions}
          isDirty={isDirty}
          isSaving={isSaving}
          onBack={onBack}
          onAddQuestion={onAddQuestion}
          onSave={onSave}
          onUpdateTitle={onUpdateTitle}
          onOpenQuestionBank={() => setShowQuestionBank(true)}
        />
      </div>

      {showQuestionBank && (
        <QuestionBankBrowser
          onSelectQuestions={handleInsertFromBank}
          onClose={() => setShowQuestionBank(false)}
          toast={toast}
        />
      )}

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {questions.length === 0 ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="w-full max-w-3xl">
              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Build Your Quiz
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  Start by adding your first question - mix and match question types for the best learning experience
                </p>
                <button
                  onClick={onAddQuestion}
                  className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-105 shadow-lg mx-auto"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Add First Question</span>
                </button>
              </div>

              {/* Feature Cards - 2x2 Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                {/* Card 1 - Multiple Choice (Yellow) */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200 hover:shadow-lg transition-all">
                  <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center mb-3 shadow-sm">
                    <Circle className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Multiple Choice</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Classic format with 2-6 options. Perfect for testing knowledge with clear alternatives.
                  </p>
                </div>

                {/* Card 2 - Fill in the Blanks (Purple) */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200 hover:shadow-lg transition-all">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mb-3 shadow-sm">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Fill in the Blanks</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Test recall with up to 7 alternative answers and optional case sensitivity.
                  </p>
                </div>

                {/* Card 3 - True/False (Blue) */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 hover:shadow-lg transition-all">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mb-3 shadow-sm">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">True or False</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Simple binary choice - quick to answer and great for fact-checking.
                  </p>
                </div>

                {/* Card 4 - Matching (Green) */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200 hover:shadow-lg transition-all">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mb-3 shadow-sm">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Matching Pairs</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Connect related items - ideal for terms, definitions, and relationships.
                  </p>
                </div>
              </div>

              {/* Quick Tips */}
              <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">Quick Tips</h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Drag the grip handle to reorder questions anytime</li>
                      <li>• Set difficulty levels (Easy/Medium/Hard) for each question</li>
                      <li>• Use the Question Bank to import pre-made questions</li>
                      <li>• Customize timer and privacy settings in the top bar</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <CompactSettingsBar
                quiz={quiz}
                onPublicStatusChange={onUpdatePublicStatus}
                onTimerChange={onUpdateTimer}
                toast={toast}
              />
            </div>

            <div className="space-y-4">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  data-question-wrapper={index}
                  onDragOver={(e) => handleQuestionDragOver(e, index)}
                  onDragLeave={handleQuestionDragLeave}
                  onDrop={(e) => handleQuestionDrop(e, index)}
                  className={`transition-all duration-200 ${
                    draggedQuestionIndex === index ? 'opacity-40 scale-95 z-50' : ''
                  } ${
                    dragOverQuestionIndex === index && draggedQuestionIndex !== index
                      ? 'scale-[1.02] border-2 border-blue-400 rounded-lg shadow-lg'
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
                    onDragStart={(e) => handleQuestionDragStart(e, index)}
                    onDragEnd={handleQuestionDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, index)}
                    onTouchMove={(e) => handleTouchMove(e, index)}
                    onTouchEnd={handleTouchEnd}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
