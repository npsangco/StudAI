import React, { useState } from 'react';
import { Trophy, Clock, RotateCcw, X } from 'lucide-react';
import { getPerformanceMessage, getPerformanceColor } from '../utils/questionHelpers';
import { 
  calculateDifficultyBreakdown, 
  getDifficultyDisplay,
  getOverallDifficultyRating,
  getDifficultyProgressionFeedback 
} from '../utils/adaptiveDifficultyManager';
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
  const pointsEarned = validScore * 10;
  const expEarned = validScore * 5;
  
  // Calculate difficulty breakdown (SOLO MODE ONLY)
  const questions = results?.questions || [];
  const difficultyBreakdown = mode === 'solo' && questions.length > 0
    ? calculateDifficultyBreakdown(questions, answers)
    : null;
  
  const overallRating = difficultyBreakdown ? getOverallDifficultyRating(difficultyBreakdown) : null;
  const progressionFeedback = difficultyBreakdown ? getDifficultyProgressionFeedback(difficultyBreakdown) : null;

  return (
    <>
      <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50 p-3 sm:p-4">
        <div className="bg-white rounded-xl shadow-2xl w-[95%] sm:max-w-md mx-auto">
          <div className="p-4 sm:p-6 md:p-8">
            <div className="text-center">
              {/* Header - Responsive */}
              <div className="mb-4 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-black mb-2">
                  Quiz Complete! 🎉
                </h2>
                <p className="text-sm sm:text-base text-gray-600">{validTitle}</p>
              </div>

              {/* Score Section */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="mb-3">
                  <div className={`text-3xl sm:text-4xl font-bold mb-1 ${getPerformanceColor(percentage)}`}>
                    {validScore}/{validTotal}
                  </div>
                  <div className={`text-xl sm:text-2xl font-semibold ${getPerformanceColor(percentage)}`}>
                    {percentage}%
                  </div>
                </div>
                <p className="text-sm sm:text-base text-gray-600 font-medium">
                  {getPerformanceMessage(percentage)}
                </p>
              </div>

              {/* DIFFICULTY BREAKDOWN (SOLO MODE ONLY) */}
              {mode === 'solo' && difficultyBreakdown && (
                <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="text-center mb-3">
                    <h3 className="text-sm font-bold text-gray-700 mb-1">🎯 Difficulty Breakdown</h3>
                    <p className="text-xs text-gray-600">{overallRating}</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {['easy', 'medium', 'hard'].map(diff => {
                      const data = difficultyBreakdown[diff];
                      const display = getDifficultyDisplay(diff);
                      if (data.total === 0) return null;
                      
                      return (
                        <div key={diff} className={`${display.bgColor} rounded-lg p-2 border ${display.borderColor}`}>
                          <div className="text-center">
                            <div className="text-lg mb-0.5">{display.stars}</div>
                            <div className={`text-xs font-bold ${display.textColor} mb-1`}>{display.label}</div>
                            <div className={`text-sm font-bold ${display.textColor}`}>
                              {data.correct}/{data.total}
                            </div>
                            <div className="text-xs text-gray-600 font-semibold">
                              +{data.points} pts
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {progressionFeedback && (
                    <p className="text-xs text-center text-gray-600 mt-3 font-medium">
                      {progressionFeedback}
                    </p>
                  )}
                </div>
              )}

              {/* Time & Rewards Combined */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-yellow-200">
                <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    <span className="text-sm sm:text-base font-semibold">{validTime}</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm flex-wrap">
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600" />
                    <span className="font-bold text-yellow-700">+{pointsEarned} Points</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-base sm:text-lg">⭐</span>
                    <span className="font-bold text-blue-700">+{expEarned} EXP</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons*/}
              <div className="space-y-2 sm:space-y-3">
                {/* View Answer Summary Button */}
                {answers.length > 0 && (
                  <button
                    onClick={() => setShowAnswerReview(true)}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-md flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <span>📝</span>
                    Review Answers
                  </button>
                )}

                {/* Desktop/Tablet: Side by side buttons */}
                <div className="hidden sm:flex gap-3">
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

                {/* Mobile: Stacked buttons */}
                <div className="flex sm:hidden flex-col gap-2">
                  <button 
                    onClick={onClose}
                    className="w-full bg-gray-600 text-white py-2.5 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <X className="w-4 h-4" />
                    Exit
                  </button>
                  {mode === 'solo' && (
                    <button 
                      onClick={onRetry}
                      className="w-full bg-black text-white py-2.5 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm"
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