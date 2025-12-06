import React from 'react';
import { X, AlertTriangle, Trash2, AlertCircle, User, Users, Zap, Trophy, FileText } from 'lucide-react';

// ============================================
// QUIZ MODE SELECTION MODAL
// ============================================
export const QuizModal = ({ quiz, isOpen, onClose, onSoloQuiz, onQuizBattle }) => {
  const totalQuestions = quiz?.questionCount || 10;
  const minQuestionsInBank = 10; // Minimum total questions required in quiz
  const minSelectableQuestions = 5; // Minimum user can select per session
  const reserveQuestions = 5; // Always keep 5 in reserve for variety
  
  // Calculate max questions user can take while keeping reserve
  const maxSelectableQuestions = totalQuestions > minQuestionsInBank 
    ? Math.min(totalQuestions - reserveQuestions, 100) 
    : Math.min(totalQuestions, 100);
  
  const [questionCount, setQuestionCount] = React.useState(maxSelectableQuestions);
  const [selectedMode, setSelectedMode] = React.useState(null); // 'solo-casual', 'solo-adaptive', or 'battle'
  const [showModeSelection, setShowModeSelection] = React.useState(false);

  // Reset question count and mode when quiz changes
  React.useEffect(() => {
    if (quiz) {
      setQuestionCount(maxSelectableQuestions);
      setSelectedMode(null);
      setShowModeSelection(false);
    }
  }, [quiz?.id, maxSelectableQuestions]);

  if (!isOpen || !quiz) return null;

  const handleQuestionCountChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= minSelectableQuestions && value <= maxSelectableQuestions) {
      setQuestionCount(value);
    }
  };

  const handleSoloClick = () => {
    setShowModeSelection(true);
  };

  const handleModeSelect = (mode) => {
    if (mode === 'casual' || mode === 'adaptive') {
      onSoloQuiz(questionCount, mode);
    }
  };

  const handleBackToMain = () => {
    setShowModeSelection(false);
    setSelectedMode(null);
  };

  const handleQuizBattle = () => {
    onQuizBattle(questionCount);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl sm:rounded-2xl max-w-lg w-full mx-auto relative shadow-2xl animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-1.5 sm:p-2 hover:bg-white/20 hover:backdrop-blur-sm rounded-full transition-colors group"
        >
          <X className="w-5 h-5 text-white/80 group-hover:text-white" />
        </button>

        {/* Header Section - Minified */}
        <div className="relative bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 pt-5 sm:pt-6 pb-6 sm:pb-8 px-4 sm:px-6 text-center overflow-hidden">
          {/* Decorative elements - smaller */}
          <div className="absolute top-0 left-0 w-20 sm:w-24 h-20 sm:h-24 bg-white/10 rounded-full -translate-x-10 sm:-translate-x-12 -translate-y-10 sm:-translate-y-12"></div>
          <div className="absolute bottom-0 right-0 w-24 sm:w-28 h-24 sm:h-28 bg-white/10 rounded-full translate-x-12 sm:translate-x-14 translate-y-12 sm:translate-y-14"></div>

          <div className="relative">
            <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl mb-1.5 sm:mb-2 shadow-lg">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">Ready to Quiz?</h2>
            <p className="text-white/90 text-[10px] sm:text-xs font-medium">Choose your challenge mode</p>
          </div>
        </div>

        {/* Quiz Info - Minified */}
        <div className="px-4 sm:px-6 mt-3 mb-3 space-y-2">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg sm:rounded-xl shadow-lg p-2.5 sm:p-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 backdrop-blur-sm rounded-md flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-[11px] sm:text-xs line-clamp-1" title={quiz.title}>{quiz.title}</h3>
                <p className="text-[9px] sm:text-[10px] text-white/80">{totalQuestions} questions available</p>
              </div>
            </div>
          </div>

          {/* Question Count Selector */}
          {totalQuestions > minQuestionsInBank && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                How many questions do you want?
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={minSelectableQuestions}
                  max={maxSelectableQuestions}
                  value={questionCount}
                  onChange={handleQuestionCountChange}
                  className="w-20 px-2 py-1.5 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                />
                <span className="text-xs text-gray-600">
                  (Max: 100 questions per session)
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1.5">
                We keep at least 5 questions in reserve for variety
              </p>
            </div>
          )}
        </div>

        {/* Mode Selection */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-2.5 sm:space-y-3">
          {/* Solo Mode */}
          {!showModeSelection ? (
            <button
              onClick={handleSoloClick}
              className="group w-full bg-gradient-to-br from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100 border-2 border-yellow-200 hover:border-yellow-400 rounded-lg sm:rounded-xl p-3.5 sm:p-5 transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-gray-900 mb-0.5 sm:mb-1 flex items-center gap-2 flex-wrap text-sm sm:text-base">
                    Solo Quiz
                    <span className="text-[10px] sm:text-xs bg-yellow-200 text-yellow-800 px-1.5 sm:px-2 py-0.5 rounded-full font-semibold">Focus</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-tight sm:leading-relaxed">
                    Challenge yourself at your own pace - perfect for focused practice and mastering concepts
                  </p>
                </div>
              </div>
            </button>
          ) : (
            <>
              {/* Back Button */}
              <button
                onClick={handleBackToMain}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 mb-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to modes
              </button>

              {/* Casual Mode */}
              <button
                onClick={() => handleModeSelect('casual')}
                className="group w-full bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border-2 border-blue-200 hover:border-blue-400 rounded-lg sm:rounded-xl p-3.5 sm:p-4 transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-gray-900 mb-0.5 flex items-center gap-2 text-sm sm:text-base">
                      Casual Mode
                      <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full font-semibold">Shuffled</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-gray-600 leading-snug">
                      Questions shuffled randomly - straightforward practice session
                    </p>
                  </div>
                </div>
              </button>

              {/* Adaptive Mode */}
              <button
                onClick={() => handleModeSelect('adaptive')}
                className="group w-full bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-2 border-purple-200 hover:border-purple-400 rounded-lg sm:rounded-xl p-3.5 sm:p-4 transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-gray-900 mb-0.5 flex items-center gap-2 text-sm sm:text-base">
                      Adaptive Mode
                      <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full font-semibold">Smart</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-gray-600 leading-snug">
                      Difficulty adjusts based on your performance - personalized learning
                    </p>
                  </div>
                </div>
              </button>
            </>
          )}

          {/* Battle Mode */}
          {!showModeSelection && (
            <button
              onClick={handleQuizBattle}
              className="group w-full bg-gradient-to-br from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 border-2 border-orange-200 hover:border-orange-400 rounded-lg sm:rounded-xl p-3.5 sm:p-5 transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-gray-900 mb-0.5 sm:mb-1 flex items-center gap-2 flex-wrap text-sm sm:text-base">
                    Quiz Battle
                    <span className="text-[10px] sm:text-xs bg-orange-200 text-orange-800 px-1.5 sm:px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      Competitive
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-tight sm:leading-relaxed">
                    Compete with up to 5 friends in real-time - race to the top of the leaderboard!
                  </p>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
};

// ============================================
// DELETE CONFIRMATION MODAL
// ============================================
export const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, itemType = "quiz" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Delete {itemType}?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 leading-relaxed mb-4">
            Are you sure you want to delete <span className="font-semibold text-gray-900">"{itemName}"</span>?
          </p>
          
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-medium">
                This action cannot be undone
              </p>
              <p className="text-xs text-red-700 mt-1">
                All questions and data associated with this {itemType} will be permanently deleted.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

// ============================================
// VALIDATION ERROR MODAL
// ============================================
export const ValidationErrorModal = ({ isOpen, onClose, errors }) => {
  if (!isOpen) return null;

  // Group errors by question number
  const groupedErrors = errors.reduce((acc, error) => {
    const qNum = error.questionNumber || 0;
    if (!acc[qNum]) {
      acc[qNum] = [];
    }
    acc[qNum].push(error);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-fade-in max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Cannot Save Quiz
              </h3>
              <p className="text-sm text-gray-600">
                {errors.length} {errors.length === 1 ? 'error' : 'errors'} found
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Error List - REDESIGNED */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <p className="text-gray-600 mb-4 font-medium text-sm sm:text-base">
            Please fix the following issues:
          </p>

          <div className="space-y-3">
            {Object.keys(groupedErrors).sort((a, b) => a - b).map((questionNum) => {
              const questionErrors = groupedErrors[questionNum];
              const isGlobalError = questionNum == 0;

              return (
                <div key={questionNum}>
                  {/* Global Error Header */}
                  {isGlobalError && (
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 sm:p-4 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-bold text-yellow-900 uppercase tracking-wider">
                          Quiz Requirement
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Question Header - Only if questionNum > 0 */}
                  {questionNum > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-gray-200"></div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Question {questionNum}
                      </span>
                      <div className="h-px flex-1 bg-gray-200"></div>
                    </div>
                  )}
                  
                  {/* Error Cards - Clean Design */}
                  <div className="space-y-2">
                    {questionErrors.map((error, idx) => (
                      <div 
                        key={idx} 
                        className="bg-white border-l-4 border-red-500 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              {error.message}
                            </p>
                            {error.details && (
                              <p className="text-xs text-gray-600">
                                {error.details}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
          >
            Fix Errors
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};
