import React from 'react';
import { MatchingQuizPlayer } from './QuestionTypes';

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
  isAnswerCorrect
}) => {
  const currentQ = question;

  // Handle answer selection
  const handleAnswerClick = (choice) => {
    if (selectedAnswer || isPaused) return;
    onAnswerSelect(choice);
  };

  if (currentQ.type === 'Matching') {
    return (
      <MatchingQuizPlayer 
        question={currentQ}
        onSubmit={onMatchingSubmit}
        timeLeft={timeLeft}
        isPaused={isPaused}
      />
    );
  }

  return (
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5">
        {/* Question Text */}
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight drop-shadow-lg">
        {currentQ.question}
      </h2>

        {/* Multiple Choice */}
        {currentQ.type === 'Multiple Choice' && currentQ.choices && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {currentQ.choices.map((choice, index) => {
              const isSelected = selectedAnswer === choice;
              const isCorrect = choice === currentQ.correctAnswer;
              const isWrong = selectedAnswer && choice === selectedAnswer && !isCorrect;
              
              let bgClass = 'bg-white/90 hover:bg-white';
              let borderClass = 'border-white/50 hover:border-white';
              let textClass = 'text-gray-900';
              let shadowClass = 'shadow-lg hover:shadow-2xl';
              
              if (selectedAnswer) {
                if (isCorrect) {
                  bgClass = 'bg-gradient-to-br from-green-400 to-emerald-500';
                  borderClass = 'border-green-300';
                  textClass = 'text-white';
                  shadowClass = 'shadow-2xl shadow-green-500/40';
                } else if (isWrong) {
                  bgClass = 'bg-gradient-to-br from-red-400 to-rose-500';
                  borderClass = 'border-red-300';
                  textClass = 'text-white';
                  shadowClass = 'shadow-2xl shadow-red-500/40';
                } else {
                  bgClass = 'bg-white/40';
                  borderClass = 'border-white/30';
                  textClass = 'text-gray-500';
                  shadowClass = 'shadow-sm';
                }
              } else if (isSelected) {
                bgClass = 'bg-white';
                borderClass = 'border-yellow-400';
                shadowClass = 'shadow-2xl shadow-yellow-500/30';
              }
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerClick(choice)}
                  disabled={!!selectedAnswer || isPaused}
                  className={`
                    ${bgClass} ${borderClass} ${textClass} ${shadowClass}
                    backdrop-blur-xl border-2 rounded-2xl p-4 sm:p-6
                    min-h-[80px] sm:min-h-[90px] font-semibold text-base sm:text-lg
                    transition-all duration-300 transform
                    hover:scale-105 hover:-translate-y-1
                    ${isSelected ? 'scale-105 -translate-y-1' : ''}
                    disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0
                    relative overflow-hidden group
                  `}
                >
                  {/* Hover shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  
                  <span className="relative z-10 block leading-relaxed">
                    {choice}
                  </span>
                  
                  {selectedAnswer && isCorrect && (
                    <span className="absolute top-3 right-3 text-2xl">✓</span>
                  )}
                  {selectedAnswer && isWrong && (
                    <span className="absolute top-3 right-3 text-2xl">✗</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* True/False */}
        {currentQ.type === 'True/False' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {['True', 'False'].map((choice) => {
              const isSelected = selectedAnswer === choice;
              const isCorrect = choice === currentQ.correctAnswer;
              const isWrong = selectedAnswer && choice === selectedAnswer && !isCorrect;
              
              let bgClass = 'bg-white/90 hover:bg-white';
              let borderClass = 'border-white/50 hover:border-white';
              let textClass = 'text-gray-900';
              let shadowClass = 'shadow-lg hover:shadow-2xl';
              
              if (selectedAnswer) {
                if (isCorrect) {
                  bgClass = 'bg-gradient-to-br from-green-400 to-emerald-500';
                  borderClass = 'border-green-300';
                  textClass = 'text-white';
                  shadowClass = 'shadow-2xl shadow-green-500/40';
                } else if (isWrong) {
                  bgClass = 'bg-gradient-to-br from-red-400 to-rose-500';
                  borderClass = 'border-red-300';
                  textClass = 'text-white';
                  shadowClass = 'shadow-2xl shadow-red-500/40';
                } else {
                  bgClass = 'bg-white/40';
                  borderClass = 'border-white/30';
                  textClass = 'text-gray-500';
                  shadowClass = 'shadow-sm';
                }
              } else if (isSelected) {
                bgClass = 'bg-white';
                borderClass = 'border-yellow-400';
                shadowClass = 'shadow-2xl shadow-yellow-500/30';
              }
              
              return (
                <button
                  key={choice}
                  onClick={() => handleAnswerClick(choice)}
                  disabled={!!selectedAnswer || isPaused}
                  className={`
                    ${bgClass} ${borderClass} ${textClass} ${shadowClass}
                    backdrop-blur-xl border-2 rounded-2xl p-6 sm:p-8
                    min-h-[100px] sm:min-h-[110px] font-bold text-xl sm:text-2xl
                    transition-all duration-300 transform
                    hover:scale-105 hover:-translate-y-1
                    ${isSelected ? 'scale-105 -translate-y-1' : ''}
                    disabled:cursor-not-allowed
                    relative overflow-hidden group
                  `}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  
                  <span className="relative z-10">{choice}</span>
                  
                  {selectedAnswer && isCorrect && (
                    <span className="absolute top-3 right-3 text-3xl">✓</span>
                  )}
                  {selectedAnswer && isWrong && (
                    <span className="absolute top-3 right-3 text-3xl">✗</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Fill in the Blanks */}
        {currentQ.type === 'Fill in the blanks' && (
          <div className="space-y-4 sm:space-y-5">
            {/* Input Card */}
            <div className={`
              backdrop-blur-xl border-2 rounded-2xl p-4 sm:p-5 shadow-lg transition-all relative
              ${userAnswer?.includes('_submitted')
                ? isAnswerCorrect(currentQ, userAnswer.replace('_submitted', ''))
                  ? 'bg-gradient-to-br from-green-400/90 to-emerald-500/90 border-green-300 shadow-green-500/40'
                  : 'bg-white/90 border-white/50'
                : 'bg-white/90 border-white/50 hover:shadow-2xl'
              }
            `}>
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
                  w-full text-lg sm:text-xl font-semibold bg-transparent border-none outline-none 
                  placeholder-gray-400
                  ${userAnswer?.includes('_submitted') && isAnswerCorrect(currentQ, userAnswer.replace('_submitted', ''))
                    ? 'text-white'
                    : 'text-gray-900'
                  }
                `}
                placeholder="Type your answer here..."
                disabled={userAnswer?.includes('_submitted') || isPaused}
              />
              
              {/* Checkmark for correct */}
              {userAnswer?.includes('_submitted') && isAnswerCorrect(currentQ, userAnswer.replace('_submitted', '')) && (
                <span className="absolute top-4 right-4 text-3xl text-white">✓</span>
              )}
              
              {/* Show correct answer below input if wrong */}
              {userAnswer?.includes('_submitted') && !isAnswerCorrect(currentQ, userAnswer.replace('_submitted', '')) && (
                <div className="mt-3 pt-3 border-t-2 border-gray-200">
                  <p className="text-sm font-semibold text-gray-600 mb-1">Correct Answer:</p>
                  <p className="text-lg sm:text-xl font-bold text-green-600">{currentQ.answer}</p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            {!userAnswer?.includes('_submitted') && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={onFillInAnswer}
                  disabled={!userAnswer?.trim() || isPaused}
                  className="
                    bg-gradient-to-r from-yellow-400 to-amber-500
                    hover:from-yellow-500 hover:to-amber-600
                    disabled:from-gray-300 disabled:to-gray-400
                    text-black font-bold text-lg sm:text-xl px-10 sm:px-12 py-4 sm:py-5
                    rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-yellow-500/30
                    transition-all duration-300 transform hover:scale-105
                    disabled:cursor-not-allowed disabled:hover:scale-100
                    border-2 border-yellow-600/30
                  "
                >
                  Submit Answer
                </button>
              </div>
            )}
          </div>
        )}

        {/* Next question hint - battle mode only */}
        {mode === 'battle' && (selectedAnswer || userAnswer?.includes('_submitted')) && (
          <div className="text-center pt-2">
            <p className="text-white/80 text-base sm:text-lg animate-pulse">
              Next question in a moment...
            </p>
          </div>
        )}
      </div>
  );
};