import React, { useState, useEffect, useRef } from 'react';
import { useQuizGame } from '../hooks/useQuizGame';
import { useQuizTimer } from '../hooks/useQuizTimer';
import { QuizGameHeader } from '../QuizGameHeader';
import { QuizQuestion } from '../QuizCore';
import { LiveLeaderboard } from './QuizLiveLeaderboard';
import { ANSWER_DISPLAY_DURATION, MATCHING_REVIEW_DURATION_BATTLE } from '../utils/constants';
import { listenToPlayers, updatePlayerScore, updatePlayerProgress } from '../../../firebase/battleOperations';
import { ref, update, get } from 'firebase/database';
import { realtimeDb } from '../../../firebase/config';
import { useReconnection } from '../hooks/useReconnection';
import { ReconnectionModal } from './ReconnectionModal';
import { QuizBackgroundPattern } from '../utils/QuizPatterns';
import { 
  sortQuestionsByDifficulty, 
  calculateTotalScore, 
  getMaxScore,
  getPointsForDifficulty,
  getDifficultyDisplay 
} from '../utils/adaptiveDifficultyManager';

const QuizGame = ({ 
  quiz, 
  mode = 'solo', 
  onBack, 
  onComplete,
  onPlayerScoreUpdate 
}) => {
  // ADAPTIVE DIFFICULTY: Sort questions by difficulty in SOLO mode only
  const rawQuestions = quiz?.questions || [];
  const questions = mode === 'solo' 
    ? sortQuestionsByDifficulty(rawQuestions)
    : rawQuestions;
  
  console.log(`🎮 ${mode.toUpperCase()} MODE:`, 
    mode === 'solo' ? 'Questions sorted Easy→Medium→Hard' : 'Original order'
  );
  
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

  // 🔥 AUTO-ADVANCE TIMER: Proceed automatically after timeout even if not all players answered
  const waitingTimeoutRef = useRef(null);
  
  // Listen to players who have answered (battle mode only)
  useEffect(() => {
    if (mode !== 'battle' || !quiz?.gamePin || !isWaitingForPlayers) {
      // Clear timeout if no longer waiting
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      return;
    }
    
    // 🔥 SET AUTO-ADVANCE TIMEOUT (5 seconds after waiting starts)
    // This ensures game continues even if disconnected players haven't answered
    if (!waitingTimeoutRef.current) {
      console.log('⏱️ Auto-advance timer started (5s)');
      waitingTimeoutRef.current = setTimeout(() => {
        console.log('⏰ TIMEOUT! Auto-advancing to next question...');
        setIsWaitingForPlayers(false);
        
        if (game.currentQuestionIndex >= questions.length - 1) {
          finishQuizWithAnswers(answersHistory);
        } else {
          handleNextQuestion();
        }
      }, 5000); // 5 seconds timeout
    }
    
    const unsubscribe = listenToPlayers(quiz.gamePin, (firebasePlayers) => {
      // ✅ FILTER OUT FORFEITED AND OFFLINE PLAYERS - only count ACTIVE & ONLINE players
      const activePlayers = firebasePlayers.filter(p => !p.forfeited && p.isOnline !== false);
      
      // Count how many ACTIVE players have progressed past current question
      const playersOnNextQuestion = activePlayers.filter(
        player => (player.currentQuestion || 0) >= game.currentQuestionIndex + 1
      ).length;
      
      const totalActivePlayers = activePlayers.length;
      
      console.log(`📊 Progress: ${playersOnNextQuestion}/${totalActivePlayers} ACTIVE players answered Q${game.currentQuestionIndex + 1}`);
      console.log(`⚠️ Forfeited/Offline players: ${firebasePlayers.length - activePlayers.length}`);
      
      // Update the count for UI (only active players)
      setPlayersWhoAnswered(new Set(
        activePlayers
          .filter(p => (p.currentQuestion || 0) >= game.currentQuestionIndex + 1)
          .map(p => p.userId)
      ));
      
      // ✅ Check if ALL ACTIVE ONLINE players answered (ignoring forfeited/offline)
      if (playersOnNextQuestion === totalActivePlayers && totalActivePlayers > 0) {
        console.log('✅ All ACTIVE players answered! Proceeding to next question in 2s...');
        
        // Clear the auto-advance timeout since everyone answered
        if (waitingTimeoutRef.current) {
          clearTimeout(waitingTimeoutRef.current);
          waitingTimeoutRef.current = null;
        }
        
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
    
    return () => {
      unsubscribe();
      // Clean up timeout
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
    };
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
            score: p.score || 0,
            forfeited: p.forfeited || false // Include forfeit status
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
      
      // 1. Restore score
      if (result.playerData.score !== undefined) {
        game.scoreRef.current = result.playerData.score;
      }
      
      // 2. Check current question of OTHER players (not disconnected player)
      if (mode === 'battle' && quiz?.gamePin) {
        try {
          const battleRef = ref(realtimeDb, `battles/${quiz.gamePin}/players`);
          const snapshot = await get(battleRef);
          
          if (snapshot.exists()) {
            const playersData = snapshot.val();
            const allPlayers = Object.values(playersData);
            
            console.log('👥 All players in battle:', allPlayers.map(p => ({
              userId: p.userId,
              name: p.name,
              currentQuestion: p.currentQuestion,
              isOnline: p.isOnline
            })));
            
            // Find the MAXIMUM currentQuestion among OTHER active players
            // Note: userId in Firebase might be stored with or without 'user_' prefix
            const activePlayersQuestions = allPlayers
              .filter(p => {
                // Check both with and without prefix
                const pUserId = String(p.userId);
                const currentUserId = String(quiz.currentUserId);
                const isNotSelf = pUserId !== currentUserId && 
                                 pUserId !== `user_${currentUserId}` &&
                                 `user_${pUserId}` !== currentUserId;
                const isOnline = p.isOnline !== false; // Treat undefined as online
                
                console.log('🔍 Player filter:', {
                  playerUserId: pUserId,
                  currentUserId: currentUserId,
                  isNotSelf,
                  isOnline,
                  included: isNotSelf && isOnline
                });
                
                return isNotSelf && isOnline;
              })
              .map(p => p.currentQuestion || 0);
            
            console.log('🔍 Active other players questions:', activePlayersQuestions);
            console.log('🔍 My saved question:', result.playerData.currentQuestion);
            
            if (activePlayersQuestions.length > 0) {
              const maxCurrentQuestion = Math.max(...activePlayersQuestions);
              console.log('🔍 Maximum question reached by others:', maxCurrentQuestion);
              
              // Jump to where other players are (catch up to the furthest player)
              const targetQuestion = maxCurrentQuestion;
              
              if (targetQuestion >= 0 && targetQuestion < questions.length) {
                console.log(`🚀 JUMPING to question index ${targetQuestion} (question #${targetQuestion + 1}) to catch up with other players`);
                
                // ✅ USE SETTER to trigger re-render!
                game.setCurrentQuestionIndex(targetQuestion);
                
                // Update in Firebase too
                await updatePlayerProgress(quiz.gamePin, quiz.currentUserId, targetQuestion);
                
                // Reset timer for this question
                resetTimer(30);
              } else if (targetQuestion >= questions.length) {
                console.log('⚠️ Other players finished, using saved progress');
                const savedQuestion = result.playerData.currentQuestion || 0;
                game.setCurrentQuestionIndex(Math.min(savedQuestion, questions.length - 1));
              }
            } else {
              // No other active players online, use SAVED progress (not question 0!)
              const savedQuestion = result.playerData.currentQuestion || 0;
              console.log(`⚠️ No other active players found, using SAVED progress: question ${savedQuestion}`);
              game.setCurrentQuestionIndex(Math.min(savedQuestion, questions.length - 1));
            }
          } else {
            // Battle doesn't exist, use saved progress
            const savedQuestion = result.playerData.currentQuestion || 0;
            console.log(`⚠️ Battle data not found, using SAVED progress: question ${savedQuestion}`);
            game.setCurrentQuestionIndex(Math.min(savedQuestion, questions.length - 1));
          }
        } catch (error) {
          console.error('❌ Error checking other players progress:', error);
          // Fallback to SAVED progress (not question 0!)
          const savedQuestion = result.playerData.currentQuestion || 0;
          console.log(`⚠️ Fallback: Using SAVED progress: question ${savedQuestion}`);
          game.setCurrentQuestionIndex(Math.min(savedQuestion, questions.length - 1));
        }
      }
      
      // 3. Resume game
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
  // FORFEIT BATTLE HANDLER
  // ============================================
  
  const handleBackOrForfeit = async () => {
    // Solo mode: just go back normally
    if (mode === 'solo') {
      onBack();
      return;
    }
    
    // Battle mode: forfeit with score reset
    console.log('🏁 Player forfeiting battle...');
    
    if (mode === 'battle' && quiz?.gamePin && quiz?.currentUserId) {
      try {
        // 1. Set score to 0 in Firebase
        await updatePlayerScore(quiz.gamePin, quiz.currentUserId, 0);
        console.log('✅ Score set to 0');
        
        // 2. Mark as forfeited
        const playerRef = ref(realtimeDb, `battles/${quiz.gamePin}/players/user_${quiz.currentUserId}`);
        await update(playerRef, {
          forfeited: true,
          forfeitedAt: Date.now(),
          isOnline: false
        });
        console.log('✅ Player marked as forfeited');
        
        // 3. Cleanup connection tracking
        await reconnection.disconnect();
        console.log('✅ Connection cleaned up');
        
      } catch (error) {
        console.error('❌ Error during forfeit:', error);
      }
    }
    
    // 4. Call onBack to return to previous screen
    onBack();
  };

  // ============================================
  // CLEANUP ON UNMOUNT & BROWSER CLOSE
  // ============================================

  useEffect(() => {
    // Track if this is an intentional exit
    let isIntentionalExit = false;
    
    // Handle browser close/refresh (X button)
    const handleBeforeUnload = (e) => {
      if (mode === 'battle' && quiz?.gamePin && quiz?.currentUserId) {
        console.log('⚠️ Browser closing/refreshing');
        
        // DON'T delete player data - just mark as disconnected
        // This allows reconnection to work!
        const connectionUrl = `https://studai-quiz-battles-default-rtdb.asia-southeast1.firebasedatabase.app/battles/${quiz.gamePin}/connections/user_${quiz.currentUserId}.json`;
        
        // Mark as disconnected but keep player data intact
        const disconnectData = {
          userId: quiz.currentUserId,
          isOnline: false,
          disconnectedAt: Date.now(),
          reason: 'beforeunload'
        };
        
        // Use sendBeacon for reliable delivery
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(disconnectData)], { type: 'application/json' });
          navigator.sendBeacon(connectionUrl, blob);
          console.log('📡 Sent disconnect beacon (keeping player data for reconnection)');
        } else {
          // Fallback: synchronous XHR
          try {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', connectionUrl, false); // synchronous PUT
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(disconnectData));
            console.log('📡 Sent disconnect XHR');
          } catch (err) {
            console.error('❌ Failed to send disconnect:', err);
          }
        }
        
        // Also mark player as offline in players node
        const playerOnlineUrl = `https://studai-quiz-battles-default-rtdb.asia-southeast1.firebasedatabase.app/battles/${quiz.gamePin}/players/user_${quiz.currentUserId}/isOnline.json`;
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(false)], { type: 'application/json' });
          navigator.sendBeacon(playerOnlineUrl, blob);
        }
      }
    };

    // Add event listener for browser close
    if (mode === 'battle') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    // Cleanup on unmount (when user intentionally exits via button)
    return () => {
      if (mode === 'battle') {
        console.log('🧹 QuizGame unmounting - cleaning up connection');
        window.removeEventListener('beforeunload', handleBeforeUnload);
        
        // Check if this is an intentional exit from the app (via onBack/onComplete)
        // If yes, fully cleanup. If no, it's likely a navigation/refresh
        // The reconnection.disconnect() will handle proper cleanup
        reconnection.disconnect();
      }
    };
  }, [mode, quiz?.gamePin, quiz?.currentUserId]);

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
      // ADAPTIVE SCORING: Award points based on difficulty
      const points = mode === 'solo' 
        ? getPointsForDifficulty(currentQ.difficulty)
        : 1; // Battle mode: flat 1 point per question
      
      game.updateScore(points);
      
      // Update score in Firebase for real-time leaderboard
      if (mode === 'battle' && quiz?.gamePin) {
        const newScore = game.scoreRef.current; // Already updated above with correct points
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
      // ADAPTIVE SCORING: Award points based on difficulty
      const points = mode === 'solo' 
        ? getPointsForDifficulty(currentQ.difficulty)
        : 1; // Battle mode: flat 1 point per question
      
      game.updateScore(points);
      
      // Update score in Firebase
      if (mode === 'battle' && quiz?.gamePin) {
        const newScore = game.scoreRef.current; // Already updated above with correct points
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
      // ADAPTIVE SCORING: Award points based on difficulty
      const points = mode === 'solo' 
        ? getPointsForDifficulty(currentQ.difficulty)
        : 1; // Battle mode: flat 1 point per question
      
      game.updateScore(points);
      
      // 🔥 Update score in Firebase
      if (mode === 'battle' && quiz?.gamePin) {
        const newScore = game.scoreRef.current; // Already updated above with correct points
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
      questions: questions, // Pass questions for difficulty breakdown
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
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-black mb-4">No questions available</h2>
          <button onClick={onBack} className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors">
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600">
      {/* DYNAMIC PATTERNS based on question type */}
      <QuizBackgroundPattern questionType={currentQ?.type} />

      {/* Header */}
      <QuizGameHeader
        quiz={quiz}
        currentQuestion={game.currentQuestionIndex}
        totalQuestions={questions.length}
        timeLeft={timeLeft}
        displayScore={game.displayScore}
        mode={mode}
        playersCount={allPlayers.length}
        onBack={handleBackOrForfeit}
        currentQuestionData={currentQ}
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
              {playersWhoAnswered.size}/{allPlayers.filter(p => !p.forfeited).length} players answered
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
