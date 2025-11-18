import React, { useState } from 'react';
import { Trophy, RotateCcw, X, Sparkles, Star, FileText, BarChart3 } from 'lucide-react';
import {
  calculateDifficultyBreakdown,
  getDifficultyDisplay,
  getMaxScore
} from '../utils/adaptiveDifficultyManager';
import AnswerReviewModal from './AnswerReviewModal';

const QuizResults = ({ isOpen, onClose, onRetry, results, mode = 'solo' }) => {
  const [showAnswerReview, setShowAnswerReview] = useState(false);

  if (!isOpen) return null;

  const validScore = typeof results?.score === 'number' ? results.score : 0;
  const validTotal = typeof results?.totalQuestions === 'number' ? results.totalQuestions : 1;
  const validTitle = results?.quizTitle || 'Quiz';
  const answers = results?.answers || [];
  const questions = results?.questions || [];

  // Calculate correct answers count (not score)
  const correctCount = answers.filter(a => a?.isCorrect).length;
  const answeredCount = answers.length;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  
  // Calculate max possible score
  const maxScore = mode === 'solo' && questions.length > 0 
    ? getMaxScore(questions) 
    : validTotal;
  
  // Points and EXP earned - ALWAYS use server values (server calculates correctly)
  const pointsEarned = results?.points_earned ?? 0;
  const expEarned = results?.exp_earned ?? 0;
  
  // Calculate difficulty breakdown (SOLO MODE ONLY)
  const difficultyBreakdown = mode === 'solo' && questions.length > 0
    ? calculateDifficultyBreakdown(questions, answers)
    : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-400 rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md mx-auto overflow-hidden border-2 border-white/40">

          {/* Content */}
          <div className="p-5 sm:p-6">

            {/* Header */}
            <div className="text-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-black drop-shadow-sm flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Quiz Completed!
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </h2>
            </div>

            {/* Hero Score Card */}
            <div className="bg-white/30 backdrop-blur-xl rounded-2xl p-4 sm:p-5 mb-4 border-2 border-white/40 shadow-xl">
              <div className="text-center space-y-1">
                {/* Main Score - Large */}
                <div className="text-3xl sm:text-4xl font-bold text-black drop-shadow-sm">
                  {validScore}<span className="text-xl sm:text-2xl text-black/70">/{maxScore}</span>
                </div>
                <div className="text-sm sm:text-base font-semibold text-black">
                  Points
                </div>

                {/* Divider */}
                <div className="py-1">
                  <div className="w-10 h-0.5 bg-yellow-400 mx-auto rounded-full shadow-sm"></div>
                </div>

                {/* Correct Answers & Accuracy */}
                <div className="text-xs sm:text-sm text-black/70 font-medium">
                  {correctCount} out of {validTotal} correct
                </div>
                <div className="text-xl sm:text-2xl font-bold text-black drop-shadow-sm">
                  {accuracy}%
                </div>
              </div>
            </div>

            {/* DIFFICULTY BREAKDOWN - SOLO MODE ONLY */}
            {mode === 'solo' && difficultyBreakdown && (
              <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-3 mb-4 border-2 border-white/40 shadow-lg">
                <h3 className="text-xs font-bold text-black mb-2.5 text-center drop-shadow-sm flex items-center justify-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Performance Breakdown
                </h3>

                {/* Desktop/Tablet: Grid */}
                <div className="hidden sm:grid grid-cols-3 gap-2">
                  {['easy', 'medium', 'hard'].map(diff => {
                    const data = difficultyBreakdown[diff];
                    const display = getDifficultyDisplay(diff);
                    const starCount = diff === 'easy' ? 1 : diff === 'medium' ? 2 : 3;
                    if (data.total === 0) return null;

                    return (
                      <div key={diff} className="bg-white/30 backdrop-blur-md rounded-lg p-2 border-2 border-white/40 hover:border-yellow-400 hover:bg-white/40 transition-all shadow-md">
                        <div className="text-center space-y-0.5">
                          <div className="flex items-center justify-center gap-0.5">
                            {Array.from({ length: starCount }).map((_, idx) => (
                              <Star key={idx} className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            ))}
                          </div>
                          <div className="text-[10px] font-bold text-black/70 uppercase">{display.label}</div>
                          <div className="text-lg font-bold text-black drop-shadow-sm">
                            {data.correct}/{data.total}
                          </div>
                          <div className={`text-[10px] font-semibold ${display.textColor}`}>
                            +{data.points} pts
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile: Stacked Cards */}
                <div className="sm:hidden space-y-1.5">
                  {['easy', 'medium', 'hard'].map(diff => {
                    const data = difficultyBreakdown[diff];
                    const display = getDifficultyDisplay(diff);
                    const starCount = diff === 'easy' ? 1 : diff === 'medium' ? 2 : 3;
                    if (data.total === 0) return null;

                    return (
                      <div key={diff} className="bg-white/30 backdrop-blur-md rounded-lg p-2 border-2 border-white/40 flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: starCount }).map((_, idx) => (
                              <Star key={idx} className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            ))}
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-black/70 uppercase">{display.label}</div>
                            <div className="text-sm font-bold text-black drop-shadow-sm">
                              {data.correct}/{data.total}
                            </div>
                          </div>
                        </div>
                        <div className={`text-[10px] font-semibold ${display.textColor}`}>
                          +{data.points} pts
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Points & EXP Earned */}
            <div className="bg-white/30 backdrop-blur-xl rounded-2xl p-3 mb-4 border-2 border-white/40 shadow-lg">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-orange-600" />
                  <span className="font-bold text-black drop-shadow-sm">+{pointsEarned} Points</span>
                </div>
                <div className="w-px h-4 bg-yellow-400"></div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-blue-600 fill-blue-600" />
                  <span className="font-bold text-black drop-shadow-sm">+{expEarned} EXP</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Review Answers - Primary CTA */}
              {answers.length > 0 && (
                <button
                  onClick={() => setShowAnswerReview(true)}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm border-2 border-white/40"
                >
                  <FileText className="w-4 h-4" />
                  Review Answers
                </button>
              )}

              {/* Desktop/Tablet: Side by side */}
              <div className="hidden sm:grid sm:grid-cols-2 gap-2">
                {mode === 'solo' && (
                  <button
                    onClick={onRetry}
                    className="bg-white/30 backdrop-blur-md hover:bg-white/40 text-black py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 text-xs border-2 border-white/40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="bg-white/30 backdrop-blur-md hover:bg-white/40 text-black py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 text-xs border-2 border-white/40"
                >
                  <X className="w-3.5 h-3.5" />
                  Exit
                </button>
              </div>

              {/* Mobile: Stacked */}
              <div className="sm:hidden space-y-1.5">
                {mode === 'solo' && (
                  <button
                    onClick={onRetry}
                    className="w-full bg-white/30 backdrop-blur-md hover:bg-white/40 text-black py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 text-xs border-2 border-white/40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full bg-white/30 backdrop-blur-md hover:bg-white/40 text-black py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 text-xs border-2 border-white/40"
                >
                  <X className="w-3.5 h-3.5" />
                  Exit
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Answer Review Modal */}
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
