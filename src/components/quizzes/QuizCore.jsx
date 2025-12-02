import React from 'react';
import { MatchingQuizPlayer } from './QuestionTypes';
import { List, CheckCircle, Edit3, Link } from 'lucide-react';

export const QuizQuestion = ({
  question,
  selectedAnswer,
  userAnswer,
  userMatches,
  isMatchingSubmitted,
  mode = 'solo',
  onAnswerSelect,
  onFillInAnswer,
  onMatchingSubmit,
  onUserAnswerChange,
  onNextQuestion,
  timeLeft,
  isPaused = false,
  isAnswerCorrect,
  isWaiting = false,
  currentQuestionIndex,
  totalQuestions,
}) => {
  const currentQ = question;

  // Handle answer selection
  const handleAnswerClick = (choice) => {
    if (selectedAnswer || isPaused) return;
    onAnswerSelect(choice);
  };

  // Get question type config
  const getQuestionTypeConfig = (type) => {
    const configs = {
      'Multiple Choice': {
        color: 'bg-blue-500',
        bgPattern: 'from-blue-50 to-indigo-50',
        label: 'Multiple Choice',
        icon: 'list'
      },
      'True/False': {
        color: 'bg-purple-500',
        bgPattern: 'from-purple-50 to-pink-50',
        label: 'True or False',
        icon: 'check-circle'
      },
      'Fill in the blanks': {
        color: 'bg-teal-500',
        bgPattern: 'from-teal-50 to-cyan-50',
        label: 'Fill in the Blanks',
        icon: 'edit-3'
      },
      'Matching': {
        color: 'bg-orange-500',
        bgPattern: 'from-orange-50 to-red-50',
        label: 'Matching',
        icon: 'link'
      }
    };
    return configs[type] || configs['Multiple Choice'];
  };

  const config = getQuestionTypeConfig(currentQ.type);

  if (currentQ.type === 'Matching') {
    return (
      <MatchingQuizPlayer
        question={currentQ}
        onSubmit={onMatchingSubmit}
        timeLeft={timeLeft}
        isPaused={isPaused}
        isWaiting={isWaiting}
      />
    );
  }

  return (
    <div className="max-w-full sm:max-w-3xl lg:max-w-5xl mx-auto px-2 sm:px-4">
      {/* OVERLAPPING BADGE - Question Type Only */}
      <div className="relative z-20 mt-4 sm:mt-6">
        {/* Question Type Badge */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.color} text-white font-bold text-sm shadow-lg`}>
            {config.icon === 'list' && <List size={16} />}
            {config.icon === 'check-circle' && <CheckCircle size={16} />}
            {config.icon === 'edit-3' && <Edit3 size={16} />}
            {config.icon === 'link' && <Link size={16} />}
            <span>{config.label}</span>
          </div>
        </div>

        {/* Main Question Card - Frosted Glass Layers */}
        <div className={`relative transition-all duration-500 ${isWaiting ? 'opacity-60 scale-[0.98]' : ''}`}>
          {/* Floating glass shards orbiting the card - Reduced on mobile for performance */}
          <div className="absolute inset-0 pointer-events-none overflow-visible hidden sm:block">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-sm animate-float-shard"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 219, 0, 0.8), rgba(99, 102, 241, 0.6))',
                  left: `${5 + i * 12}%`,
                  top: i % 2 === 0 ? '-20px' : 'calc(100% + 20px)',
                  animationDelay: `${i * 0.6}s`,
                  animationDuration: `${5 + (i % 3)}s`,
                  transform: `rotate(${i * 45}deg)`,
                  boxShadow: '0 0 12px rgba(255, 219, 0, 0.6)',
                  opacity: 0.6
                }}
              />
            ))}
          </div>
          {/* Simplified mobile shards - Only 3 elements */}
          <div className="absolute inset-0 pointer-events-none overflow-visible sm:hidden">
            {[0, 2, 5].map((i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-sm animate-float-shard"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 219, 0, 0.6), rgba(99, 102, 241, 0.4))',
                  left: `${10 + i * 15}%`,
                  top: i % 2 === 0 ? '-15px' : 'calc(100% + 15px)',
                  animationDelay: `${i * 0.8}s`,
                  animationDuration: `${6 + (i % 2)}s`,
                  transform: `rotate(${i * 60}deg)`,
                  boxShadow: '0 0 8px rgba(255, 219, 0, 0.4)',
                  opacity: 0.5
                }}
              />
            ))}
          </div>

          {/* Background gradient layer (shifts subtly) */}
          <div className="absolute inset-0 rounded-3xl opacity-40 animate-gradient-shift" style={{
            background: 'linear-gradient(135deg, #FFDB00 0%, #FFC700 25%, rgba(99, 102, 241, 0.3) 50%, #FFB800 75%, #FFDB00 100%)',
            backgroundSize: '200% 200%'
          }} />

          {/* Glass Layer 1 - Back layer (heaviest blur) */}
          <div className="absolute inset-0 rounded-3xl backdrop-blur-2xl bg-white/30 border-2 border-white/40 transform translate-y-2 translate-x-2" style={{
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)'
          }} />

          {/* Glass Layer 2 - Middle layer */}
          <div className="absolute inset-0 rounded-3xl backdrop-blur-xl bg-white/40 border-2 border-white/50 transform translate-y-1 translate-x-1" style={{
            boxShadow: '0 15px 30px rgba(0, 0, 0, 0.1)'
          }} />

          {/* Glass Layer 3 - Front layer (main content) */}
          <div className="relative rounded-2xl sm:rounded-3xl backdrop-blur-lg bg-white/60 border-2 border-white/70 p-5 sm:p-8 lg:p-10" style={{
            boxShadow: '0 25px 50px rgba(255, 219, 0, 0.25), 0 10px 20px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.9)'
          }}>
            {/* Top glass highlight */}
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent rounded-t-2xl sm:rounded-t-3xl pointer-events-none" />

            {/* Question Number Badge - Frosted glass pill */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="backdrop-blur-xl bg-white/40 border-2 border-white/60 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 shadow-lg">
                <span className="text-xs sm:text-sm font-bold bg-gradient-to-r from-[#FFDB00] to-indigo-600 bg-clip-text text-transparent">
                  Question {(currentQuestionIndex ?? 0) + 1} of {totalQuestions || '?'}
                </span>
              </div>
            </div>

            {/* Question Text - sits between glass layers with overflow handling */}
            <div className="max-h-[200px] sm:max-h-[300px] lg:max-h-[400px] overflow-y-auto custom-scrollbar">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 leading-snug sm:leading-tight relative z-10 text-center break-words" style={{
                textShadow: '0 1px 2px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.1)',
                overflowWrap: 'break-word',
                wordWrap: 'break-word',
                hyphens: 'auto'
              }}>
                {currentQ.question}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Answer Options Section - Increased gap with responsive spacing */}
      <div className="mt-6 sm:mt-8 lg:mt-10">
        {/* Multiple Choice - Frosted Glass Panes */}
        {currentQ.type === 'Multiple Choice' && currentQ.choices && Array.isArray(currentQ.choices) && currentQ.choices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
            {currentQ.choices.filter(choice => choice != null && choice !== '').map((choice, index) => {
              const isSelected = selectedAnswer === choice;
              const isCorrect = choice === currentQ.correctAnswer;
              const isWrong = selectedAnswer && choice === selectedAnswer && !isCorrect;

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerClick(choice)}
                  disabled={!!selectedAnswer || isPaused}
                  className={`
                    relative min-h-[72px] sm:min-h-[90px] lg:min-h-[100px] max-h-[200px]
                    rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6
                    transition-all duration-500 transform
                    disabled:cursor-not-allowed
                    group overflow-hidden
                    ${!selectedAnswer ? 'hover:scale-[1.02] hover:-translate-y-1 cursor-pointer' : ''}
                    ${isSelected && !selectedAnswer ? 'scale-[1.02] -translate-y-1' : ''}
                  `}
                  style={{
                    boxShadow: isCorrect && selectedAnswer
                      ? '0 20px 40px rgba(34, 197, 94, 0.3)'
                      : isWrong
                      ? '0 20px 40px rgba(239, 68, 68, 0.3)'
                      : '0 10px 30px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  {/* Gradient background behind glass */}
                  <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${
                    isCorrect && selectedAnswer
                      ? 'opacity-100'
                      : isWrong
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`} style={{
                    background: isCorrect && selectedAnswer
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : isWrong
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'linear-gradient(135deg, #FFDB00, rgba(99, 102, 241, 0.5))'
                  }} />

                  {/* Frosted glass pane - blur reduces on hover */}
                  <div className={`absolute inset-0 rounded-2xl border-2 transition-all duration-500 ${
                    selectedAnswer && !isCorrect && !isWrong
                      ? 'backdrop-blur-2xl bg-white/70 border-white/50'
                      : isCorrect && selectedAnswer
                      ? 'backdrop-blur-none bg-transparent border-green-400 animate-glass-shatter'
                      : isWrong
                      ? 'backdrop-blur-sm bg-transparent border-red-400'
                      : isSelected && !selectedAnswer
                      ? 'backdrop-blur-md bg-white/50 border-indigo-500'
                      : 'backdrop-blur-xl bg-white/80 border-white/60 group-hover:backdrop-blur-md group-hover:bg-white/50'
                  }`}>
                    {/* Top highlight for glass effect */}
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-2xl" />

                    {/* Cracked glass effect for wrong answer */}
                    {isWrong && (
                      <svg className="absolute inset-0 w-full h-full opacity-60" style={{ filter: 'drop-shadow(0 0 2px rgba(239, 68, 68, 0.8))' }}>
                        <line x1="50%" y1="50%" x2="10%" y2="10%" stroke="#dc2626" strokeWidth="2" />
                        <line x1="50%" y1="50%" x2="90%" y2="20%" stroke="#dc2626" strokeWidth="2" />
                        <line x1="50%" y1="50%" x2="80%" y2="90%" stroke="#dc2626" strokeWidth="2" />
                        <line x1="50%" y1="50%" x2="20%" y2="85%" stroke="#dc2626" strokeWidth="2" />
                        <line x1="50%" y1="50%" x2="60%" y2="5%" stroke="#dc2626" strokeWidth="1.5" />
                        <line x1="50%" y1="50%" x2="5%" y2="50%" stroke="#dc2626" strokeWidth="1.5" />
                      </svg>
                    )}
                  </div>

                  {/* Sparkle particles for correct answer */}
                  {isCorrect && selectedAnswer && (
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-1 h-1 bg-white rounded-full animate-sparkle"
                          style={{
                            left: `${20 + i * 10}%`,
                            top: `${30 + (i % 3) * 20}%`,
                            animationDelay: `${i * 0.1}s`
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Choice text with overflow handling */}
                  <div className="relative z-10 max-h-[150px] overflow-y-auto custom-scrollbar-choice flex items-center justify-center">
                    <span className={`block text-sm sm:text-base lg:text-lg font-semibold leading-snug sm:leading-relaxed text-center transition-colors duration-300 break-words ${
                      isCorrect && selectedAnswer
                        ? 'text-white drop-shadow-md'
                        : isWrong
                        ? 'text-white drop-shadow-md'
                        : selectedAnswer && !isCorrect && !isWrong
                        ? 'text-gray-400'
                        : 'text-gray-900'
                    }`} style={{
                      overflowWrap: 'break-word',
                      wordWrap: 'break-word',
                      hyphens: 'auto'
                    }}>
                      {choice}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* True/False - Frosted Glass Panes */}
        {currentQ.type === 'True/False' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
            {['True', 'False'].map((choice) => {
              const isSelected = selectedAnswer === choice;
              const isCorrect = choice === currentQ.correctAnswer;
              const isWrong = selectedAnswer && choice === selectedAnswer && !isCorrect;

              return (
                <button
                  key={choice}
                  onClick={() => handleAnswerClick(choice)}
                  disabled={!!selectedAnswer || isPaused}
                  className={`
                    relative min-h-[100px] sm:min-h-[120px] lg:min-h-[140px]
                    rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-10
                    transition-all duration-500 transform
                    disabled:cursor-not-allowed
                    group overflow-hidden
                    flex items-center justify-center
                    ${!selectedAnswer ? 'hover:scale-[1.02] hover:-translate-y-1 cursor-pointer' : ''}
                    ${isSelected && !selectedAnswer ? 'scale-[1.02] -translate-y-1' : ''}
                  `}
                  style={{
                    boxShadow: isCorrect && selectedAnswer
                      ? '0 20px 40px rgba(34, 197, 94, 0.3)'
                      : isWrong
                      ? '0 20px 40px rgba(239, 68, 68, 0.3)'
                      : '0 10px 30px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  {/* Gradient background behind glass */}
                  <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${
                    isCorrect && selectedAnswer
                      ? 'opacity-100'
                      : isWrong
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`} style={{
                    background: isCorrect && selectedAnswer
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : isWrong
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'linear-gradient(135deg, #FFDB00, rgba(99, 102, 241, 0.5))'
                  }} />

                  {/* Frosted glass pane - blur reduces on hover */}
                  <div className={`absolute inset-0 rounded-2xl border-2 transition-all duration-500 ${
                    selectedAnswer && !isCorrect && !isWrong
                      ? 'backdrop-blur-2xl bg-white/70 border-white/50'
                      : isCorrect && selectedAnswer
                      ? 'backdrop-blur-none bg-transparent border-green-400 animate-glass-shatter'
                      : isWrong
                      ? 'backdrop-blur-sm bg-transparent border-red-400'
                      : isSelected && !selectedAnswer
                      ? 'backdrop-blur-md bg-white/50 border-indigo-500'
                      : 'backdrop-blur-xl bg-white/80 border-white/60 group-hover:backdrop-blur-md group-hover:bg-white/50'
                  }`}>
                    {/* Top highlight for glass effect */}
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-2xl" />

                    {/* Cracked glass effect for wrong answer */}
                    {isWrong && (
                      <svg className="absolute inset-0 w-full h-full opacity-60" style={{ filter: 'drop-shadow(0 0 2px rgba(239, 68, 68, 0.8))' }}>
                        <line x1="50%" y1="50%" x2="10%" y2="10%" stroke="#dc2626" strokeWidth="2" />
                        <line x1="50%" y1="50%" x2="90%" y2="20%" stroke="#dc2626" strokeWidth="2" />
                        <line x1="50%" y1="50%" x2="80%" y2="90%" stroke="#dc2626" strokeWidth="2" />
                        <line x1="50%" y1="50%" x2="20%" y2="85%" stroke="#dc2626" strokeWidth="2" />
                        <line x1="50%" y1="50%" x2="60%" y2="5%" stroke="#dc2626" strokeWidth="1.5" />
                        <line x1="50%" y1="50%" x2="5%" y2="50%" stroke="#dc2626" strokeWidth="1.5" />
                      </svg>
                    )}
                  </div>

                  {/* Sparkle particles for correct answer */}
                  {isCorrect && selectedAnswer && (
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-1 h-1 bg-white rounded-full animate-sparkle"
                          style={{
                            left: `${20 + i * 10}%`,
                            top: `${30 + (i % 3) * 20}%`,
                            animationDelay: `${i * 0.1}s`
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Choice text */}
                  <span className={`relative z-10 text-lg sm:text-xl lg:text-2xl font-bold transition-colors duration-300 ${
                    isCorrect && selectedAnswer
                      ? 'text-white drop-shadow-md'
                      : isWrong
                      ? 'text-white drop-shadow-md'
                      : selectedAnswer && !isCorrect && !isWrong
                      ? 'text-gray-400'
                      : 'text-gray-900'
                  }`}>
                    {choice}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Fill in the Blanks */}
        {currentQ.type === 'Fill in the blanks' && (
          <div className="space-y-3 sm:space-y-4">
            <div className={`
              backdrop-blur-xl border-2 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg transition-all relative
              ${userAnswer?.includes('_submitted')
                ? isAnswerCorrect(currentQ, userAnswer.replace('_submitted', ''))
                  ? 'bg-gradient-to-br from-green-400/90 to-emerald-500/90 border-green-300 shadow-green-500/40'
                  : 'bg-gradient-to-br from-red-400/90 to-rose-500/90 border-red-300 shadow-red-500/40'
                : 'bg-white/30 border-white/40 hover:bg-white/40 hover:shadow-xl'
              }
            `}>
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <label className={`text-xs sm:text-sm font-bold ${userAnswer?.includes('_submitted') ? 'text-white drop-shadow-sm' : 'text-black'}`}>Type your answer:</label>
              </div>

              <input
                type="text"
                value={userAnswer?.replace('_submitted', '') || ''}
                onChange={(e) => onUserAnswerChange && onUserAnswerChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !userAnswer?.includes('_submitted') && onFillInAnswer) {
                    onFillInAnswer();
                  }
                }}
                className={`
                  w-full text-base sm:text-lg lg:text-xl font-semibold bg-transparent border-b-2 pb-2 outline-none
                  placeholder-black/50 focus:border-yellow-400 transition-colors
                  ${userAnswer?.includes('_submitted')
                    ? 'text-white drop-shadow-sm border-white'
                    : 'text-black border-black/40'
                  }
                `}
                placeholder="Type here..."
                disabled={userAnswer?.includes('_submitted') || isPaused}
              />
              
              {/* Checkmark for correct */}
              {userAnswer?.includes('_submitted') && isAnswerCorrect(currentQ, userAnswer.replace('_submitted', '')) && (
                <span className="absolute top-5 right-5 text-3xl text-white">✓</span>
              )}
              
              {/* X mark for wrong */}
              {userAnswer?.includes('_submitted') && !isAnswerCorrect(currentQ, userAnswer.replace('_submitted', '')) && (
                <span className="absolute top-5 right-5 text-3xl text-white">✗</span>
              )}
              
              {/* Show correct answer below input if wrong */}
              {userAnswer?.includes('_submitted') && !isAnswerCorrect(currentQ, userAnswer.replace('_submitted', '')) && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-white/50 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl sm:-mx-5 sm:-mb-5 sm:px-5 sm:pb-5 sm:rounded-b-2xl lg:-mx-6 lg:-mb-6 lg:px-6 lg:pb-6">
                  <p className="text-xs sm:text-sm font-semibold text-white/90 mb-1">Correct Answer:</p>
                  <p className="text-base sm:text-lg lg:text-xl font-bold text-white break-words" style={{
                    overflowWrap: 'break-word',
                    wordWrap: 'break-word'
                  }}>{currentQ.answer}</p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            {!userAnswer?.includes('_submitted') && (
              <div className="flex justify-center">
                <button
                  onClick={onFillInAnswer}
                  disabled={!userAnswer?.trim() || isPaused}
                  className="
                    btn-branded-yellow
                    disabled:bg-white/20
                    text-black font-bold text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4
                    rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl
                    transition-all duration-300 transform hover:scale-105
                    disabled:cursor-not-allowed disabled:hover:scale-100 disabled:text-black/50
                    border-2 border-white/40
                  "
                >
                  Submit Answer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
