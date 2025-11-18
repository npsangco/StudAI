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

        {/* Main Question Card - Exam Paper Style */}
        <div className={`bg-white rounded-2xl shadow-2xl p-8 sm:p-10 border border-gray-300 relative overflow-visible transition-all duration-300 ${isWaiting ? 'opacity-60 scale-[0.98]' : ''}`} style={{
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06)',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(0, 0, 0, 0.02) 31px, rgba(0, 0, 0, 0.02) 32px)'
        }}>
          {/* Dog-ear fold - top right corner */}
          <div className="absolute -top-0 -right-0 w-0 h-0 border-l-[40px] border-l-transparent border-t-[40px] border-t-[#FFDB00] opacity-90" style={{
            filter: 'drop-shadow(-2px 2px 3px rgba(0, 0, 0, 0.15))'
          }} />
          <div className="absolute top-0 right-0 w-0 h-0 border-l-[40px] border-l-white border-b-[40px] border-b-transparent" />

          {/* Hole punches on left side */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-16">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-3 h-3 rounded-full bg-gray-100 border border-gray-300" style={{ boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)' }} />
            ))}
          </div>

          {/* Question Number - typewriter style */}
          <div className="absolute top-6 left-16 font-mono text-sm text-gray-500 font-semibold">
            Question {(currentQuestionIndex ?? 0) + 1}/{totalQuestions || '?'}
          </div>

          {/* Question Text */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-black leading-relaxed relative z-10 text-left pl-12 pt-6" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {currentQ.question}
          </h2>
        </div>
      </div>

      {/* Answer Options Section */}
      <div className="mt-4">
        {/* Multiple Choice - Bubble Style */}
        {currentQ.type === 'Multiple Choice' && currentQ.choices && (
          <div className="space-y-3">
            {currentQ.choices.map((choice, index) => {
              const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
              const letter = letters[index];
              const isSelected = selectedAnswer === choice;
              const isCorrect = choice === currentQ.correctAnswer;
              const isWrong = selectedAnswer && choice === selectedAnswer && !isCorrect;

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerClick(choice)}
                  disabled={!!selectedAnswer || isPaused}
                  className={`
                    w-full bg-white border-2 rounded-xl p-4 sm:p-5
                    transition-all duration-300
                    ${!selectedAnswer ? 'hover:border-indigo-300 hover:shadow-md cursor-pointer' : 'cursor-default'}
                    ${isSelected && !selectedAnswer ? 'border-indigo-400 shadow-lg' : 'border-gray-200'}
                    ${isCorrect && selectedAnswer ? 'border-green-400 bg-green-50' : ''}
                    ${isWrong ? 'border-red-400 bg-red-50' : ''}
                    ${!isCorrect && !isWrong && selectedAnswer ? 'opacity-50' : ''}
                    disabled:cursor-not-allowed
                    relative group
                    flex items-center gap-4
                  `}
                  style={{ boxShadow: isSelected && !selectedAnswer ? '0 4px 12px rgba(99, 102, 241, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)' }}
                >
                  {/* Bubble Circle */}
                  <div className={`
                    flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full border-3
                    flex items-center justify-center font-bold text-lg
                    transition-all duration-300 relative overflow-hidden
                    ${!selectedAnswer && !isSelected ? 'border-gray-400 bg-white' : ''}
                    ${isSelected && !selectedAnswer ? 'border-indigo-500 bg-indigo-50' : ''}
                    ${isCorrect && selectedAnswer ? 'border-green-500 bg-green-500' : ''}
                    ${isWrong ? 'border-red-500 bg-red-500' : ''}
                  `}>
                    {/* Pencil fill animation on hover */}
                    {!selectedAnswer && (
                      <div className="absolute inset-0 bg-indigo-500 scale-0 group-hover:scale-100 transition-transform duration-300 ease-out rounded-full opacity-20" />
                    )}

                    {/* Letter or Check/Cross */}
                    {!selectedAnswer && (
                      <span className={`relative z-10 ${isSelected ? 'text-indigo-600' : 'text-gray-600'}`}>{letter}</span>
                    )}
                    {isCorrect && selectedAnswer && (
                      <svg className="w-6 h-6 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {isWrong && (
                      <svg className="w-6 h-6 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}

                    {/* Filled state for selected */}
                    {isSelected && !selectedAnswer && (
                      <div className="absolute inset-1 bg-indigo-500 rounded-full animate-ink-spread" />
                    )}
                  </div>

                  {/* Choice Text */}
                  <div className={`
                    flex-1 text-left text-base sm:text-lg font-medium
                    ${isCorrect && selectedAnswer ? 'text-green-700' : ''}
                    ${isWrong ? 'text-red-700' : ''}
                    ${!isCorrect && !isWrong ? 'text-gray-800' : ''}
                  `}>
                    {choice}
                  </div>

                  {/* Hover pencil indicator */}
                  {!selectedAnswer && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                  )}

                </button>
              );
            })}
          </div>
        )}

        {/* True/False - Bubble Style */}
        {currentQ.type === 'True/False' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {['True', 'False'].map((choice, index) => {
              const letter = choice === 'True' ? 'T' : 'F';
              const isSelected = selectedAnswer === choice;
              const isCorrect = choice === currentQ.correctAnswer;
              const isWrong = selectedAnswer && choice === selectedAnswer && !isCorrect;

              return (
                <button
                  key={choice}
                  onClick={() => handleAnswerClick(choice)}
                  disabled={!!selectedAnswer || isPaused}
                  className={`
                    bg-white border-2 rounded-xl p-6 sm:p-8
                    transition-all duration-300
                    ${!selectedAnswer ? 'hover:border-indigo-300 hover:shadow-md cursor-pointer' : 'cursor-default'}
                    ${isSelected && !selectedAnswer ? 'border-indigo-400 shadow-lg' : 'border-gray-200'}
                    ${isCorrect && selectedAnswer ? 'border-green-400 bg-green-50' : ''}
                    ${isWrong ? 'border-red-400 bg-red-50' : ''}
                    ${!isCorrect && !isWrong && selectedAnswer ? 'opacity-50' : ''}
                    disabled:cursor-not-allowed
                    relative group
                    flex flex-col items-center justify-center gap-3 min-h-[140px]
                  `}
                  style={{ boxShadow: isSelected && !selectedAnswer ? '0 4px 12px rgba(99, 102, 241, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)' }}
                >
                  {/* Bubble Circle */}
                  <div className={`
                    w-16 h-16 sm:w-20 sm:h-20 rounded-full border-3
                    flex items-center justify-center font-bold text-2xl sm:text-3xl
                    transition-all duration-300 relative overflow-hidden
                    ${!selectedAnswer && !isSelected ? 'border-gray-400 bg-white' : ''}
                    ${isSelected && !selectedAnswer ? 'border-indigo-500 bg-indigo-50' : ''}
                    ${isCorrect && selectedAnswer ? 'border-green-500 bg-green-500' : ''}
                    ${isWrong ? 'border-red-500 bg-red-500' : ''}
                  `}>
                    {/* Pencil fill animation on hover */}
                    {!selectedAnswer && (
                      <div className="absolute inset-0 bg-indigo-500 scale-0 group-hover:scale-100 transition-transform duration-300 ease-out rounded-full opacity-20" />
                    )}

                    {/* Letter or Check/Cross */}
                    {!selectedAnswer && (
                      <span className={`relative z-10 ${isSelected ? 'text-indigo-600' : 'text-gray-600'}`}>{letter}</span>
                    )}
                    {isCorrect && selectedAnswer && (
                      <svg className="w-8 h-8 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {isWrong && (
                      <svg className="w-8 h-8 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}

                    {/* Filled state for selected */}
                    {isSelected && !selectedAnswer && (
                      <div className="absolute inset-1 bg-indigo-500 rounded-full animate-ink-spread" />
                    )}
                  </div>

                  {/* Choice Text */}
                  <div className={`
                    text-xl sm:text-2xl font-bold relative z-10
                    ${isCorrect && selectedAnswer ? 'text-green-700' : ''}
                    ${isWrong ? 'text-red-700' : ''}
                    ${!isCorrect && !isWrong ? 'text-gray-800' : ''}
                  `}>
                    {choice}
                  </div>
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
