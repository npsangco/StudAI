import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Clock, Target, Trophy, Zap, Star } from 'lucide-react';
import { getPointsForDifficulty } from './utils/adaptiveDifficultyManager';
import './QuizGameHeader.css';

const ExitConfirmationModal = ({ isOpen, onClose, onConfirm, mode, currentScore, maxPossibleScore }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-scaleIn">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
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
            className="p-2 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0"
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
            <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-2xl">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">Current Score:</span> {currentScore}/{maxPossibleScore}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 sm:gap-3 p-4 sm:p-6 bg-gray-50 rounded-b-3xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 sm:px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm text-sm sm:text-base"
          >
            Stay
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 sm:px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg text-sm sm:text-base"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple Timer Component
const SimpleTimer = ({ timeLeft, timeLimit }) => {
  // Don't render timer if timeLimit is 0 (No Limit mode)
  if (timeLimit === 0) return null;

  const getTimerColor = () => {
    if (timeLeft <= 5) return 'text-red-700';
    if (timeLeft <= 10) return 'text-orange-700';
    return 'text-green-700';
  };

  return (
    <div className={`stat-card ${timeLeft <= 5 ? 'animate-pulse-timer' : ''}`}>
      <div className="flex items-center gap-2">
        <Clock className={`w-5 h-5 sm:w-6 sm:h-6 ${getTimerColor()}`} />
        <div>
          <div className={`text-sm sm:text-base font-bold ${getTimerColor()}`}>{timeLeft}s</div>
          <div className="text-xs text-black/70">Time Left</div>
        </div>
      </div>
    </div>
  );
};

// Simple Stat Card
const StatCard = ({ icon: Icon, value, label, iconColor = 'text-black' }) => {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
        <div>
          <div className="text-sm sm:text-base font-bold text-black">{value}</div>
          <div className="text-xs text-black/70">{label}</div>
        </div>
      </div>
    </div>
  );
};

// Animated Difficulty Card with Slot Animation
const DifficultySlotCard = ({ difficulty, points, currentQuestion }) => {
  const [revealStep, setRevealStep] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  
  const starCount = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  
  const displays = {
    easy: { label: 'EASY', points: 1 },
    medium: { label: 'MEDIUM', points: 3 },
    hard: { label: 'HARD', points: 5 }
  };
  
  const difficultyInfo = displays[difficulty] || displays.medium;
  
  // Animate on question change
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
    setRevealStep(0);
    
    const timer1 = setTimeout(() => setRevealStep(1), 100);
    const timer2 = setTimeout(() => setRevealStep(2), 250);
    const timer3 = setTimeout(() => setRevealStep(3), 400);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [currentQuestion, difficulty]);
  
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2">
        {/* Animated Stars */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: starCount }).map((_, idx) => (
            <Star
              key={`${animationKey}-${idx}`}
              className={`w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 fill-yellow-500 transition-all duration-300 transform ${
                revealStep > idx ? 'scale-100 opacity-100 star-pop' : 'scale-0 opacity-0'
              }`}
              style={{
                transitionDelay: `${idx * 150}ms`
              }}
            />
          ))}
        </div>
        
        {/* Label */}
        <div>
          <div className="text-sm sm:text-base font-bold text-black">{difficultyInfo.label}</div>
          <div className="text-xs text-black/70">Worth {difficultyInfo.points} Points</div>
        </div>
      </div>
    </div>
  );
};

