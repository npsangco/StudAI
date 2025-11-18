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
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%)'
      }}>
        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float-shard ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
                opacity: 0.4,
                boxShadow: '0 0 8px rgba(255, 219, 0, 0.6)'
              }}
            />
          ))}
        </div>

        {/* Radial glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        {/* Frosted glass card */}
        <div className="relative w-full max-w-sm sm:max-w-md mx-auto">
          <div className="absolute inset-0 rounded-3xl backdrop-blur-2xl bg-white/10 border-2 border-white/20 transform translate-y-2 translate-x-2" style={{
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }} />
          <div className="relative rounded-3xl backdrop-blur-xl bg-white/20 border-2 border-white/30 overflow-hidden" style={{
            boxShadow: '0 25px 50px rgba(255, 219, 0, 0.3), 0 10px 20px rgba(0, 0, 0, 0.2)'
          }}>

          {/* Content */}
          <div className="p-5 sm:p-6">

            {/* Header */}
            <div className="text-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white drop-shadow-lg flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Quiz Completed!
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </h2>
            </div>

            {/* Hero Score Card */}
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 sm:p-5 mb-4 border-2 border-white/30 shadow-xl">
              <div className="text-center space-y-1">
                {/* Main Score - Large */}
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-b from-yellow-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">
                  {validScore}<span className="text-xl sm:text-2xl text-gray-300">/{maxScore}</span>
                </div>
                <div className="text-sm sm:text-base font-semibold text-gray-200">
                  Points
                </div>

                {/* Divider */}
                <div className="py-1">
                  <div className="w-10 h-0.5 bg-yellow-400 mx-auto rounded-full shadow-lg" style={{
                    boxShadow: '0 0 10px rgba(255, 219, 0, 0.6)'
                  }}></div>
                </div>

                {/* Correct Answers & Accuracy */}
                <div className="text-xs sm:text-sm text-gray-300 font-medium">
                  {correctCount} out of {validTotal} correct
                </div>
                <div className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                  {accuracy}%
                </div>
              </div>
            </div>

            {/* DIFFICULTY BREAKDOWN - SOLO MODE ONLY */}
            {mode === 'solo' && difficultyBreakdown && (
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-3 mb-4 border-2 border-white/30 shadow-lg">
                <h3 className="text-xs font-bold text-white mb-2.5 text-center drop-shadow-lg flex items-center justify-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-yellow-400" />
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
                      <div key={diff} className="backdrop-blur-md bg-white/5 rounded-lg p-2 border-2 border-white/20 hover:border-yellow-400/50 hover:bg-white/10 transition-all shadow-md">
                        <div className="text-center space-y-0.5">
                          <div className="flex items-center justify-center gap-0.5">
                            {Array.from({ length: starCount }).map((_, idx) => (
                              <Star key={idx} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            ))}
                          </div>
                          <div className="text-[10px] font-bold text-gray-300 uppercase">{display.label}</div>
                          <div className="text-lg font-bold text-white drop-shadow-lg">
                            {data.correct}/{data.total}
                          </div>
                          <div className="text-[10px] font-semibold text-yellow-300">
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
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-3 mb-4 border-2 border-white/30 shadow-lg">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="font-bold text-white drop-shadow-lg">+{pointsEarned} Points</span>
                </div>
                <div className="w-px h-4 bg-yellow-400/50"></div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                  <span className="font-bold text-white drop-shadow-lg">+{expEarned} EXP</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Review Answers - Primary CTA */}
              {answers.length > 0 && (
                <button
                  onClick={() => setShowAnswerReview(true)}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm border-2 border-yellow-300/50"
                  style={{ boxShadow: '0 10px 30px rgba(255, 219, 0, 0.3)' }}
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
                    className="backdrop-blur-md bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 text-xs border-2 border-white/30"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="backdrop-blur-md bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 text-xs border-2 border-white/30"
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
                    className="w-full backdrop-blur-md bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 text-xs border-2 border-white/30"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full backdrop-blur-md bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 text-xs border-2 border-white/30"
                >
                  <X className="w-3.5 h-3.5" />
                  Exit
                </button>
              </div>
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
