import { useState, useRef } from 'react';
import { checkAnswer, formatTime } from '../utils/questionHelpers';

export function useQuizGame(questions, timeLimit = 30) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [userMatches, setUserMatches] = useState([]);
  const [isMatchingSubmitted, setIsMatchingSubmitted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
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
    if (!isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1);
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
    setSelectedAnswer('');
    setUserAnswer('');
    setUserMatches([]);
    setIsMatchingSubmitted(false);
    scoreRef.current = 0;
    setDisplayScore(0);
    startTimeRef.current = Date.now();
    setIsPaused(false);
    isProcessingRef.current = false;
  };

  return {
    // State
    currentQuestion,
    currentQuestionIndex,
    selectedAnswer,
    userAnswer,
    userMatches,
    isMatchingSubmitted,
    isPaused,
    displayScore,
    isLastQuestion,
    scoreRef,
    isProcessingRef,
    
    // Setters
    setCurrentQuestionIndex,
    setSelectedAnswer,
    setUserAnswer,
    setUserMatches,
    setIsMatchingSubmitted,
    setIsPaused,
    
    // Methods
    updateScore,
    nextQuestion,
    isAnswerCorrect,
    getResults,
    reset
  };
}