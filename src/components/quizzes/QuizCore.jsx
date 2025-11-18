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
    <div className="max-w-5xl mx-auto space-y-4 mt-6">
      {/* OVERLAPPING BADGE - Question Type Only */}
      <div className="relative z-20">
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

        {/* Main Question Card */}
        <div className={`bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 border-2 border-gray-200 relative overflow-hidden pt-10 transition-all duration-300 ${isWaiting ? 'opacity-60 scale-[0.98]' : ''}`} style={{ boxShadow: '0 25px 50px -12px rgba(255, 219, 0, 0.15)' }}>
          {/* Decorative corner elements with branded yellow */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-16 translate-x-16 blur-2xl" style={{ backgroundColor: 'rgba(255, 219, 0, 0.3)' }} />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full translate-y-16 -translate-x-16 blur-2xl" style={{ backgroundColor: 'rgba(255, 219, 0, 0.25)' }} />

          {/* Question Text */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black drop-shadow-sm leading-tight relative z-10 text-center">
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

              let bgClass = 'bg-white/80 backdrop-blur-md hover:bg-white/90';
              let borderClass = 'border-gray-300 hover:border-gray-400';
              let textClass = 'text-black';
              let shadowClass = 'shadow-lg hover:shadow-xl';
              
              if (selectedAnswer) {
                if (isCorrect) {
                  bgClass = 'bg-green-500';
                  borderClass = 'border-green-400';
                  textClass = 'text-white';
                  shadowClass = 'shadow-2xl shadow-green-500/40';
                } else if (isWrong) {
                  bgClass = 'bg-red-500';
                  borderClass = 'border-red-400';
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
                borderClass = 'border-[#FFDB00]';
                shadowClass = 'shadow-2xl';
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
                  {/* Horizontal shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                  {/* Diagonal slash effect with branded yellow */}
                  <div className="absolute inset-0 translate-x-[-100%] translate-y-[-100%] group-hover:translate-x-[100%] group-hover:translate-y-[100%] transition-transform duration-1000 ease-out opacity-0 group-hover:opacity-100" style={{ background: 'linear-gradient(to bottom right, transparent, rgba(255, 219, 0, 0.2), transparent)' }} />

                  {/* Corner glow accent with branded yellow */}
                  <div className="absolute top-0 right-0 w-0 h-0 group-hover:w-12 group-hover:h-12 transition-all duration-400 rounded-bl-full blur-sm" style={{ backgroundColor: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 219, 0, 0.2)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'} />

                  {/* Bottom border light with branded yellow */}
                  <div className="absolute bottom-0 left-0 right-0 h-0 group-hover:h-2 transition-all duration-300" style={{ background: 'linear-gradient(to top, rgba(255, 219, 0, 0), rgba(255, 219, 0, 0.4))' }} />

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

              let bgClass = 'bg-white/80 backdrop-blur-md hover:bg-white/90';
              let borderClass = 'border-gray-300 hover:border-gray-400';
              let textClass = 'text-black';
              let shadowClass = 'shadow-lg hover:shadow-xl';

              if (selectedAnswer) {
                if (isCorrect) {
                  bgClass = 'bg-green-500';
                  borderClass = 'border-green-400';
                  textClass = 'text-white drop-shadow-sm';
                  shadowClass = 'shadow-2xl shadow-green-500/40';
                } else if (isWrong) {
                  bgClass = 'bg-red-500';
                  borderClass = 'border-red-400';
                  textClass = 'text-white drop-shadow-sm';
                  shadowClass = 'shadow-2xl shadow-red-500/40';
                } else {
                  bgClass = 'bg-white/10 backdrop-blur-sm';
                  borderClass = 'border-white/20';
                  textClass = 'text-black/50';
                  shadowClass = 'shadow-sm';
                }
              } else if (isSelected) {
                bgClass = 'bg-yellow-400/50 backdrop-blur-md';
                borderClass = 'border-yellow-500';
                shadowClass = 'shadow-2xl shadow-yellow-500/40';
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
                  {/* Horizontal shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                  {/* Diagonal slash effect with branded yellow */}
                  <div className="absolute inset-0 translate-x-[-100%] translate-y-[-100%] group-hover:translate-x-[100%] group-hover:translate-y-[100%] transition-transform duration-1000 ease-out opacity-0 group-hover:opacity-100" style={{ background: 'linear-gradient(to bottom right, transparent, rgba(255, 219, 0, 0.2), transparent)' }} />

                  {/* Corner glow accent with branded yellow */}
                  <div className="absolute top-0 right-0 w-0 h-0 group-hover:w-12 group-hover:h-12 transition-all duration-400 rounded-bl-full blur-sm" style={{ backgroundColor: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 219, 0, 0.2)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'} />

                  {/* Bottom border light with branded yellow */}
                  <div className="absolute bottom-0 left-0 right-0 h-0 group-hover:h-2 transition-all duration-300" style={{ background: 'linear-gradient(to top, rgba(255, 219, 0, 0), rgba(255, 219, 0, 0.4))' }} />

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
                : 'bg-white/30 border-white/40 hover:bg-white/40 hover:shadow-xl'
              }
            `}>
              <div className="flex items-center gap-3 mb-3">
                <label className={`text-sm font-bold ${userAnswer?.includes('_submitted') ? 'text-white drop-shadow-sm' : 'text-black'}`}>Type your answer:</label>
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
                    btn-branded-yellow
                    disabled:bg-white/20
                    text-black font-bold text-lg px-10 py-4
                    rounded-2xl shadow-xl hover:shadow-2xl
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
