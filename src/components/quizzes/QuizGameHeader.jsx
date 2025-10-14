import React, { useState } from 'react';
import { ArrowLeft, Clock, AlertTriangle, X } from 'lucide-react';

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

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  return (
    <>
      <div className="bg-yellow-400 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackClick}
              className="p-2 hover:bg-yellow-500 hover:bg-opacity-30 rounded-lg transition-colors"
              title="Leave Quiz"
            >
              <ArrowLeft className="w-5 h-5 text-black" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-black">{quiz.title}</h1>
              <p className="text-sm text-gray-700">
                Question {currentQuestion + 1} of {totalQuestions}
                {mode === 'battle' && ` • ${playersCount} Players`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-orange-600">
              <Clock className="w-5 h-5" />
              <span className="font-semibold text-black">{timeLeft}s</span>
            </div>
            <div className="text-sm text-gray-700">
              Score: {displayScore}/{totalQuestions}
            </div>
          </div>
        </div>
        
        <div className="bg-gray-200 h-2">
          <div
            className="bg-green-500 h-2 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Custom Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {mode === 'battle' ? 'Forfeit Quiz Battle?' : 'Leave Quiz?'}
                </h3>
              </div>
              <button
                onClick={handleCancelExit}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-600 leading-relaxed">
                {mode === 'battle' 
                  ? "Are you sure you want to leave? You will forfeit the quiz battle and lose all your progress. Other players will continue without you."
                  : "Are you sure you want to leave? All your progress will be lost and you'll need to start over."}
              </p>
              
              {displayScore > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">Current Score:</span> {displayScore}/{totalQuestions}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 bg-gray-50 rounded-b-2xl">
              <button
                onClick={handleCancelExit}
                className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Stay
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
};