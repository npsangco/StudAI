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
  isAnswerCorrect,
  isWaiting = false,
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
        gradient: 'from-blue-500 to-indigo-600',
        bgPattern: 'from-blue-50 to-indigo-50',
        label: 'Multiple Choice'
      },
      'True/False': { 
        gradient: 'from-purple-500 to-pink-600',
        bgPattern: 'from-purple-50 to-pink-50',
        label: 'True or False'
      },
      'Fill in the blanks': { 
        gradient: 'from-teal-500 to-cyan-600',
        bgPattern: 'from-teal-50 to-cyan-50',
        label: 'Fill in the Blanks'
      },
      'Matching': { 
        gradient: 'from-orange-500 to-red-600',
        bgPattern: 'from-orange-50 to-red-50',
        label: 'Matching'
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
    <div className="max-w-5xl mx-auto space-y-4 mt-6">
      {/* OVERLAPPING BADGE - Question Type Only */}
      <div className="relative z-20">
        {/* Question Type Badge */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${config.gradient} text-white font-bold text-sm shadow-lg`}>
            <span>{config.label}</span>
          </div>
        </div>

        {/* Main Question Card */}
        <div className={`bg-gradient-to-br ${config.bgPattern} rounded-3xl shadow-2xl p-6 sm:p-8 border-2 border-white/80 relative overflow-hidden pt-10 transition-all duration-300 ${isWaiting ? 'opacity-60 scale-[0.98]' : ''}`}>
          {/* Decorative corner elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/30 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/30 rounded-full translate-y-16 -translate-x-16" />

          {/* Question Text */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight relative z-10 text-center">
            {currentQ.question}
          </h2>
        </div>
      </div>

      {/* Answer Options Section */}
      <div className="mt-4">
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
                    backdrop-blur-xl border-2 rounded-2xl p-4 sm:p-5
                    min-h-[90px] font-semibold text-base sm:text-lg
                    transition-all duration-300 transform
                    hover:scale-105 hover:-translate-y-1
                    ${isSelected ? 'scale-105 -translate-y-1' : ''}
                    disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0
                    relative overflow-hidden group
                  `}
                >
                  {/* Hover shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  
                  <span className="relative z-10 block leading-relaxed text-center">
                    {choice}
                  </span>
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
                    min-h-[120px] font-bold text-xl sm:text-2xl
                    transition-all duration-300 transform
                    hover:scale-105 hover:-translate-y-1
                    ${isSelected ? 'scale-105 -translate-y-1' : ''}
                    disabled:cursor-not-allowed
                    relative overflow-hidden group
                    flex items-center justify-center
                  `}
                >
                  {/* Hover shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  
                  <span className="relative z-10">{choice}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Fill in the Blanks */}
        {currentQ.type === 'Fill in the blanks' && (
          <div className="space-y-4">
            <div className={`
              backdrop-blur-xl border-2 rounded-2xl p-5 sm:p-6 shadow-lg transition-all relative
              ${userAnswer?.includes('_submitted')
                ? isAnswerCorrect(currentQ, userAnswer.replace('_submitted', ''))
                  ? 'bg-gradient-to-br from-green-400/90 to-emerald-500/90 border-green-300 shadow-green-500/40'
                  : 'bg-gradient-to-br from-red-400/90 to-rose-500/90 border-red-300 shadow-red-500/40'
                : 'bg-white/90 border-white/50 hover:shadow-2xl'
              }
            `}>
              <div className="flex items-center gap-3 mb-3">
                <label className="text-sm font-bold text-gray-700">Type your answer:</label>
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
                  w-full text-lg sm:text-xl font-semibold bg-transparent border-b-2 pb-2 outline-none 
                  placeholder-gray-400 focus:border-yellow-500 transition-colors
                  ${userAnswer?.includes('_submitted')
                    ? 'text-white border-white'
                    : 'text-gray-900 border-gray-300'
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
                <div className="mt-4 pt-4 border-t-2 border-white/50 -mx-5 -mb-5 px-5 pb-5 rounded-b-2xl sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6">
                  <p className="text-sm font-semibold text-white/90 mb-1">Correct Answer:</p>
                  <p className="text-lg sm:text-xl font-bold text-white">{currentQ.answer}</p>
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
                    bg-gradient-to-r from-yellow-400 to-amber-500
                    hover:from-yellow-500 hover:to-amber-600
                    disabled:from-gray-300 disabled:to-gray-400
                    text-black font-bold text-lg px-10 py-4
                    rounded-2xl shadow-xl hover:shadow-2xl
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
      </div>
    </div>
  );
};
