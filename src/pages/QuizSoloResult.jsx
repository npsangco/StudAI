import React from 'react';
import { Trophy, Target, Clock, RotateCcw, X } from 'lucide-react';

const QuizSoloResult = ({ isOpen, onClose, onRetry, score, totalQuestions, timeSpent, quizTitle }) => {
  if (!isOpen) return null;

  const percentage = Math.round((score / totalQuestions) * 100);
  
  const getPerformanceMessage = () => {
    if (percentage >= 90) return "Outstanding! 🏆";
    if (percentage >= 80) return "Excellent work! 🌟";
    if (percentage >= 70) return "Good job! 👍";
    if (percentage >= 60) return "Not bad! 📚";
    return "Keep practicing! 💪";
  };

  const getPerformanceColor = () => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 shadow-2xl max-w-md w-full mx-4">
        <div className="text-center">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-black mb-2">Quiz Complete!</h2>
            <p className="text-gray-600">{quizTitle}</p>
          </div>

          {/* Score Display */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className={`text-4xl font-bold mb-2 ${getPerformanceColor()}`}>
              {score}/{totalQuestions}
            </div>
            <div className={`text-2xl font-semibold mb-2 ${getPerformanceColor()}`}>
              {percentage}%
            </div>
            <p className="text-gray-600 font-medium">
              {getPerformanceMessage()}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 text-blue-600 mb-1">
                <Target className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-black">{score}</div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 text-purple-600 mb-1">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-black">{timeSpent || '2:30'}</div>
              <div className="text-sm text-gray-600">Time</div>
            </div>
          </div>

          {/* Reward Message */}
          <div className="bg-yellow-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-yellow-600 mb-2">
              <Trophy className="w-5 h-5" />
            </div>
            <p className="text-sm text-gray-700">
              You earned <span className="font-semibold">{score * 10} Companion Points</span> and <span className="font-semibold">{score * 5} EXP</span>!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Exit
            </button>
            <button 
              onClick={onRetry}
              className="flex-1 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizSoloResult;