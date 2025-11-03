import React, { useState } from 'react';
import { Trophy, Target, Clock, RotateCcw, X } from 'lucide-react';
import { getPerformanceMessage, getPerformanceColor } from '../utils/questionHelpers';
import AnswerReviewModal from './AnswerReviewModal';

const QuizResults = ({ isOpen, onClose, onRetry, results, mode = 'solo' }) => {
  const [showAnswerReview, setShowAnswerReview] = useState(false);

  if (!isOpen) return null;

  const validScore = typeof results?.score === 'number' ? results.score : 0;
  const validTotal = typeof results?.totalQuestions === 'number' ? results.totalQuestions : 1;
  const validTime = results?.timeSpent || '0:00';
  const validTitle = results?.quizTitle || 'Quiz';
  const answers = results?.answers || [];

  const percentage = Math.round((validScore / validTotal) * 100);

  return (
    <>
      <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
          <div className="p-8">
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

              {/* View Answer Summary Button */}
              {answers.length > 0 && (
                <button
                  onClick={() => setShowAnswerReview(true)}
                  className="w-full mb-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-md"
                >
                  Review Answers
                </button>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Exit
                </button>
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
      </div>

      {/* Separate Answer Review Modal */}
      <AnswerReviewModal
        isOpen={showAnswerReview}
        onClose={() => setShowAnswerReview(false)}
        answers={answers}
        quizTitle={validTitle}
      />
    </>
  );
};

export default QuizResults;