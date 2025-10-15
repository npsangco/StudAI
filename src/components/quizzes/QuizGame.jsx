import React, { useState, useEffect } from 'react';
import { useQuizCore, QuizQuestion } from './QuizCore';
import { QuizGameHeader } from './QuizGameHeader';
import { LiveLeaderboard, useSimulatedPlayers } from './QuizSimulation';

const QuizGame = ({ 
  quiz, 
  mode = 'solo', 
  onBack, 
  onComplete,
  onPlayerScoreUpdate 
}) => {
  const questions = quiz?.questions || [];
  const [isProcessing, setIsProcessing] = useState(false);
  
  const {
    currentQuestion,
    selectedAnswer,
    userAnswer,
    userMatches,
    isMatchingSubmitted, 
    timeLeft,
    isPaused,
    displayScore,
    score,
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
    getTimeSpent
  } = useQuizCore(questions, mode, 30);

  // Simulated players for battle mode (remove when adding database)
  const simulatedPlayers = useSimulatedPlayers(questions.length, currentQuestion);
  const [userPlayer] = useState({ id: 'user', name: 'You', initial: 'Y', score: 0 });
  
  // Combine user with simulated players for battle mode
  const allPlayers = mode === 'battle' ? [
    { ...userPlayer, score: score },
    ...simulatedPlayers
  ] : [];

  const currentQ = questions[currentQuestion];

  // Sync local isProcessing with the ref
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing, isProcessingRef]);

  // Handle auto-complete immediately when time runs out on last question
  useEffect(() => {
    const hasAnswer = selectedAnswer || 
                      userAnswer?.includes('_submitted') || 
                      isMatchingSubmitted;
    
    if (timeLeft === 0 && !hasAnswer && currentQuestion === questions.length - 1 && !isProcessing) {
      // Last question and time ran out - finish the quiz immediately
      finishQuiz();
    }
  }, [timeLeft, currentQuestion, questions.length, selectedAnswer, userAnswer, isMatchingSubmitted, isProcessing]);

  const handleAnswerSelect = (answer) => {
    if (selectedAnswer || isPaused || isProcessing) return;
    
    setIsProcessing(true);
    setSelectedAnswer(answer);
    
    const isCorrect = isAnswerCorrect(currentQ, answer);
    if (isCorrect) {
      updateScore(1);
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      handleNextQuestion();
    }, 2000);
  };

  const handleFillInAnswer = () => {
    if (!userAnswer?.trim() || userAnswer.includes('_submitted') || isPaused || isProcessing) return;
    
    setIsProcessing(true);
    const actualAnswer = userAnswer.trim();
    const isCorrect = isAnswerCorrect(currentQ, actualAnswer);
    
    setUserAnswer(actualAnswer + '_submitted');
    
    if (isCorrect) {
      updateScore(1);
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      handleNextQuestion();
    }, 2000);
  };

  const handleMatchingSubmit = (matches) => {
    if (isPaused || isProcessing) return;
    
    setIsProcessing(true);
    setUserMatches(matches);
    setIsMatchingSubmitted(true); 
    const isCorrect = isAnswerCorrect(currentQ, matches);
    
    if (isCorrect) {
      updateScore(1);
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      handleNextQuestion();
    }, 2000);
  };

  const handleNextQuestion = () => {
    setIsProcessing(false);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer('');
      setUserAnswer('');
      setUserMatches([]);
      setIsMatchingSubmitted(false);
      setTimeLeft(30);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    const results = {
      score: scoreRef.current, 
      totalQuestions: questions.length,
      timeSpent: getTimeSpent(),
      quizTitle: quiz.title
    };
    
    if (mode === 'battle') {
      results.players = allPlayers.map(player => 
        player.name === 'You' 
          ? { ...player, score: scoreRef.current } 
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
      {/* Header */}
      <QuizGameHeader
        quiz={quiz}
        currentQuestion={currentQuestion}
        totalQuestions={questions.length}
        timeLeft={timeLeft}
        displayScore={displayScore}
        mode={mode}
        playersCount={allPlayers.length}
        onBack={onBack}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className={`${mode === 'battle' ? 'grid grid-cols-1 lg:grid-cols-4 gap-6' : ''}`}>
          {/* Quiz Question */}
          <div className={mode === 'battle' ? 'lg:col-span-3' : ''}>
            <QuizQuestion
              question={currentQ}
              selectedAnswer={selectedAnswer}
              userAnswer={userAnswer}
              userMatches={userMatches}
              isMatchingSubmitted={isMatchingSubmitted} 
              onAnswerSelect={handleAnswerSelect}
              onFillInAnswer={handleFillInAnswer}
              onMatchingSubmit={handleMatchingSubmit}
              onUserAnswerChange={setUserAnswer}
              timeLeft={timeLeft}
              isPaused={isPaused || isProcessing}
              isAnswerCorrect={isAnswerCorrect}
            />
          </div>
          
          {/* Live Leaderboard (Battle Mode Only) */}
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