// Quiz Game Header Component
export const QuizGameHeader = ({
  quiz,
  currentQuestion,
  totalQuestions,
  timeLeft,
  timeLimit = 30, // Original time limit (0 = no limit)
  displayScore,
  mode,
  playersCount = 0,
  onBack,
  currentQuestionData,
  correctAnswersCount = 0, // New prop to track correct answers
  maxPossibleScore = totalQuestions, // New prop for max score calculation
  adaptiveMode = false // Adaptive difficulty enabled
}) => {
  const [showExitModal, setShowExitModal] = useState(false);

  const handleBackClick = () => {
    setShowExitModal(true);
  };

  const handleConfirmExit = () => {
    setShowExitModal(false);
    onBack();
  };

  // Accuracy is based on correct answers out of completed questions
  // currentQuestion = current question INDEX (0-based)
  // On Q1 (index 0): no questions completed yet, show 0%
  // On Q2 (index 1): 1 question completed, calculate correctAnswersCount / 1
  // Memoize to prevent flickering when props update
  const accuracy = useMemo(() => {
    const questionsCompleted = currentQuestion; // Questions BEFORE current one
    return questionsCompleted > 0
      ? Math.min(100, Math.round((correctAnswersCount / questionsCompleted) * 100))
      : 0;
  }, [currentQuestion, correctAnswersCount]);
  
  const progress = useMemo(() => 
    ((currentQuestion + 1) / totalQuestions) * 100,
    [currentQuestion, totalQuestions]
  );

  const difficulty = currentQuestionData?.difficulty || 'medium';
  const points = getPointsForDifficulty(difficulty);

  return (
    <>
      <div className="header-static-yellow sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          {/* Mobile Layout */}
          <div className="sm:hidden py-3 space-y-3">
            {/* Back + Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackClick}
                className="p-2.5 rounded-xl bg-white/30 backdrop-blur-md hover:bg-white/40 border border-white/40 transition-all shadow-lg"
                title="Leave Quiz"
              >
                <ArrowLeft className="w-5 h-5 text-black" />
              </button>
              <h1 className="text-base font-bold text-black truncate flex-1 drop-shadow-sm">
                {quiz.title}
              </h1>
            </div>

            {/* Stats Row - 4-5 cards, Timer at end (if enabled) */}
            <div className={`grid ${timeLimit === 0 ? (mode === 'battle' ? 'grid-cols-3' : 'grid-cols-4') : (mode === 'battle' ? 'grid-cols-4' : 'grid-cols-5')} gap-1.5`}>
              {/* Question */}
              <div className="stat-card">
                <div className="flex flex-col items-center gap-0.5">
                  <Target className="w-4 h-4 text-black" />
                  <div className="text-xs font-bold text-black">{currentQuestion + 1}/{totalQuestions}</div>
                  <div className="text-[9px] text-black/70">Question</div>
                </div>
              </div>

              {/* Difficulty - SOLO MODE ONLY */}
              {mode === 'solo' && (
                <div className="stat-card">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3 }).map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      ))}
                    </div>
                    <div className="text-xs font-bold text-black">+{points}</div>
                    <div className="text-[9px] text-black/70">{difficulty.toUpperCase()}</div>
                  </div>
                </div>
              )}

              {/* Score */}
              <div className="stat-card">
                <div className="flex flex-col items-center gap-0.5">
                  <Trophy className="w-4 h-4 text-orange-600" />
                  <div className="text-xs font-bold text-black">{displayScore}/{maxPossibleScore}</div>
                  <div className="text-[9px] text-black/70">Score</div>
                </div>
              </div>

              {/* Accuracy */}
              <div className="stat-card">
                <div className="flex flex-col items-center gap-0.5">
                  <Zap className="w-4 h-4 text-orange-600" />
                  <div className="text-xs font-bold text-black">{accuracy}%</div>
                  <div className="text-[9px] text-black/70">Accuracy</div>
                </div>
              </div>

              {/* Timer - Only show if timeLimit is not 0 */}
              {timeLimit !== 0 && (
                <div className="stat-card">
                  <div className="flex flex-col items-center gap-0.5">
                    <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'text-red-700' : timeLeft <= 10 ? 'text-orange-700' : 'text-green-700'}`} />
                    <div className={`text-xs font-bold ${timeLeft <= 5 ? 'text-red-700' : timeLeft <= 10 ? 'text-orange-700' : 'text-green-700'}`}>{timeLeft}s</div>
                    <div className="text-[9px] text-black/70">Time</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:block py-4">
            <div className="flex items-center justify-between">
              {/* Left: Back + Title */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackClick}
                  className="p-3 rounded-xl bg-white/30 backdrop-blur-md hover:bg-white/40 border border-white/40 transition-all shadow-lg"
                  title="Leave Quiz"
                >
                  <ArrowLeft className="w-6 h-6 text-black" />
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-black truncate max-w-[300px] md:max-w-none drop-shadow-sm">
                    {quiz.title}
                  </h1>
                  <p className="text-sm text-black/70 flex items-center gap-2 drop-shadow-sm">
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

              {/* Right: Stats - Timer */}
              <div className="flex items-center gap-3">
                {/* Difficulty with Slot Animation - SOLO MODE ONLY */}
                {mode === 'solo' && (
                  <DifficultySlotCard 
                    difficulty={difficulty} 
                    points={points}
                    currentQuestion={currentQuestion}
                  />
                )}

                {/* Score */}
                <StatCard
                  icon={Trophy}
                  value={`${displayScore}/${maxPossibleScore}`}
                  label="Score"
                  iconColor="text-orange-600"
                />

                {/* Accuracy */}
                <StatCard
                  icon={Zap}
                  value={`${accuracy}%`}
                  label="Accuracy"
                  iconColor="text-orange-600"
                />

                {/* Timer - Only show if timeLimit is not 0 */}
                <SimpleTimer timeLeft={timeLeft} timeLimit={timeLimit} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="relative bg-gradient-to-b from-amber-900/30 to-amber-800/20 h-3 overflow-hidden rounded-full">
          {/* Inner shadow for depth */}
          <div className="absolute inset-0 shadow-inner" />

          {/* Main progress fill */}
          <div
            className="absolute inset-y-0 left-0 transition-all duration-500 ease-out rounded-full overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            {/* Gradient base - indigo from branding */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700" />

            {/* Top glass highlight */}
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent rounded-t-full" />

            {/* Shimmer animation */}
            <div className="absolute inset-0 progress-shimmer rounded-full" />

            {/* Leading edge glow (pulsing) */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-indigo-400/80 via-indigo-500/40 to-transparent animate-pulse rounded-r-full" />
          </div>

          {/* Milestone markers with stars */}
          {[25, 50, 75, 100].map((milestone) => {
            const isPassed = progress >= milestone;
            return (
              <div
                key={milestone}
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-500"
                style={{ left: `calc(${milestone}% - 6px)` }}
              >
                <Star
                  className={`w-3 h-3 transition-all duration-300 ${
                    isPassed
                      ? 'text-indigo-500 fill-indigo-500 scale-125 drop-shadow-lg star-pop'
                      : 'text-gray-400/30 fill-transparent scale-100'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <ExitConfirmationModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={handleConfirmExit}
        mode={mode}
        currentScore={displayScore}
        maxPossibleScore={maxPossibleScore}
      />
    </>
  );
};