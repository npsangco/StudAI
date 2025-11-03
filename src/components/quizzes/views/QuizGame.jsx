import React, { useState, useEffect, useRef } from 'react';
import { useQuizGame } from '../hooks/useQuizGame';
import { useQuizTimer } from '../hooks/useQuizTimer';
import { QuizGameHeader } from '../QuizGameHeader';
import { QuizQuestion } from '../QuizCore';
import { LiveLeaderboard, useSimulatedPlayers } from '../QuizSimulation';
import { ANSWER_DISPLAY_DURATION, MATCHING_REVIEW_DURATION_BATTLE } from '../utils/constants';

const QuizGame = ({ 
  quiz, 
  mode = 'solo', 
  onBack, 
  onComplete,
  onPlayerScoreUpdate 
}) => {
  const questions = quiz?.questions || [];
  const [isProcessing, setIsProcessing] = useState(false);
  // Track all answers for summary
  const [answersHistory, setAnswersHistory] = useState([]);
  const timeoutHandledRef = useRef(false);
  
  const game = useQuizGame(questions, 30);
  const simulatedPlayers = useSimulatedPlayers(questions.length, game.currentQuestionIndex);
  const [userPlayer] = useState({ id: 'user', name: 'You', initial: 'Y', score: 0 });
  
  const allPlayers = mode === 'battle' ? [
    { ...userPlayer, score: game.displayScore },
    ...simulatedPlayers
  ] : [];

  const currentQ = game.currentQuestion;

  const { timeLeft, resetTimer } = useQuizTimer(30, game.isPaused, () => {
    const hasAnswer = game.selectedAnswer || 
                      game.userAnswer?.includes('_submitted') || 
                      game.isMatchingSubmitted;
    
    if (!hasAnswer && !isProcessing) {
      handleTimeUp();
    }
  });

  useEffect(() => {
    game.isProcessingRef.current = isProcessing;
  }, [isProcessing, game.isProcessingRef]);

  const handleTimeUp = () => {
    // Prevent multiple timeout recordings
    if (timeoutHandledRef.current) return;
    timeoutHandledRef.current = true;
    
    // Record timeout as incorrect answer
    if (currentQ) {
      const answerRecord = {
        question: currentQ.question,
        userAnswer: '(No answer - time ran out)',
        correctAnswer: getCorrectAnswerDisplay(currentQ),
        isCorrect: false,
        type: currentQ.type
      };
      setAnswersHistory(prev => [...prev, answerRecord]);
    }
    
    game.isProcessingRef.current = true;
    
    // Move to next question or finish
    setTimeout(() => {
      if (game.currentQuestionIndex < questions.length - 1) {
        game.nextQuestion();
        resetTimer(30);
        timeoutHandledRef.current = false; // Reset for next question
        game.isProcessingRef.current = false;
      } else {
        // Last question - finish quiz
        handleNextQuestion();
      }
    }, 100);
  };

  const handleAnswerSelect = (answer) => {
    if (game.selectedAnswer || game.isPaused || isProcessing) return;
    
    timeoutHandledRef.current = true;
    setIsProcessing(true);
    game.setSelectedAnswer(answer);
    
    const isCorrect = game.isAnswerCorrect(currentQ, answer);

    // Record answer
    const answerRecord = {
      question: currentQ.question,
      userAnswer: answer,
      correctAnswer: currentQ.correctAnswer,
      isCorrect: isCorrect,
      type: currentQ.type
    };
    setAnswersHistory(prev => [...prev, answerRecord]);

    if (isCorrect) {
      game.updateScore(1);
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      handleNextQuestion();
    }, ANSWER_DISPLAY_DURATION);
  };

  const handleFillInAnswer = () => {
    if (!game.userAnswer?.trim() || game.userAnswer.includes('_submitted') || game.isPaused || isProcessing) return;
    
    timeoutHandledRef.current = true;
    setIsProcessing(true);
    const actualAnswer = game.userAnswer.trim();
    const isCorrect = game.isAnswerCorrect(currentQ, actualAnswer);

    // Record answer
    const answerRecord = {
      question: currentQ.question,
      userAnswer: actualAnswer,
      correctAnswer: currentQ.answer,
      isCorrect: isCorrect,
      type: currentQ.type
    };
    setAnswersHistory(prev => [...prev, answerRecord]);
    
    game.setUserAnswer(actualAnswer + '_submitted');
    
    if (isCorrect) {
      game.updateScore(1);
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      handleNextQuestion();
    }, ANSWER_DISPLAY_DURATION);
  };

  const handleMatchingSubmit = (matches) => {
    if (game.isPaused || isProcessing) return;

    timeoutHandledRef.current = true;
    setIsProcessing(true);
    game.setUserMatches(matches);
    game.setIsMatchingSubmitted(true);
    const isCorrect = game.isAnswerCorrect(currentQ, matches);

    // Record answer
    const answerRecord = {
      question: currentQ.question,
      userAnswer: matches,
      correctAnswer: currentQ.matchingPairs,
      isCorrect: isCorrect,
      type: currentQ.type
    };
    setAnswersHistory(prev => [...prev, answerRecord]);
    
    if (isCorrect) {
      game.updateScore(1);
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    if (mode === 'battle') {
      setTimeout(() => {
        setIsProcessing(false);
        handleNextQuestion();
      }, MATCHING_REVIEW_DURATION_BATTLE);
    } else {
      setIsProcessing(false);
    }
  };

  const handleNextQuestion = () => {
    setIsProcessing(false);
    timeoutHandledRef.current = false;

    if (game.currentQuestionIndex < questions.length - 1) {
      game.nextQuestion();
      resetTimer(30);
    } else {
      finishQuiz();
    }
  };

  const handleManualNext = () => {
    handleNextQuestion();
  };

  const getCorrectAnswerDisplay = (question) => {
    if (question.type === 'Multiple Choice' || question.type === 'True/False') {
      return question.correctAnswer;
    } else if (question.type === 'Fill in the blanks') {
      return question.answer;
    } else if (question.type === 'Matching') {
      return question.matchingPairs;
    }
    return '';
  };

  const finishQuiz = () => {
    // Normal finish with existing answers
    const results = {
      ...game.getResults(),
      quizTitle: quiz.title,
      answers: answersHistory
    };
    
    if (mode === 'battle') {
      results.players = allPlayers.map(player => 
        player.name === 'You' 
          ? { ...player, score: game.scoreRef.current } 
          : player
      );
      results.winner = results.players.reduce((prev, current) => 
        prev.score > current.score ? prev : current
      );
    }
    
    onComplete(results);
  };

  if (!currentQ) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-black mb-4">No questions available</h2>
          <button onClick={onBack} className="bg-black text-white px-6 py-3 rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <QuizGameHeader
        quiz={quiz}
        currentQuestion={game.currentQuestionIndex}
        totalQuestions={questions.length}
        timeLeft={timeLeft}
        displayScore={game.displayScore}
        mode={mode}
        playersCount={allPlayers.length}
        onBack={onBack}
      />

      <div className="max-w-7xl mx-auto p-6">
        <div className={`${mode === 'battle' ? 'grid grid-cols-1 lg:grid-cols-4 gap-6' : ''}`}>
          <div className={mode === 'battle' ? 'lg:col-span-3' : ''}>
            <QuizQuestion
              question={currentQ}
              selectedAnswer={game.selectedAnswer}
              userAnswer={game.userAnswer}
              userMatches={game.userMatches}
              isMatchingSubmitted={game.isMatchingSubmitted}
              mode={mode}
              onAnswerSelect={handleAnswerSelect}
              onFillInAnswer={handleFillInAnswer}
              onMatchingSubmit={handleMatchingSubmit}
              onUserAnswerChange={game.setUserAnswer}
              onNextQuestion={handleManualNext}
              timeLeft={timeLeft}
              isPaused={game.isPaused || isProcessing}
              isAnswerCorrect={game.isAnswerCorrect}
            />

            {currentQ.type === 'Matching' && game.isMatchingSubmitted && mode === 'solo' && (
              <div className="text-center mt-6">
                <button
                  onClick={handleManualNext}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                >
                  Next Question →
                </button>
              </div>
            )}
            
            {currentQ.type === 'Matching' && game.isMatchingSubmitted && mode === 'battle' && (
              <div className="text-center mt-6">
                <p className="text-sm text-gray-600 animate-pulse">
                  Next question in a moment...
                </p>
              </div>
            )}
          </div>
          
          {mode === 'battle' && (
            <div className="lg:col-span-1">
              <LiveLeaderboard players={allPlayers} currentPlayerName="You" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizGame;