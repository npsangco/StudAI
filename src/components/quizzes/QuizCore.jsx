import React, { useState, useEffect, useRef } from 'react';
import { MatchingQuizPlayer } from './QuestionTypes';

// Shared quiz logic hook
export const useQuizCore = (questions, mode = 'solo', timeLimit = 30) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [userMatches, setUserMatches] = useState([]);
  const [isMatchingSubmitted, setIsMatchingSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isPaused, setIsPaused] = useState(false);
  const scoreRef = useRef(0);
  const [displayScore, setDisplayScore] = useState(0);
  const startTimeRef = useRef(Date.now());
  const isProcessingRef = useRef(false);

  // Timer ALWAYS counts down, no matter what
  useEffect(() => {
    if (timeLeft > 0 && !isPaused) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isPaused) {
      // Check if we have an answer already (for any question type)
      const hasAnswer = selectedAnswer || 
                        userAnswer?.includes('_submitted') || 
                        isMatchingSubmitted;
      
      if (!hasAnswer && !isProcessingRef.current) {
        // No answer given - auto-advance immediately
        handleTimeUp();
      }
    }
  }, [timeLeft, isPaused]);

  // Auto-advance immediately without delay
  const handleTimeUp = () => {
    isProcessingRef.current = true;
    
    if (currentQuestion < questions.length - 1) {
      // Move to next question immediately
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer('');
      setUserAnswer('');
      setUserMatches([]);
      setIsMatchingSubmitted(false);
      setTimeLeft(timeLimit);
      isProcessingRef.current = false;
    } else {
      // Quiz is complete - this will be handled by the parent component
      isProcessingRef.current = false;
    }
  };

  const isAnswerCorrect = (question, answer) => {
    switch (question.type) {
      case 'Multiple Choice':
        return answer === question.correctAnswer;
      case 'Fill in the blanks':
        return answer.toLowerCase().trim() === question.answer.toLowerCase().trim();
      case 'True/False':
        return answer === question.correctAnswer;
      case 'Matching':
        if (!Array.isArray(answer) || answer.length === 0) return false;
        return answer.every(match => 
          question.matchingPairs.some(pair => 
            pair.left === match.left && pair.right === match.right
          )
        ) && answer.length === question.matchingPairs.length;
      default:
        return false;
    }
  };

  const updateScore = (increment = 1) => {
    scoreRef.current += increment;
    setDisplayScore(scoreRef.current);
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer('');
    setUserAnswer('');
    setUserMatches([]);
    setIsMatchingSubmitted(false);
    setTimeLeft(timeLimit);
    scoreRef.current = 0;
    setDisplayScore(0);
    startTimeRef.current = Date.now();
    setIsPaused(false);
    isProcessingRef.current = false;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeSpent = () => {
    return formatTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
  };

  return {
    currentQuestion,
    selectedAnswer,
    userAnswer,
    userMatches,
    isMatchingSubmitted,
    timeLeft,
    isPaused,
    displayScore,
    score: scoreRef.current,
    scoreRef,
    isProcessingRef,
    setCurrentQuestion,
    setSelectedAnswer,
    setUserAnswer,
    setUserMatches,
    setIsMatchingSubmitted,
    setTimeLeft,
    setIsPaused,
    isAnswerCorrect,
    updateScore,
    resetQuiz,
    formatTime,
    getTimeSpent,
    handleTimeUp
  };
};

