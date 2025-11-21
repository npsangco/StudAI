import React, { useState } from 'react';
import { QuestionCard } from '../QuizComponents';
import { ValidationErrorModal } from '../QuizModal';
import { Copy, Check, Clock, ArrowLeft, Globe, Lock, Zap, Timer, Infinity, Target, Circle, AlertCircle, Save, Sparkles, FileText, Info, X, Users } from 'lucide-react';
import { API_URL } from '../../../config/api.config';
import { canUseAdaptiveMode } from '../utils/adaptiveDifficultyEngine';
import { TEXT_LIMITS } from '../utils/constants';

// ============================================
// COMPACT SETTINGS BAR COMPONENT
// ============================================

const CompactSettingsBar = ({ quiz, onPublicStatusChange, onTimerChange, toast }) => {
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
    setTimerValue(newTimer);
    if (onTimerChange) {
      onTimerChange(newTimer);
    }
  };

  const timerOptions = [
    { value: 15, label: '15s', icon: Zap },
    { value: 30, label: '30s', icon: Timer },
    { value: 45, label: '45s', icon: Clock },
    { value: 60, label: '60s', icon: Clock },
    { value: 0, label: 'No Limit', icon: Infinity }
  ];

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-3">
        {/* Desktop: Same row | Mobile: Stacked */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">

          {/* Privacy Section */}
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

          {/* Timer Section */}
          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto">
            <span className="text-xs md:text-sm font-medium text-gray-700 flex-shrink-0">Timer:</span>

            {/* Timer Buttons - Horizontal */}
            <div className="flex items-center gap-1.5">
              {timerOptions.map((option) => {
                const IconComponent = option.icon;
                const isSelected = timerValue === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleTimerChange(option.value)}
                    className={`flex items-center gap-1 px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                      isSelected
                        ? 'bg-yellow-400 text-gray-900 shadow-sm'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-yellow-400 hover:bg-yellow-50'
                    }`}
                  >
                    <IconComponent className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span className="whitespace-nowrap">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ============================================
// VALIDATION SYSTEM
// ============================================

export const validateQuestions = (questions) => {
  const errors = [];

  // Question Bank validation: Minimum 15 questions required
  const MIN_QUESTIONS_FOR_BANK = 15;
  if (questions.length < MIN_QUESTIONS_FOR_BANK) {
    errors.push({
      questionNumber: null,
      message: `Question Bank requires minimum ${MIN_QUESTIONS_FOR_BANK} questions`,
      details: `Currently: ${questions.length} question${questions.length !== 1 ? 's' : ''}. Add ${MIN_QUESTIONS_FOR_BANK - questions.length} more question${MIN_QUESTIONS_FOR_BANK - questions.length !== 1 ? 's' : ''} to enable variety and prevent memorization.`,
      isGlobalError: true
    });
  }

  questions.forEach((question, index) => {
    const questionNumber = index + 1;

    // Validate question text
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
  } else if (question.answer.length > TEXT_LIMITS.FILL_ANSWER.maximum) {
    errors.push({
      questionNumber,
      message: `Question ${questionNumber}: Answer too long`,
      details: `Answer is ${question.answer.length} characters (max ${TEXT_LIMITS.FILL_ANSWER.maximum})`
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

// ============================================
// QUIZ MODES INFO MODAL
// ============================================

const QuizModesInfoModal = ({ isOpen, onClose, currentQuiz }) => {
  if (!isOpen) return null;

  // Get current quiz stats
  const adaptiveCheck = canUseAdaptiveMode(currentQuiz);
  const isAdaptive = adaptiveCheck.enabled;
  const distribution = adaptiveCheck.distribution;
  const questionCount = currentQuiz.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[rgba(107,114,128,0.6)] z-[999] flex items-center justify-center p-3"
        onClick={onClose}
      >
        {/* Modal - Minified */}
        <div
          className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Compact */}
          <div className="sticky top-0 bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-center justify-between rounded-t-xl">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-yellow-600" />
              Quiz Modes: How It Works
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-yellow-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Content - Simple & Clean */}
          <div className="p-4 space-y-3">
            {/* How It Works */}
            <div className="space-y-2">
              <p className="text-gray-700 text-xs leading-relaxed">
                Every quiz randomly selects <strong>10 questions</strong> from your question bank to keep things fresh. Need at least <strong>15 questions</strong> to start.
              </p>
            </div>

            {/* Quiz Modes */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Quiz Modes</h3>

              {/* Solo Mode */}
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center flex-shrink-0">
                    <Zap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-xs mb-1">Solo Mode</h4>
                    <p className="text-[10px] text-gray-600 leading-relaxed mb-1.5">
                      Practice at your own pace. Quiz adapts difficulty based on your performance.
                    </p>
                    <p className="text-[10px] text-purple-700">
                      <strong>Adaptive:</strong> Needs 2+ difficulty levels • Adjusts every 2 questions<br/>
                      <strong>Classic:</strong> Fixed difficulty throughout
                    </p>
                  </div>
                </div>
              </div>

              {/* Battle Mode */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
                    <Users className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-xs mb-1">Battle Mode</h4>
                    <p className="text-[10px] text-gray-600 leading-relaxed">
                      Compete with friends. Everyone gets the same 10 questions for fair competition. Always uses Classic difficulty.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Quiz Status */}
            {questionCount > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-[10px] text-gray-600 mb-1">Your Quiz:</p>
                <p className="text-xs font-medium text-gray-900">
                  {questionCount} question{questionCount !== 1 ? 's' : ''}
                  {distribution && ` • E:${distribution.easy} M:${distribution.medium} H:${distribution.hard}`}
                </p>
                <p className="text-[10px] mt-1">
                  {isAdaptive ? (
                    <span className="text-purple-700 font-medium">✓ Adaptive Enabled</span>
                  ) : (
                    <span className="text-gray-600">Classic Mode</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Footer - Compact */}
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

// ============================================
// POLISHED HEADER COMPONENT
// ============================================

const PolishedHeader = ({ quiz, onBack, onAddQuestion, onSave, onUpdateTitle, questions }) => {
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

    if (questions.length === 0) {
      errors.push({
        questionNumber: 0,
        message: 'No questions added',
        details: 'Add at least 1 question to save this quiz'
      });
    }

    if (questions.length > 30) {
      errors.push({
        questionNumber: 0,
        message: 'Too many questions',
        details: `You have ${questions.length} questions. Maximum is 30 questions per quiz.`
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
      <div className="bg-white border-b border-gray-200">
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

              {/* Adaptive Mode Indicator with Info Icon */}
              {(() => {
                // Check adaptive mode eligibility
                const adaptiveCheck = canUseAdaptiveMode(questions);
                
                if (adaptiveCheck.enabled) {
                  // ✅ Adaptive Difficulty Enabled
                  return (
                    <button
                      onClick={() => setShowModesInfoModal(true)}
                      className="px-3 py-1.5 text-sm rounded-full font-medium bg-purple-100 text-purple-700 flex items-center gap-1.5 hover:bg-purple-200 transition-colors cursor-pointer"
                      title="Click to learn how Question Bank and difficulty modes work"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Adaptive Difficulty</span>
                      <span className="sm:hidden">Adaptive</span>
                      <Info className="w-3.5 h-3.5 opacity-70" />
                    </button>
                  );
                } else if (questionCount > 0) {
                  // ❌ Classic Difficulty
                  return (
                    <button
                      onClick={() => setShowModesInfoModal(true)}
                      className="px-3 py-1.5 text-sm rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1.5 hover:bg-amber-200 transition-colors cursor-pointer"
                      title="Click to learn how Question Bank and difficulty modes work"
                    >
                      <Circle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Classic Difficulty</span>
                      <span className="sm:hidden">Classic</span>
                      <Info className="w-3.5 h-3.5 opacity-70" />
                    </button>
                  );
                }
                return null;
              })()}

              {/* Error Badge */}
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

              {/* Add Question Button */}
              <button
                onClick={onAddQuestion}
                className="px-4 py-2 text-sm rounded-lg font-medium transition-all bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-sm"
              >
                + Add Question
              </button>

              {/* Save Button - Yellow Primary */}
              <button
                onClick={handleSaveClick}
                disabled={hasErrors}
                className={`flex items-center gap-2 px-5 py-2 text-sm rounded-lg font-medium transition-all ${
                  hasErrors
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-md hover:shadow-lg'
                }`}
                title={hasErrors ? 'Fix errors before saving' : 'Save quiz'}
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
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

              {/* Adaptive Mode Badge - Mobile with Info Icon */}
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

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onAddQuestion}
                className="px-3 py-2 text-xs rounded-lg font-medium flex-1 bg-gray-200 text-gray-700"
              >
                + Add Question
              </button>

              <button
                onClick={handleSaveClick}
                disabled={hasErrors}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg font-medium flex-1 ${
                  hasErrors
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

      {/* Error Modal */}
      <ValidationErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        errors={errors}
      />

      {/* Quiz Modes Info Modal */}
      <QuizModesInfoModal
        isOpen={showModesInfoModal}
        onClose={() => setShowModesInfoModal(false)}
        currentQuiz={questions}
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
  onReorderQuestions,
  toast
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
      {/* Sticky Header Container - Minimal */}
      <div className="sticky top-0 z-10 bg-white shadow-md" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        <PolishedHeader
          quiz={quiz}
          questions={questions}
          onBack={onBack}
          onAddQuestion={onAddQuestion}
          onSave={onSave}
          onUpdateTitle={onUpdateTitle}
        />
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {questions.length === 0 ? (
          <div className="text-center">

            {/* Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-8">
              {/* Row 1: Question Bank (Full Width) */}
              <div className="md:col-span-2 bg-yellow-50 rounded-xl p-6 text-left border border-yellow-200 shadow-sm">
                <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-2">Question Bank</h4>
                <p className="text-gray-700 text-sm mb-3">
                  Build a pool of 15+ questions - system randomly selects 10 per attempt to prevent memorization and create variety
                </p>
              </div>

              {/* Row 2: Quiz Modes */}
              <div className="bg-blue-50 rounded-xl p-6 text-left border border-blue-200 shadow-sm">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-2">Quiz Modes</h4>
                <p className="text-gray-700 text-sm">
                  <strong>Solo:</strong> Practice alone with random 10 questions each retry<br/>
                  <strong>Battle:</strong> Challenge up to 5 players - all get the same 10 questions
                </p>
              </div>

              {/* Row 2: Difficulty Types */}
              <div className="bg-purple-50 rounded-xl p-6 text-left border border-purple-200 shadow-sm">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-2">Difficulty Types</h4>
                <p className="text-gray-700 text-sm">
                  <strong className="text-purple-700">Adaptive:</strong> Adjusts difficulty based on your performance (2+ difficulty levels)<br/>
                  <strong className="text-amber-700">Classic:</strong> Fixed difficulty throughout
                </p>
              </div>
            </div>

            <button
              onClick={onAddQuestion}
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-105 shadow-md mx-auto"
            >
              <Sparkles className="w-5 h-5" />
              <span>Add First Question</span>
            </button>
          </div>
        ) : (
          <>
            {/* Settings Bar - Only shows when there are questions */}
            <div className="mb-4">
              <CompactSettingsBar
                quiz={quiz}
                onPublicStatusChange={onUpdatePublicStatus}
                onTimerChange={onUpdateTimer}
                toast={toast}
              />
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  data-question-wrapper={index}
                  onDragOver={(e) => handleQuestionDragOver(e, index)}
                  onDragLeave={handleQuestionDragLeave}
                  onDrop={(e) => handleQuestionDrop(e, index)}
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
                    onDragStart={(e) => handleQuestionDragStart(e, index)}
                    onDragEnd={handleQuestionDragEnd}
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
