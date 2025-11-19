import React, { useState } from 'react';
import { QuestionCard } from '../QuizComponents';
import { ValidationErrorModal } from '../QuizModal';
import { Copy, Check, Clock, ChevronDown, ArrowLeft, Globe, Lock, Zap, Timer, Infinity, Target, Circle, AlertCircle, Save, Sparkles, FileText, Info, X } from 'lucide-react';
import { API_URL } from '../../../config/api.config';
import { canUseAdaptiveMode } from '../utils/adaptiveDifficultyEngine';

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
              {isPublic ? (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private</span>
                </>
              )}
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
              {timerOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleTimerChange(option.value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      timerValue === option.value
                        ? 'bg-yellow-500 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-yellow-500 hover:bg-yellow-50'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    {option.label}
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
        className="fixed inset-0 bg-[rgba(107,114,128,0.6)] z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Quiz Modes: How It Works
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Intro */}
            <p className="text-gray-700">
              Your quiz will automatically use the best mode based on your questions:
            </p>

            {/* Adaptive Mode Section */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-700" />
                <h3 className="text-lg font-bold text-purple-900">ADAPTIVE MODE</h3>
              </div>
              
              <p className="text-gray-700">
                Questions automatically adjust difficulty based on student performance
              </p>

              <div className="space-y-2">
                <p className="font-semibold text-gray-900">Requirements to enable:</p>
                <ul className="space-y-1.5 ml-1">
                  <li className="flex items-start gap-2 text-gray-700">
                    <span className="text-green-600 font-bold mt-0.5">✓</span>
                    <span>At least <strong>5 questions</strong></span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <span className="text-green-600 font-bold mt-0.5">✓</span>
                    <span>At least <strong>2 different difficulty levels</strong> (Easy, Medium, or Hard)</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-gray-900">How it works:</p>
                <ul className="space-y-1.5 ml-1">
                  <li className="flex items-start gap-2 text-gray-700">
                    <span className="text-gray-400">•</span>
                    <span>Student answers correctly → Gets harder</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <span className="text-gray-400">•</span>
                    <span>Student struggles → Gets easier</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <span className="text-gray-400">•</span>
                    <span>Keeps students engaged at their level</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Classic Mode Section */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Circle className="w-5 h-5 text-amber-700" />
                <h3 className="text-lg font-bold text-amber-900">CLASSIC MODE</h3>
              </div>
              
              <p className="text-gray-700">
                All students get the same questions in the same order
              </p>

              <div className="space-y-2">
                <p className="font-semibold text-gray-900">Used when:</p>
                <ul className="space-y-1.5 ml-1">
                  <li className="flex items-start gap-2 text-gray-700">
                    <span className="text-gray-400">•</span>
                    <span>Less than 5 questions</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <span className="text-gray-400">•</span>
                    <span>All questions same difficulty</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-gray-900">How it works:</p>
                <ul className="space-y-1.5 ml-1">
                  <li className="flex items-start gap-2 text-gray-700">
                    <span className="text-gray-400">•</span>
                    <span>Fixed question order</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <span className="text-gray-400">•</span>
                    <span>No difficulty adjustment</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <span className="text-gray-400">•</span>
                    <span>Standard quiz experience</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Current Quiz Status */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">Your Current Quiz:</p>
                  {questionCount > 0 ? (
                    <>
                      <p className="text-gray-700">
                        {questionCount} question{questionCount !== 1 ? 's' : ''}
                        {distribution && ` • Easy (${distribution.easy}), Medium (${distribution.medium}), Hard (${distribution.hard})`}
                      </p>
                      <p className="text-gray-900 font-medium">
                        Status: {isAdaptive ? (
                          <span className="text-purple-700">✅ Adaptive Mode Active</span>
                        ) : (
                          <span className="text-amber-700">⚠️ Classic Mode</span>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-700">No questions added yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tip */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-gray-800 flex items-start gap-2">
                <span className="text-xl">💡</span>
                <span>
                  <strong>Tip:</strong> Mix Easy, Medium, and Hard questions to unlock Adaptive Mode for better student engagement!
                </span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors shadow-sm"
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
                  // ✅ Adaptive Mode Enabled
                  return (
                    <button
                      onClick={() => setShowModesInfoModal(true)}
                      className="px-3 py-1.5 text-sm rounded-full font-medium bg-purple-100 text-purple-700 flex items-center gap-1.5 hover:bg-purple-200 transition-colors cursor-pointer"
                      title="Click to learn how quiz modes work"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Adaptive Mode</span>
                      <Info className="w-3.5 h-3.5 opacity-70" />
                    </button>
                  );
                } else if (questionCount > 0) {
                  // ❌ Classic Mode
                  return (
                    <button
                      onClick={() => setShowModesInfoModal(true)}
                      className="px-3 py-1.5 text-sm rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1.5 hover:bg-amber-200 transition-colors cursor-pointer"
                      title="Click to learn how quiz modes work"
                    >
                      <Circle className="w-3.5 h-3.5" />
                      <span>Classic Mode</span>
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
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-10 bg-white shadow-md" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
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
          toast={toast}
        />
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {questions.length === 0 ? (
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-8 md:p-12 text-center border-2 border-dashed border-yellow-300 shadow-sm">
            <div className="w-20 h-20 bg-yellow-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-yellow-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              No Questions Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start building your quiz by adding your first question
            </p>
            <button
              onClick={onAddQuestion}
              className="flex items-center gap-2 bg-yellow-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-all transform hover:scale-105 shadow-md mx-auto"
            >
              <Sparkles className="w-5 h-5" />
              <span>Add First Question</span>
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};
