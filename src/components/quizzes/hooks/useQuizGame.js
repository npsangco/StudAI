import { useState, useRef } from 'react';
import { checkAnswer, formatTime } from '../utils/questionHelpers';

export function useQuizGame(questions, timeLimit = 30) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const currentQuestionIndexRef = useRef(0); // Track current index for auto-save closure
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [userMatches, setUserMatches] = useState([]);
  const [isMatchingSubmitted, setIsMatchingSubmitted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Track user answers and answered questions for reconnection
  const [userAnswers, setUserAnswers] = useState([]);
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());

  const scoreRef = useRef(0);
  const [displayScore, setDisplayScore] = useState(0);
  const startTimeRef = useRef(Date.now());
  const isProcessingRef = useRef(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const updateScore = (increment = 1) => {
    scoreRef.current += increment;
    setDisplayScore(scoreRef.current);
  };

  const nextQuestion = () => {
    if (!isLastQuestion && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => {
        const nextIndex = prev + 1;
        const finalIndex = Math.min(nextIndex, questions.length - 1);
        currentQuestionIndexRef.current = finalIndex; // Keep ref in sync
        return finalIndex;
      });
      setSelectedAnswer('');
      setUserAnswer('');
      setUserMatches([]);
      setIsMatchingSubmitted(false);
    }
  };

  const isAnswerCorrect = (question, answer) => {
    return checkAnswer(question, answer);
  };

  const getResults = () => {
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    return {
      score: scoreRef.current,
      totalQuestions: questions.length,
      timeSpent: formatTime(timeSpent)
    };
  };

  const reset = () => {
    setCurrentQuestionIndex(0);
    currentQuestionIndexRef.current = 0; // Reset ref too
    setSelectedAnswer('');
    setUserAnswer('');
    setUserMatches([]);
    setIsMatchingSubmitted(false);
    scoreRef.current = 0;
    setDisplayScore(0);
    startTimeRef.current = Date.now();
    setIsPaused(false);
    isProcessingRef.current = false;
    setUserAnswers([]);
    setAnsweredQuestions(new Set());
  };

  return {
    // State
    currentQuestion,
    currentQuestionIndex,
    currentQuestionIndexRef,
    selectedAnswer,
    userAnswer,
    userMatches,
    isMatchingSubmitted,
    isPaused,
    displayScore,
    isLastQuestion,
    scoreRef,
    isProcessingRef,
    userAnswers,
    answeredQuestions,

    // Setters
    setCurrentQuestionIndex,
    setSelectedAnswer,
    setUserAnswer,
    setUserMatches,
    setIsMatchingSubmitted,
    setIsPaused,
    setUserAnswers,
    setAnsweredQuestions,  

    // Methods
    updateScore,
    nextQuestion,
    isAnswerCorrect,
    getResults,
    reset
  };
}