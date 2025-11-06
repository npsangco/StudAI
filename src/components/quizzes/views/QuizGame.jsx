import React, { useState, useEffect, useRef } from 'react';
import { useQuizGame } from '../hooks/useQuizGame';
import { useQuizTimer } from '../hooks/useQuizTimer';
import { QuizGameHeader } from '../QuizGameHeader';
import { QuizQuestion } from '../QuizCore';
import { useSimulatedPlayers } from '../QuizSimulation';
import { LiveLeaderboard } from './QuizLiveLeaderboard';
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
    let newAnswersHistory = answersHistory;
    if (currentQ) {
      const answerRecord = {
        question: currentQ.question,
        userAnswer: '(No answer - time ran out)',
        correctAnswer: getCorrectAnswerDisplay(currentQ),
        isCorrect: false,
        type: currentQ.type
      };
      newAnswersHistory = [...answersHistory, answerRecord];
      setAnswersHistory(newAnswersHistory);
    }
    
    game.isProcessingRef.current = true;
    
    // Move to next question or finish
    setTimeout(() => {
      if (game.currentQuestionIndex < questions.length - 1) {
        game.nextQuestion();
        resetTimer(30);
        timeoutHandledRef.current = false;
        game.isProcessingRef.current = false;
      } else {
        // Last question - finish quiz with updated answers
        finishQuizWithAnswers(newAnswersHistory);
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
    const newAnswersHistory = [...answersHistory, answerRecord];
    setAnswersHistory(newAnswersHistory);

    if (isCorrect) {
      game.updateScore(1);
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      // Check if last question
      if (game.currentQuestionIndex >= questions.length - 1) {
        finishQuizWithAnswers(newAnswersHistory);
      } else {
        handleNextQuestion();
      }
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
    const newAnswersHistory = [...answersHistory, answerRecord];
    setAnswersHistory(newAnswersHistory);
    
    game.setUserAnswer(actualAnswer + '_submitted');
    
    if (isCorrect) {
      game.updateScore(1);
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      // Check if last question
      if (game.currentQuestionIndex >= questions.length - 1) {
        finishQuizWithAnswers(newAnswersHistory);
      } else {
        handleNextQuestion();
      }
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
    const newAnswersHistory = [...answersHistory, answerRecord];
    setAnswersHistory(newAnswersHistory);
    
    if (isCorrect) {
      game.updateScore(1);
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    // Battle mode: auto-proceed after delay
    if (mode === 'battle') {
      setTimeout(() => {
        setIsProcessing(false);
        // Check if last question
        if (game.currentQuestionIndex >= questions.length - 1) {
          finishQuizWithAnswers(newAnswersHistory);
        } else {
          handleNextQuestion();
        }
      }, MATCHING_REVIEW_DURATION_BATTLE);
    } else {
      // Solo mode: just unlock UI, wait for manual next
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
    // For solo matching, capture current answers before proceeding
    if (currentQ.type === 'Matching' && game.isMatchingSubmitted) {
      // Check if last question
      if (game.currentQuestionIndex >= questions.length - 1) {
        finishQuizWithAnswers(answersHistory);
      } else {
        handleNextQuestion();
      }
    } else {
      handleNextQuestion();
    }
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

  const finishQuizWithAnswers = (finalAnswers) => {
    console.log('🏁 Finishing quiz with answers:', finalAnswers); // Debug log
    const results = {
      ...game.getResults(),
      quizTitle: quiz.title,
      answers: finalAnswers
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

  const finishQuiz = () => {
    finishQuizWithAnswers(answersHistory);
  };

  const [leaderboardMode, setLeaderboardMode] = useState('desktop');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setLeaderboardMode('mobile');
      } else if (width < 1024) {
        setLeaderboardMode('tablet');
      } else {
        setLeaderboardMode('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Yellow Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 -z-10" />
      
      {/* Animated background shapes*/}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-10 left-5 w-20 h-20 sm:w-32 sm:h-32 bg-white/10 rounded-full blur-2xl sm:blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-5 w-24 h-24 sm:w-48 sm:h-48 bg-black/10 rounded-full blur-2xl sm:blur-3xl animate-pulse" style={{ animationDelay: '700ms' }} />
      </div>

      {/* Header stays the same */}
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

      {/* MAIN CONTENT - Responsive Layout */}
      {mode === 'battle' ? (
        // BATTLE MODE - Responsive leaderboard
        <>
          {leaderboardMode === 'desktop' ? (
            // Desktop: Side-by-side
            <div className="flex gap-4 max-w-[1800px] mx-auto p-4">
              <div className="flex-1 overflow-y-auto px-2 sm:px-4">
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
              </div>
              
              <div className="w-80 h-screen sticky top-20">
                <LiveLeaderboard 
                  players={allPlayers} 
                  currentPlayerName="You"
                  mode="desktop"
                />
              </div>
            </div>
          ) : leaderboardMode === 'tablet' ? (
            // Tablet: Bottom slide panel
            <div className="relative pb-24 px-4">
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
              
              <div className="fixed bottom-0 left-0 right-0 z-30">
                <LiveLeaderboard 
                  players={allPlayers} 
                  currentPlayerName="You"
                  mode="tablet"
                />
              </div>
            </div>
          ) : (
            // Mobile: Floating mini
            <>
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
              
              <LiveLeaderboard 
                players={allPlayers} 
                currentPlayerName="You"
                mode="mobile"
              />
            </>
          )}
          
          {/* Battle mode next buttons */}
          {currentQ.type === 'Matching' && game.isMatchingSubmitted && (
            <div className="text-center mt-6 pb-6">
              <p className="text-sm text-white/80 animate-pulse">
                Next question in a moment...
              </p>
            </div>
          )}
        </>
      ) : (
        // SOLO MODE - No leaderboard
        <div className="max-w-4xl mx-auto p-4">
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
          
          {/* Solo mode next button for matching */}
          {currentQ.type === 'Matching' && game.isMatchingSubmitted && (
            <div className="text-center mt-6">
              <button
                onClick={handleManualNext}
                className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
              >
                Next Question →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default QuizGame;