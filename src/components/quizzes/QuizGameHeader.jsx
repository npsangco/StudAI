import React, { useState } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { ExitConfirmationModal } from './QuizModal';

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