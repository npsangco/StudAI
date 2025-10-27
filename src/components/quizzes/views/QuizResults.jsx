import React from 'react';
import { Trophy, Target, Clock, RotateCcw, X } from 'lucide-react';
import { getPerformanceMessage, getPerformanceColor } from '../utils/questionHelpers';

const QuizResults = ({ isOpen, onClose, onRetry, results, mode = 'solo' }) => {
  if (!isOpen) return null;

  const validScore = typeof results?.score === 'number' ? results.score : 0;
  const validTotal = typeof results?.totalQuestions === 'number' ? results.totalQuestions : 1;
  const validTime = results?.timeSpent || '0:00';
  const validTitle = results?.quizTitle || 'Quiz';

  const percentage = Math.round((validScore / validTotal) * 100);

  return (
    <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 shadow-2xl max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-black mb-2">Quiz Complete!</h2>
            <p className="text-gray-600">{validTitle}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className={`text-4xl font-bold mb-2 ${getPerformanceColor(percentage)}`}>
              {validScore}/{validTotal}
            </div>
            <div className={`text-2xl font-semibold mb-2 ${getPerformanceColor(percentage)}`}>
              {percentage}%
            </div>
            <p className="text-gray-600 font-medium">
              {getPerformanceMessage(percentage)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 text-blue-600 mb-1">
                <Target className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-black">{validScore}</div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 text-purple-600 mb-1">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-black">{validTime}</div>
              <div className="text-sm text-gray-600">Time</div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-yellow-600 mb-2">
              <Trophy className="w-5 h-5" />
            </div>
            <p className="text-sm text-gray-700">
              You earned <span className="font-semibold">{validScore * 10} Companion Points</span> and <span className="font-semibold">{validScore * 5} EXP</span>!
            </p>
          </div>

          {/* Show buttons based on mode */}
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Exit
            </button>
            {/* Only show Retry button in Solo mode */}
            {mode === 'solo' && (
              <button 
                onClick={onRetry}
                className="flex-1 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;