// Shared question component
export const QuizQuestion = ({ 
    question, 
    selectedAnswer, 
    userAnswer, 
    userMatches,
    isMatchingSubmitted,
    mode = 'solo', // ✅ ADDED
    onAnswerSelect,
    onFillInAnswer,
    onMatchingSubmit,
    onUserAnswerChange,
    onNextQuestion, // ✅ ADDED (but not used for non-matching)
    timeLeft,
    isPaused = false,
    isAnswerCorrect
  }) => {
    const currentQ = question;
  
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
      <div className="bg-white rounded-xl p-8 shadow-sm border-l-4 border-green-500">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-black mb-4">
            {currentQ.question}
          </h2>
        </div>
        
        {currentQ.type === 'Multiple Choice' && currentQ.choices && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {currentQ.choices.map((choice, index) => {
              let buttonClass = 'p-4 rounded-lg border-2 text-left transition-all font-medium ';
              
              if (selectedAnswer) {
                if (choice === currentQ.correctAnswer) {
                  buttonClass += 'border-green-500 bg-green-50 text-green-700';
                } else if (choice === selectedAnswer) {
                  buttonClass += 'border-red-500 bg-red-50 text-red-700';
                } else {
                  buttonClass += 'border-gray-200 bg-gray-50 text-gray-500';
                }
              } else {
                buttonClass += 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer';
              }
              
              return (
                <button
                  key={index}
                  onClick={() => onAnswerSelect(choice)}
                  disabled={!!selectedAnswer || isPaused}
                  className={buttonClass}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        )}
  
        {currentQ.type === 'True/False' && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {['True', 'False'].map((choice) => {
              let buttonClass = 'p-4 rounded-lg border-2 text-center transition-all font-medium ';
              
              if (selectedAnswer) {
                if (choice === currentQ.correctAnswer) {
                  buttonClass += 'border-green-500 bg-green-50 text-green-700';
                } else if (choice === selectedAnswer) {
                  buttonClass += 'border-red-500 bg-red-50 text-red-700';
                } else {
                  buttonClass += 'border-gray-200 bg-gray-50 text-gray-500';
                }
              } else {
                buttonClass += 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer';
              }
              
              return (
                <button
                  key={choice}
                  onClick={() => onAnswerSelect(choice)}
                  disabled={!!selectedAnswer || isPaused}
                  className={buttonClass}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        )}
  
        {/* Fill in the blanks section */}
        {currentQ.type === 'Fill in the blanks' && (
          <div className="space-y-4 mb-8">
            <div className="flex gap-3">
              <input
                type="text"
                value={userAnswer?.replace('_submitted', '') || ''}
                onChange={(e) => onUserAnswerChange && onUserAnswerChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !userAnswer?.includes('_submitted') && onFillInAnswer) {
                    onFillInAnswer();
                  }
                }}
                className="flex-1 p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type your answer here..."
                disabled={userAnswer?.includes('_submitted') || isPaused}
              />
              <button
                onClick={onFillInAnswer}
                disabled={!userAnswer?.trim() || userAnswer?.includes('_submitted') || isPaused}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                Submit
              </button>
            </div>
          </div>
        )}
        
        {/* Result display */}
        {(selectedAnswer || userAnswer?.includes('_submitted')) && (
          <div className="text-center space-y-4">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${
              (currentQ.type === 'Multiple Choice' || currentQ.type === 'True/False') && selectedAnswer === currentQ.correctAnswer ||
              currentQ.type === 'Fill in the blanks' && userAnswer?.includes('_submitted') && 
                isAnswerCorrect(currentQ, userAnswer.replace('_submitted', ''))
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {(currentQ.type === 'Multiple Choice' || currentQ.type === 'True/False') && selectedAnswer === currentQ.correctAnswer ||
              currentQ.type === 'Fill in the blanks' && userAnswer?.includes('_submitted') && 
                isAnswerCorrect(currentQ, userAnswer.replace('_submitted', ''))
                ? '✓ Correct!' : 
                currentQ.type === 'Fill in the blanks' && userAnswer?.includes('_submitted')
                  ? `✗ Answer: ${currentQ.answer}`
                  : '✗ Incorrect'}
            </div>

            {/* ✅ ADDED: Show "Next question..." message for Battle mode */}
            {mode === 'battle' && (
              <p className="text-sm text-gray-600 animate-pulse">
                Next question in a moment...
              </p>
            )}
          </div>
        )}
      </div>
    );
  };