import React, { useState } from 'react';
import { ArrowLeft, Clock, Target, Trophy, Zap } from 'lucide-react';

const ExitConfirmationModal = ({ isOpen, onClose, onConfirm, mode, currentScore, totalQuestions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fade-in">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              {mode === 'battle' ? 'Forfeit Battle?' : 'Leave Quiz?'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            {mode === 'battle' 
              ? "Are you sure you want to leave? You will forfeit the quiz battle and lose all your progress."
              : "Are you sure you want to leave? All your progress will be lost."}
          </p>
          
          {currentScore > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">Current Score:</span> {currentScore}/{totalQuestions}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 sm:gap-3 p-4 sm:p-6 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm sm:text-base"
          >
            Stay
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm sm:text-base"
          >
            Leave
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

// Quiz Game Header Component
export const QuizGameHeader = ({ 
  quiz, 
  currentQuestion, 
  totalQuestions, 
  timeLeft, 
  displayScore, 
  mode, 
  playersCount = 0,
  onBack 
}) => {
  const [showExitModal, setShowExitModal] = useState(false);

  const handleBackClick = () => {
    setShowExitModal(true);
  };

  const handleConfirmExit = () => {
    setShowExitModal(false);
    onBack();
  };

  // Calculate accuracy percentage
  const accuracy = currentQuestion > 0 ? Math.round((displayScore / currentQuestion) * 100) : 0;
  
  // Timer color based on time left
  const getTimerColor = () => {
    if (timeLeft <= 5) return 'text-red-600';
    if (timeLeft <= 10) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <>
      <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          {/* Mobile Layout (< 640px) */}
          <div className="sm:hidden py-3 space-y-3">
            {/* Row 1: Back button + Quiz title */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackClick}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                title="Leave Quiz"
              >
                <ArrowLeft className="w-5 h-5 text-black" />
              </button>
              <h1 className="text-base font-bold text-black truncate flex-1">
                {quiz.title}
              </h1>
            </div>

            {/* Row 2: Stats Cards */}
            <div className="grid grid-cols-3 gap-2">
              {/* Question Progress - Soft Blue */}
              <div className="bg-blue-50/90 backdrop-blur-sm rounded-lg p-2 text-center border border-blue-200/50">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Target className="w-3 h-3 text-blue-600" />
                </div>
                <div className="text-xs font-bold text-blue-900">
                  {currentQuestion + 1}/{totalQuestions}
                </div>
                <div className="text-[10px] text-blue-700">Question</div>
              </div>
              
              {/* Timer - colors based on time */}
              <div className={`backdrop-blur-sm rounded-lg p-2 text-center border ${
                timeLeft <= 5 ? 'bg-red-50/90 border-red-200/50' :
                timeLeft <= 10 ? 'bg-orange-50/90 border-orange-200/50' :
                'bg-green-50/90 border-green-200/50'
              }`}>
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Clock className={`w-3 h-3 ${getTimerColor()}`} />
                </div>
                <div className={`text-xs font-bold ${getTimerColor()}`}>
                  {timeLeft}s
                </div>
                <div className={`text-[10px] ${
                  timeLeft <= 5 ? 'text-red-700' :
                  timeLeft <= 10 ? 'text-orange-700' :
                  'text-green-700'
                }`}>Time Left</div>
              </div>
              
              {/* Score */}
              <div className="bg-amber-50/90 backdrop-blur-sm rounded-lg p-2 text-center border border-amber-200/50">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Trophy className="w-3 h-3 text-amber-600" />
                </div>
                <div className="text-xs font-bold text-amber-900">
                  {displayScore}/{totalQuestions}
                </div>
                <div className="text-[10px] text-amber-700">Score</div>
              </div>
            </div>

            {/* Accuracy bar (if answered at least 1 question) */}
            {currentQuestion > 0 && (
              <div className="bg-purple-50/90 backdrop-blur-sm rounded-lg p-2 border border-purple-200/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-purple-900 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Accuracy
                  </span>
                  <span className="text-xs font-bold text-purple-900">{accuracy}%</span>
                </div>
                <div className="bg-purple-200/50 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-purple-500 h-full transition-all duration-300"
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tablet & Desktop Layout (≥ 640px) */}
          <div className="hidden sm:block py-4">
            <div className="flex items-center justify-between mb-3">
              {/* Left: Back + Title */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackClick}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Leave Quiz"
                >
                  <ArrowLeft className="w-5 h-5 text-black" />
                </button>
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-black truncate max-w-[300px] md:max-w-none">
                    {quiz.title}
                  </h1>
                  <p className="text-sm text-black/70 flex items-center gap-2">
                    <span>Question {currentQuestion + 1} of {totalQuestions}</span>
                    {mode === 'battle' && (
                      <>
                        <span>•</span>
                        <span>{playersCount} Players</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Right: Stats Cards */}
              <div className="flex items-center gap-3">
                {/* Timer Card */}
                <div className={`backdrop-blur-sm rounded-xl px-4 py-2 shadow-md border ${
                  timeLeft <= 5 ? 'bg-red-50/90 border-red-200/50' :
                  timeLeft <= 10 ? 'bg-orange-50/90 border-orange-200/50' :
                  'bg-green-50/90 border-green-200/50'
                }`}>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-5 h-5 ${getTimerColor()}`} />
                    <div>
                      <div className={`text-sm font-bold ${getTimerColor()}`}>{timeLeft}s</div>
                      <div className={`text-xs ${
                        timeLeft <= 5 ? 'text-red-700' :
                        timeLeft <= 10 ? 'text-orange-700' :
                        'text-green-700'
                      }`}>Time Left</div>
                    </div>
                  </div>
                </div>
                
                {/* Score Card */}
                <div className="bg-amber-50/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md border border-amber-200/50">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-600" />
                    <div>
                      <div className="text-sm font-bold text-amber-900">{displayScore}/{totalQuestions}</div>
                      <div className="text-xs text-amber-700">Score</div>
                    </div>
                  </div>
                </div>

                {/* Accuracy Card (if answered at least 1 question) */}
                {currentQuestion > 0 && (
                  <div className="bg-purple-50/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md border border-purple-200/50">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-purple-600" />
                      <div>
                        <div className="text-sm font-bold text-purple-900">{accuracy}%</div>
                        <div className="text-xs text-purple-700">Accuracy</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="bg-black/10 h-2">
          <div
            className="bg-green-500 h-2 transition-all duration-300 shadow-lg shadow-green-500/50"
            style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      <ExitConfirmationModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={handleConfirmExit}
        mode={mode}
        currentScore={displayScore}
        totalQuestions={totalQuestions}
      />
    </>
  );
};
