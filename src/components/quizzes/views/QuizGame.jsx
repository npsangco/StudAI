import React, { useState, useEffect, useRef } from 'react';
import { useQuizGame } from '../hooks/useQuizGame';
import { useQuizTimer } from '../hooks/useQuizTimer';
import { QuizGameHeader } from '../QuizGameHeader';
import { QuizQuestion } from '../QuizCore';
import { LiveLeaderboard } from './QuizLiveLeaderboard';
import { ANSWER_DISPLAY_DURATION, MATCHING_REVIEW_DURATION_BATTLE } from '../utils/constants';
import { listenToPlayers, updatePlayerScore, updatePlayerProgress } from '../../../firebase/battleOperations';
import { useReconnection } from '../hooks/useReconnection';
import { ReconnectionModal } from './ReconnectionModal';

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
  const [userPlayer] = useState({ id: 'user', name: 'You', initial: 'Y', score: 0 });

  // GET REAL PLAYERS from props
  const [realPlayers, setRealPlayers] = useState([]);

  // Track if waiting for other players
  const [isWaitingForPlayers, setIsWaitingForPlayers] = useState(false);
  const [playersWhoAnswered, setPlayersWhoAnswered] = useState(new Set());

  // Listen to players who have answered (battle mode only)
  useEffect(() => {
    if (mode !== 'battle' || !quiz?.gamePin || !isWaitingForPlayers) return;
    
    const unsubscribe = listenToPlayers(quiz.gamePin, (firebasePlayers) => {
      // Count how many players have progressed past current question
      const playersOnNextQuestion = firebasePlayers.filter(
        player => (player.currentQuestion || 0) >= game.currentQuestionIndex + 1
      ).length;
      
      const totalPlayers = firebasePlayers.length;
      
      console.log(`📊 Progress: ${playersOnNextQuestion}/${totalPlayers} players answered Q${game.currentQuestionIndex + 1}`);
      
      // Update the count for UI
      setPlayersWhoAnswered(new Set(
        firebasePlayers
          .filter(p => (p.currentQuestion || 0) >= game.currentQuestionIndex + 1)
          .map(p => p.userId)
      ));
      
      // If all players answered, proceed automatically
      if (playersOnNextQuestion === totalPlayers && totalPlayers > 0) {
        console.log('✅ All players answered! Proceeding to next question in 2s...');
        
        setTimeout(() => {
          setIsWaitingForPlayers(false);
          
          if (game.currentQuestionIndex >= questions.length - 1) {
            finishQuizWithAnswers(answersHistory);
          } else {
            handleNextQuestion();
          }
        }, 2000); // 2 second delay before advancing together
      }
    });
    
    return () => unsubscribe();
  }, [mode, quiz?.gamePin, game.currentQuestionIndex, isWaitingForPlayers]);

  // Listen to real players in battle mode
  useEffect(() => {
    if (mode === 'battle' && quiz?.gamePin) {
      console.log('👂 QuizGame: Listening to players for leaderboard...');
      
      const unsubscribe = listenToPlayers(quiz.gamePin, (firebasePlayers) => {
        // Transform and sort by score
        const players = firebasePlayers
          .map(p => ({
            id: p.userId,
            name: p.name,
            initial: p.initial,
            score: p.score || 0
          }))
          .sort((a, b) => b.score - a.score);
        
        console.log('📊 Leaderboard updated:', players);
        setRealPlayers(players);
      });
      
      return () => unsubscribe();
    }
  }, [mode, quiz?.gamePin]);

  const allPlayers = mode === 'battle' ? realPlayers : [];

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

  // ============================================
  // RECONNECTION HOOK
  // ============================================
  
  const reconnection = useReconnection(
    quiz?.gamePin,
    quiz?.currentUserId,
    { name: 'You', userId: quiz?.currentUserId },
    mode === 'battle' // Only active in battle mode
  );
  
  // ENSURE GAME STARTS UNPAUSED
  useEffect(() => {
    if (mode === 'battle') {
      // On initial mount, ensure game is NOT paused
      game.setIsPaused(false);
      console.log('✅ Battle game initialized - starting unpaused');
    }
  }, []); // Empty dependency array = runs once on mount

  // ============================================
  // RECONNECTION HANDLERS 
  // ============================================
  
  const handleReconnection = async () => {
    console.log('🔄 Handling reconnection...');
    const result = await reconnection.attemptReconnection();
    
    if (result.success) {
      console.log('✅ Reconnected! Restoring state:', result.playerData);
      
      // Use proper game state setters
      if (result.playerData.score !== undefined) {
        game.scoreRef.current = result.playerData.score;
        // Force re-render by updating a dummy state if needed
      }
      
      // Jump to correct question if provided
      if (result.playerData.currentQuestion !== undefined) {
        // The game hook should handle this, or we manually set it
        const targetIndex = result.playerData.currentQuestion;
        if (targetIndex < questions.length) {
          game.currentQuestionIndex = targetIndex;
        }
      }
      
      // Resume game
      game.setIsPaused(false);
      
      return result;
    } else {
      console.error('❌ Reconnection failed:', result.error);
      return result;
    }
  };
  
  const handleGiveUpReconnection = () => {
    console.log('👋 User gave up on reconnection');
    reconnection.disconnect();
    onBack();
  };
  
  // ============================================
  // HANDLE DISCONNECTION DURING GAME
  // ============================================
  
  useEffect(() => {
    if (mode === 'battle') {
      // Only pause if explicitly disconnected (reconnectionAvailable = true)
      if (reconnection.connectionState.reconnectionAvailable) {
        game.setIsPaused(true);
        console.log('⚠️ Connection lost - game paused');
      } else if (!reconnection.connectionState.reconnectionAvailable && !reconnection.connectionState.isReconnecting) {
        // Unpause when connection is stable (not reconnecting, no reconnection needed)
        game.setIsPaused(false);
        console.log('✅ Connection stable - game running');
      }
    }
  }, [reconnection.connectionState.reconnectionAvailable, reconnection.connectionState.isReconnecting, mode]);

  // ============================================
  // CLEANUP ON UNMOUNT
  // ============================================

  useEffect(() => {
    return () => {
      if (mode === 'battle') {
        console.log('🧹 QuizGame unmounting - cleaning up connection');
        reconnection.disconnect();
      }
    };
  }, [mode]);

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
    
    // Mark progress in Firebase even on timeout (battle mode)
    if (mode === 'battle' && quiz?.gamePin) {
      updatePlayerProgress(quiz.gamePin, quiz.currentUserId, game.currentQuestionIndex + 1)
        .then(() => {
          console.log('✅ Timeout: Progress marked in Firebase');
          setIsWaitingForPlayers(true); // Show waiting message
        })
        .catch(err => console.error('Failed to update progress on timeout:', err));
    }
    
    game.isProcessingRef.current = true;
    
    // Solo mode: Move immediately
    if (mode === 'solo') {
      setTimeout(() => {
        if (game.currentQuestionIndex < questions.length - 1) {
          game.nextQuestion();
          resetTimer(30);
          timeoutHandledRef.current = false;
          game.isProcessingRef.current = false;
        } else {
          finishQuizWithAnswers(newAnswersHistory);
        }
      }, 100);
    }
    // Battle mode: Wait for all players (handled by useEffect)
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
      
      // Update score in Firebase for real-time leaderboard
      if (mode === 'battle' && quiz?.gamePin) {
        const newScore = game.scoreRef.current + 1;
        updatePlayerScore(quiz.gamePin, quiz.currentUserId, newScore)
          .catch(err => console.error('Failed to update score:', err));
      }
      
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    // Update progress in Firebase (battle mode)
    if (mode === 'battle' && quiz?.gamePin) {
      updatePlayerProgress(quiz.gamePin, quiz.currentUserId, game.currentQuestionIndex + 1)
        .catch(err => console.error('Failed to update progress:', err));
      
      // Show waiting message
      setIsWaitingForPlayers(true);
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      
      // Solo mode: advance immediately after showing answer
      if (mode === 'solo') {
        if (game.currentQuestionIndex >= questions.length - 1) {
          finishQuizWithAnswers(newAnswersHistory);
        } else {
          handleNextQuestion();
        }
      }
      // Battle mode: wait for all players (handled by useEffect)
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
      
      // Update score in Firebase
      if (mode === 'battle' && quiz?.gamePin) {
        const newScore = game.scoreRef.current + 1;
        updatePlayerScore(quiz.gamePin, quiz.currentUserId, newScore)
          .catch(err => console.error('Failed to update score:', err));
      }
      
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    // Update progress in Firebase (battle mode)
    if (mode === 'battle' && quiz?.gamePin) {
      updatePlayerProgress(quiz.gamePin, quiz.currentUserId, game.currentQuestionIndex + 1)
        .catch(err => console.error('Failed to update progress:', err));
      
      // Show waiting message
      setIsWaitingForPlayers(true);
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      
      // Solo mode: advance immediately after showing answer
      if (mode === 'solo') {
        if (game.currentQuestionIndex >= questions.length - 1) {
          finishQuizWithAnswers(newAnswersHistory);
        } else {
          handleNextQuestion();
        }
      }
      // Battle mode: wait for all players (handled by useEffect)
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
      
      // 🔥 Update score in Firebase
      if (mode === 'battle' && quiz?.gamePin) {
        const newScore = game.scoreRef.current + 1;
        updatePlayerScore(quiz.gamePin, quiz.currentUserId, newScore)
          .catch(err => console.error('Failed to update score:', err));
      }
      
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }
    
    // Update progress in Firebase (battle mode)
    if (mode === 'battle' && quiz?.gamePin) {
      updatePlayerProgress(quiz.gamePin, quiz.currentUserId, game.currentQuestionIndex + 1)
        .catch(err => console.error('Failed to update progress:', err));
    }
    
    // Battle mode: Use longer review time, then wait for players
    if (mode === 'battle') {
      setTimeout(() => {
        setIsProcessing(false);
        // Show waiting message after review period
        setIsWaitingForPlayers(true);
        
        // Wait for all players (handled by useEffect)
      }, MATCHING_REVIEW_DURATION_BATTLE);
    } else {
      // Solo mode: just unlock UI, manual next button appears
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
    console.log('🏁 Finishing quiz with answers:', finalAnswers);
    
    console.log('🔍 DEBUG - quiz.isHost:', quiz?.isHost);
    console.log('🔍 DEBUG - mode:', mode);
    
    const results = {
      ...game.getResults(),
      quizTitle: quiz.title,
      answers: finalAnswers,
      gamePin: quiz?.gamePin,
      isHost: mode === 'battle' ? (quiz?.isHost || false) : false, 
    };
    
    console.log('🔍 DEBUG - results.isHost:', results.isHost);
    
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

      {/* Header */}
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

      {/* Waiting Overlay */}
      {isWaitingForPlayers && mode === 'battle' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-md mx-4">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Waiting for other players...
            </h3>
            <p className="text-gray-600">
              {playersWhoAnswered.size}/{allPlayers.length} players answered
            </p>
          </div>
        </div>
      )}
    
      {/* MAIN CONTENT */}
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

      {/* RECONNECTION MODAL */}
      {mode === 'battle' && (
        <ReconnectionModal
          isOpen={reconnection.connectionState.reconnectionAvailable}
          onReconnect={handleReconnection}
          onGiveUp={handleGiveUpReconnection}
          isReconnecting={reconnection.connectionState.isReconnecting}
          gamePin={quiz?.gamePin}
          playerName="You"
        />
      )}
    </div>
  );
}
export default QuizGame;
