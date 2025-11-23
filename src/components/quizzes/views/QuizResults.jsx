import React, { useState, useEffect } from 'react';
import { Trophy, RotateCcw, X, Sparkles, Star, FileText, BarChart3, Medal, Award } from 'lucide-react';
import {
  calculateDifficultyBreakdown,
  getDifficultyDisplay,
  getMaxScore
} from '../utils/adaptiveDifficultyManager';
import AnswerReviewModal from './AnswerReviewModal';
import { quizApi } from '../../../api/api';

const QuizResults = ({ isOpen, onClose, onRetry, results, mode = 'solo' }) => {
  const [showAnswerReview, setShowAnswerReview] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // Memoize particle positions to prevent flickering
  const [particles] = useState(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      colorType: i % 3
    }))
  );

  // Fetch leaderboard when modal opens (solo mode only)
  useEffect(() => {
    const fetchLeaderboard = async () => {
      console.log('🏆 Leaderboard fetch check:', { isOpen, mode, quizId: results?.quizId });
      
      if (!isOpen || mode !== 'solo' || !results?.quizId) {
        console.log('❌ Leaderboard fetch skipped');
        setLoadingLeaderboard(false);
        return;
      }

      try {
        setLoadingLeaderboard(true);
        console.log('📡 Fetching leaderboard for quiz:', results.quizId);
        const response = await quizApi.getLeaderboard(results.quizId);
        console.log('✅ Leaderboard response:', response);
        setLeaderboard(response.leaderboard || []);
      } catch (error) {
        console.error('❌ Failed to fetch leaderboard:', error);
        setLeaderboard([]);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    fetchLeaderboard();
  }, [isOpen, mode, results?.quizId]);

  if (!isOpen) return null;

  console.log('📋 QuizResults props:', { isOpen, mode, results, quizId: results?.quizId });

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
        background: 'linear-gradient(to bottom, #e0f2fe 0%, #e0e7ff 50%, #f3e8ff 100%)'
      }}>
        {/* Subtle dot pattern */}
        <div className="fixed inset-0 pointer-events-none opacity-20" style={{
          backgroundImage: 'radial-gradient(circle, #818cf8 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {/* Animated particles - More visible */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((particle) => {
            const background = particle.colorType === 0 ? '#fbbf24' : particle.colorType === 1 ? '#f97316' : '#818cf8';
            const boxShadow = particle.colorType === 0
              ? '0 0 12px rgba(251, 191, 36, 0.8)'
              : particle.colorType === 1
              ? '0 0 12px rgba(249, 115, 22, 0.8)'
              : '0 0 12px rgba(129, 140, 248, 0.8)';

            return (
              <div
                key={particle.id}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background,
                  left: `${particle.left}%`,
                  top: `${particle.top}%`,
                  animation: `float-shard ${3 + (particle.id % 4)}s ease-in-out infinite`,
                  animationDelay: `${particle.id * 0.3}s`,
                  opacity: 0.6,
                  boxShadow
                }}
              />
            );
          })}
        </div>

        {/* Radial glows - More pronounced */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-400/25 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl" />
        </div>

        {/* Two-column layout: Results + Leaderboard */}
        <div className="relative w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 items-start">
          
          {/* Results Card */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl backdrop-blur-2xl bg-white/40 border-2 border-white/60 transform translate-y-2 translate-x-2" style={{
              boxShadow: '0 20px 40px rgba(129, 140, 248, 0.15)'
            }} />
            <div className="relative rounded-3xl backdrop-blur-xl bg-white/70 border-2 border-white/80 overflow-hidden" style={{
              boxShadow: '0 25px 50px rgba(251, 191, 36, 0.3), 0 10px 30px rgba(129, 140, 248, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.9)'
            }}>

          {/* Content */}
          <div className="p-5 sm:p-6">

            {/* Header */}
            <div className="text-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Quiz Completed!
                <Sparkles className="w-5 h-5 text-amber-500" />
              </h2>
            </div>

            {/* Hero Score Card */}
            <div className="relative backdrop-blur-xl bg-gradient-to-br from-amber-50/80 to-orange-50/80 rounded-2xl p-4 sm:p-5 mb-4 border-2 border-amber-300/60 shadow-xl overflow-hidden">
              {/* Accent glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-300/30 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

              <div className="text-center space-y-1 relative">
                {/* Main Score - Large */}
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-b from-amber-600 to-orange-600 bg-clip-text text-transparent drop-shadow-sm">
                  {validScore}<span className="text-xl sm:text-2xl text-gray-700">/{maxScore}</span>
                </div>
                <div className="text-sm sm:text-base font-semibold text-amber-800">
                  Points
                </div>

                {/* Divider */}
                <div className="py-1">
                  <div className="w-10 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400 mx-auto rounded-full shadow-md" style={{
                    boxShadow: '0 0 10px rgba(251, 191, 36, 0.6)'
                  }}></div>
                </div>

                {/* Correct Answers & Accuracy */}
                <div className="text-xs sm:text-sm text-gray-700 font-medium">
                  {correctCount} out of {validTotal} correct
                </div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900 drop-shadow-sm">
                  {accuracy}%
                </div>
              </div>
            </div>

            {/* DIFFICULTY BREAKDOWN - SOLO MODE ONLY */}
            {mode === 'solo' && difficultyBreakdown && (
              <div className="backdrop-blur-xl bg-indigo-50/70 rounded-2xl p-3 mb-4 border-2 border-indigo-300/50 shadow-lg">
                <h3 className="text-xs font-bold text-indigo-900 mb-2.5 text-center drop-shadow-sm flex items-center justify-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
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
                      <div key={diff} className="backdrop-blur-md bg-white/50 rounded-lg p-2 border-2 border-indigo-200/60 hover:border-indigo-400/60 hover:bg-white/60 transition-all shadow-md">
                        <div className="text-center space-y-0.5">
                          <div className="flex items-center justify-center gap-0.5">
                            {Array.from({ length: starCount }).map((_, idx) => (
                              <Star key={idx} className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            ))}
                          </div>
                          <div className="text-[10px] font-bold text-gray-700 uppercase">{display.label}</div>
                          <div className="text-lg font-bold text-indigo-900 drop-shadow-sm">
                            {data.correct}/{data.total}
                          </div>
                          <div className="text-[10px] font-semibold text-amber-700">
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
                      <div key={diff} className="bg-white/50 backdrop-blur-md rounded-lg p-2 border-2 border-indigo-200/60 flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: starCount }).map((_, idx) => (
                              <Star key={idx} className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            ))}
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-gray-700 uppercase">{display.label}</div>
                            <div className="text-sm font-bold text-indigo-900 drop-shadow-sm">
                              {data.correct}/{data.total}
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] font-semibold text-amber-700">
                          +{data.points} pts
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Points & EXP Earned */}
            <div className="backdrop-blur-xl bg-gradient-to-r from-purple-50/70 to-pink-50/70 rounded-2xl p-3 mb-4 border-2 border-purple-300/50 shadow-lg">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-purple-900 drop-shadow-sm">+{pointsEarned} Points</span>
                </div>
                <div className="w-px h-4 bg-purple-400/50"></div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-pink-500 fill-pink-500" />
                  <span className="font-bold text-purple-900 drop-shadow-sm">+{expEarned} EXP</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Review Answers - Primary CTA */}
              {answers.length > 0 && (
                <button
                  onClick={() => setShowAnswerReview(true)}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm border-2 border-amber-400/50"
                  style={{ boxShadow: '0 10px 30px rgba(251, 191, 36, 0.4)' }}
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
                    className="backdrop-blur-md bg-indigo-100/60 hover:bg-indigo-200/60 text-indigo-900 py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 text-xs border-2 border-indigo-300/60"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="backdrop-blur-md bg-gray-100/60 hover:bg-gray-200/60 text-gray-900 py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 text-xs border-2 border-gray-300/60"
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
                    className="w-full backdrop-blur-md bg-indigo-100/60 hover:bg-indigo-200/60 text-indigo-900 py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 text-xs border-2 border-indigo-300/60"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full backdrop-blur-md bg-gray-100/60 hover:bg-gray-200/60 text-gray-900 py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 text-xs border-2 border-gray-300/60"
                >
                  <X className="w-3.5 h-3.5" />
                  Exit
                </button>
              </div>
            </div>

          </div>
          </div>
          </div>

          {/* Leaderboard Card (Solo Mode Only) */}
          {mode === 'solo' && (
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl backdrop-blur-2xl bg-white/40 border-2 border-white/60 transform translate-y-2 translate-x-2" style={{
                boxShadow: '0 20px 40px rgba(129, 140, 248, 0.15)'
              }} />
              <div className="relative rounded-3xl backdrop-blur-xl bg-white/70 border-2 border-white/80 overflow-hidden" style={{
                boxShadow: '0 25px 50px rgba(251, 191, 36, 0.3), 0 10px 30px rgba(129, 140, 248, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.9)'
              }}>
                <div className="p-5">
                  {/* Header */}
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm flex items-center justify-center gap-2">
                      <Trophy className="w-5 h-5 text-purple-500" />
                      Leaderboard
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">Top scores across all attempts</p>
                  </div>

                  {/* Leaderboard Content */}
                  {loadingLeaderboard ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Loading...</p>
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-8 backdrop-blur-md bg-pink-50/50 rounded-2xl border-2 border-pink-200/50">
                      <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 font-medium">No attempts yet</p>
                      <p className="text-xs text-gray-500 mt-1">Be the first to complete this quiz!</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {leaderboard.map((entry, index) => (
                        <div
                          key={entry.attempt_id}
                          className={`backdrop-blur-md rounded-xl p-3 border-2 transition-all ${
                            index === 0
                              ? 'bg-gradient-to-r from-amber-100/80 to-yellow-100/80 border-amber-300/60'
                              : index === 1
                              ? 'bg-gradient-to-r from-gray-100/80 to-slate-100/80 border-gray-300/60'
                              : index === 2
                              ? 'bg-gradient-to-r from-orange-100/80 to-amber-100/80 border-orange-300/60'
                              : 'bg-white/60 border-gray-200/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Rank */}
                            <div className="flex-shrink-0">
                              {index === 0 ? (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg">
                                  <Trophy className="w-4 h-4 text-white" />
                                </div>
                              ) : index === 1 ? (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg">
                                  <Medal className="w-4 h-4 text-white" />
                                </div>
                              ) : index === 2 ? (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-amber-400 flex items-center justify-center shadow-lg">
                                  <Award className="w-4 h-4 text-white" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                  {index + 1}
                                </div>
                              )}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">
                                {entry.student?.username || 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-600">
                                {entry.score} pts • {entry.percentage}%
                              </p>
                            </div>

                            {/* Time */}
                            <div className="text-right text-xs text-gray-500">
                              {Math.floor(entry.time_spent / 60)}:{String(entry.time_spent % 60).padStart(2, '0')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
