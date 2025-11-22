import { useState, useEffect, useRef } from 'react';
import { useQuizGame } from '../hooks/useQuizGame';
import { useQuizTimer } from '../hooks/useQuizTimer';
import { QuizGameHeader } from '../QuizGameHeader';
import { QuizQuestion } from '../QuizCore';
import { LiveLeaderboard } from './QuizLiveLeaderboard';
import { ANSWER_DISPLAY_DURATION } from '../utils/constants';
import { listenToPlayers, updatePlayerScore, updatePlayerProgress } from '../../../firebase/battleOperations';
import { ref, update, get } from 'firebase/database';
import { realtimeDb } from '../../../firebase/config';
import { useReconnection } from '../hooks/useReconnection';
import { ReconnectionModal } from './ReconnectionModal';
import { QuizBackgroundPattern } from '../utils/QuizPatterns';
import { EmojiPicker } from './EmojiPicker';
import { EmojiReactions } from './EmojiReactions';
import { sendReaction } from '../../../firebase/reactionOperations';
import {
  sortQuestionsByDifficulty,
  getMaxScore,
  getPointsForDifficulty
} from '../utils/adaptiveDifficultyManager';
import {
  canUseAdaptiveMode,
  buildAdaptiveJourney
} from '../utils/adaptiveDifficultyEngine';
import {
  initializeAdaptiveQueue,
  performAdaptiveCheck
} from '../utils/adaptiveQuizManager';
import { AdaptiveFeedback } from '../components/AdaptiveFeedback';
import QuizPetCompanion from '../QuizPetCompanion';

const QuizGame = ({
  quiz,
  mode = 'solo',
  onBack,
  onComplete,
  onPlayerScoreUpdate
}) => {
  console.log('🚀 QuizGame RENDERED:', { mode, hasQuiz: !!quiz, gamePin: quiz?.gamePin });
  
  const rawQuestions = quiz?.questions || [];

  // ADAPTIVE DIFFICULTY: Check if adaptive mode can be used
  const adaptiveCheck = mode === 'solo' ? canUseAdaptiveMode(rawQuestions) : { enabled: false };
  const useAdaptiveMode = adaptiveCheck.enabled;

  // 🔥 Question Bank: Random 10 selection for all modes
  const [questions, setQuestions] = useState(() => {
    const QUESTION_BANK_SIZE = 10;

    // Step 1: Randomly select 10 questions from Question Bank
    const shuffled = [...rawQuestions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, Math.min(QUESTION_BANK_SIZE, shuffled.length));

    // Step 2: Apply mode-specific ordering/logic
    if (useAdaptiveMode) {
      // Solo Adaptive: Initialize adaptive queue with selected 10
      const { orderedQuestions, startingDifficulty} = initializeAdaptiveQueue(selectedQuestions);

      return orderedQuestions;
    }

    if (mode === 'battle') {
      // Battle: Use selected 10 as-is (all players get same random 10)

      return selectedQuestions;
    }

    // Solo Classic: Sort selected 10 by difficulty
    const sorted = sortQuestionsByDifficulty(selectedQuestions);

    return sorted;
  });

  // Adaptive state tracking
  const [adaptiveState, setAdaptiveState] = useState(() => {
    if (mode === 'solo' && useAdaptiveMode) {
      // 🔥 OPTION 1: Get starting difficulty from initialization
      const { startingDifficulty } = initializeAdaptiveQueue(rawQuestions);

      return {
        currentDifficulty: startingDifficulty,
        difficultyHistory: [{
          afterQuestion: 0,
          difficulty: startingDifficulty,
          action: 'INITIAL'
        }]
      };
    }
    return null;
  });
  const [adaptiveFeedbackMessage, setAdaptiveFeedbackMessage] = useState(null);
  const [adaptiveFeedbackAction, setAdaptiveFeedbackAction] = useState(null);
  const isShowingFeedbackRef = useRef(false); // 🔥 Prevent overlapping feedback
  const feedbackTimeoutRef = useRef(null); // 🔥 Track feedback timeout for cleanup

  // 🔥 BULLETPROOF: Cleanup feedback on component unmount
  useEffect(() => {
    return () => {
      // Clear feedback timeout
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      // Force clear feedback state
      setAdaptiveFeedbackMessage(null);
      setAdaptiveFeedbackAction(null);
      isShowingFeedbackRef.current = false;
    };
  }, []);

  const [isProcessing, setIsProcessing] = useState(false);

  // Track all answers for summary
  const [answersHistory, setAnswersHistory] = useState([]);
  const timeoutHandledRef = useRef(false);

  // Track correct answers for accurate accuracy calculation
  // Use ref for synchronous updates to prevent flickering
  const correctAnswersCountRef = useRef(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  
  // Calculate max possible score based on mode
  // Battle: 1 point per question, Solo: adaptive scoring based on difficulty
  // Adaptive mode: Use all raw questions for max score calculation
  const maxPossibleScore = mode === 'battle'
    ? rawQuestions.length
    : (useAdaptiveMode ? getMaxScore(rawQuestions) : getMaxScore(questions));
  
  // Get quiz timer with battle mode enforcement
  // Battle mode: Minimum 15s timer (no "No Limit" allowed for sync)
  // Solo mode: Allow any timer including 0 (No Limit)
  const rawTimer = quiz?.timer_per_question ?? quiz?.timerPerQuestion ?? 30;
  const quizTimer = mode === 'battle'
    ? Math.max(rawTimer, 15) // Enforce minimum 15s for battles
    : rawTimer; // Allow 0 (No Limit) for solo

  if (mode === 'battle' && rawTimer === 0) {

  } else if (mode === 'battle' && rawTimer < 15) {

  }

  const game = useQuizGame(questions, quizTimer);
  const [userPlayer] = useState({ id: 'user', name: 'You', initial: 'Y', score: 0 });

  // GET REAL PLAYERS from props
  const [realPlayers, setRealPlayers] = useState([]);

  // 🎭 EMOJI REACTIONS: Track recent answers for pulse effect
  const [recentAnsweredUsers, setRecentAnsweredUsers] = useState([]);
  const recentAnswersTimeoutRef = useRef(null);

  // 🐾 PET COMPANION: Track when to show pet motivation
  const [showPetMessage, setShowPetMessage] = useState(false);
  const [petAnswerCorrect, setPetAnswerCorrect] = useState(null);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const encouragementTimerRef = useRef(null);

  // 🔒 SUBMISSION MUTEX: Prevent race condition between timer and manual submission
  const submissionLockRef = useRef({ locked: false, timestamp: 0 });

  // 🔒 Helper function to acquire submission lock
  const acquireSubmissionLock = () => {
    const now = Date.now();
    const LOCK_DURATION = 1000; // 1 second lock duration
    
    // Check if lock is currently held
    if (submissionLockRef.current.locked && 
        now - submissionLockRef.current.timestamp < LOCK_DURATION) {
      return false; // Lock denied - someone else is submitting
    }
    
    // Acquire lock
    submissionLockRef.current = { locked: true, timestamp: now };
    return true; // Lock acquired
  };

  // 🔒 Helper function to release submission lock
  const releaseSubmissionLock = () => {
    setTimeout(() => {
      submissionLockRef.current = { locked: false, timestamp: 0 };
    }, 1000); // Auto-release after 1 second
  };

  // 🎭 Listen to player progress for pulse effects only (not for waiting/syncing)
  useEffect(() => {
    if (mode !== 'battle' || !quiz?.gamePin) {
      return;
    }

    const unsubscribe = listenToPlayers(quiz.gamePin, (firebasePlayers) => {
      // Filter active players
      const activePlayers = firebasePlayers.filter(p => !p.forfeited && p.isOnline !== false);

      // Track who just answered for pulse effect
      const answeredPlayerIds = activePlayers
        .filter(p => (p.currentQuestion || 0) >= game.currentQuestionIndex + 1)
        .map(p => p.userId);

      // Find new answers for pulse animation
      const previousAnswered = recentAnsweredUsers;
      const newAnswers = answeredPlayerIds.filter(id => !previousAnswered.includes(id));

      if (newAnswers.length > 0) {
        setRecentAnsweredUsers(newAnswers);

        // Clear pulse effect after 1 second
        if (recentAnswersTimeoutRef.current) {
          clearTimeout(recentAnswersTimeoutRef.current);
        }
        recentAnswersTimeoutRef.current = setTimeout(() => {
          setRecentAnsweredUsers([]);
        }, 1000);
      }
    });

    return () => {
      unsubscribe();
      if (recentAnswersTimeoutRef.current) {
        clearTimeout(recentAnswersTimeoutRef.current);
      }
    };
  }, [mode, quiz?.gamePin, game.currentQuestionIndex, recentAnsweredUsers]);

  // 🐾 Start encouragement timer when question loads (if not answered within 5 seconds)
  useEffect(() => {
    // Clear any existing timer
    if (encouragementTimerRef.current) {
      clearTimeout(encouragementTimerRef.current);
      encouragementTimerRef.current = null;
    }
    
    // Reset encouragement state
    setShowEncouragement(false);
    
    // Start new 5-second timer for encouragement
    encouragementTimerRef.current = setTimeout(() => {
      // Only show if user hasn't answered yet (no pet message showing)
      if (!showPetMessage) {
        setShowEncouragement(true);
      }
    }, 5000);
    
    // Cleanup on unmount or question change
    return () => {
      if (encouragementTimerRef.current) {
        clearTimeout(encouragementTimerRef.current);
        encouragementTimerRef.current = null;
      }
    };
  }, [game.currentQuestionIndex, showPetMessage]);

  // Listen to real players in battle mode
  useEffect(() => {
    if (mode === 'battle' && quiz?.gamePin) {

      const unsubscribe = listenToPlayers(quiz.gamePin, (firebasePlayers) => {
        // Transform and sort by score
        const players = firebasePlayers
          .map(p => {
            console.log('🔍 Player data from Firebase:', {
              name: p.name,
              isOnline: p.isOnline,
              inGracePeriod: p.inGracePeriod,
              forfeited: p.forfeited,
              hasForfeited: p.hasForfeited
            });

            return {
              id: p.userId,
              name: p.name,
              initial: p.initial,
              score: p.score || 0,
              forfeited: p.forfeited || false, // Manual forfeit (back button)
              hasForfeited: p.hasForfeited || false, // Auto forfeit (grace period expired)
              isOnline: p.isOnline !== undefined ? p.isOnline : true, // Connection status
              inGracePeriod: p.inGracePeriod || false, // Grace period status
              currentQuestion: p.currentQuestion || 0 // Player progress
            };
          })
          .sort((a, b) => b.score - a.score);

        console.log('👥 Transformed players:', players);
        setRealPlayers(players);
      });
      
      return () => unsubscribe();
    }
  }, [mode, quiz?.gamePin]);

  const allPlayers = mode === 'battle' ? realPlayers : [];

  const currentQ = game.currentQuestion;

  // Pause timer only when game is paused (disconnection)
  const shouldPauseTimer = game.isPaused;

  const { timeLeft, resetTimer } = useQuizTimer(quizTimer, shouldPauseTimer, () => {
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
  
  console.log('🎮 QuizGame props for reconnection:', {
    mode,
    gamePin: quiz?.gamePin,
    currentUserId: quiz?.currentUserId,
    isActive: mode === 'battle'
  });
  
  const reconnection = useReconnection(
    quiz?.gamePin,
    quiz?.currentUserId,
    { name: 'You', userId: quiz?.currentUserId },
    mode === 'battle', // Only active in battle mode
    {
      score: game.score,
      currentQuestionIndex: game.currentQuestionIndex,
      userAnswers: game.userAnswers,
      answeredQuestions: game.answeredQuestions
    }
  );
  
  // ENSURE GAME STARTS UNPAUSED (unless reconnecting)
  useEffect(() => {
    if (mode === 'battle') {
      // Only unpause if we're NOT in the middle of a reconnection
      if (!reconnection.connectionState.isReconnecting &&
          !reconnection.connectionState.reconnectionAvailable) {
        game.setIsPaused(false);
      }
    }
  }, [mode]); // Only depend on mode, not reconnection state (to avoid loops)

  // ============================================
  // RECONNECTION HANDLERS 
  // ============================================
  
  const handleReconnection = async () => {

    const result = await reconnection.attemptReconnection();

    if (result.success) {

      // 1. Restore score and game state from saved state
      if (result.savedState) {
        // Restore from saved state (preserves exact progress)
        game.scoreRef.current = result.savedState.score;
        game.setCurrentQuestionIndex(result.savedState.currentQuestionIndex);
        game.setUserAnswers(result.savedState.userAnswers || []);
        game.setAnsweredQuestions(result.savedState.answeredQuestions || new Set());
      } else if (result.playerData.score !== undefined) {
        // Fallback to player data from Firebase
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

            // 🔥 FIX: Simplified player filtering - Firebase stores userId as NUMBER, not with 'user_' prefix
            const currentUserIdNum = Number(quiz.currentUserId);
            const activePlayersData = allPlayers.filter(p => {
              const isNotSelf = Number(p.userId) !== currentUserIdNum;
              const isOnline = p.isOnline !== false; // Treat undefined as online
              const notForfeited = p.forfeited !== true;

              return isNotSelf && isOnline && notForfeited;
            });

            // 🔥 STRICT SYNC FIX: Everyone moves together (sabay-sabay)
            // currentQuestion in Firebase = next question index they should answer
            // If currentQuestion = 3, they're ON question index 3 (Q4)

            const activePlayersQuestions = activePlayersData.map(p => p.currentQuestion || 0);


            if (activePlayersData.length > 0) {
              // For STRICT SYNC: Find the MINIMUM currentQuestion (slowest player)
              // Everyone waits for the slowest, so sync to that question
              const minCurrentQuestion = Math.min(...activePlayersQuestions);
              const maxCurrentQuestion = Math.max(...activePlayersQuestions);

              // Determine target question based on my progress vs group
              const myProgress = result.playerData.currentQuestion || 0;

              let targetQuestion;
              let shouldWait = false;

              if (myProgress > minCurrentQuestion) {
                // I'm AHEAD of the slowest player
                // Put me on MY current progress and enter waiting state
                targetQuestion = myProgress;
                shouldWait = true;

              } else {
                // I'm BEHIND or EQUAL to the group
                // Sync to where the slowest player is
                targetQuestion = minCurrentQuestion;

              }

              // 🔥 BULLETPROOF: Validate target question is within valid range
              const validTargetQuestion = Math.max(0, Math.min(targetQuestion, questions.length - 1));

              if (validTargetQuestion !== targetQuestion) {
                console.warn(`⚠️ Target question ${targetQuestion} out of bounds, clamping to ${validTargetQuestion}`);
              }

              if (validTargetQuestion >= 0 && validTargetQuestion < questions.length) {


                // ✅ USE SETTER to trigger re-render!
                game.setCurrentQuestionIndex(validTargetQuestion);

                // 🔥 FIX: Update progress AND check if we should be waiting (use validated question)
                await updatePlayerProgress(quiz.gamePin, quiz.currentUserId, validTargetQuestion);

                // Reset timer for this question
                resetTimer(quizTimer);

                // 🔥 FIX: Check if we should enter waiting state immediately after reconnection
                // If I was ahead (shouldWait = true), enter waiting immediately
                if (shouldWait) {

                  setIsWaitingForPlayers(true);
                } else {
                  // Small delay to ensure state is properly set before checking
                  setTimeout(async () => {
                    // Re-fetch latest player states to ensure accuracy
                    const latestSnapshot = await get(battleRef);
                    if (latestSnapshot.exists()) {
                      const latestPlayersData = Object.values(latestSnapshot.val());
                      const latestActivePlayers = latestPlayersData.filter(p =>
                        Number(p.userId) !== currentUserIdNum &&
                        p.isOnline !== false &&
                        p.forfeited !== true
                      );

                      const playersWhoAnsweredTarget = latestActivePlayers.filter(
                        p => (p.currentQuestion || 0) >= validTargetQuestion + 1
                      ).length;

                      if (playersWhoAnsweredTarget === latestActivePlayers.length && latestActivePlayers.length > 0) {

                        setIsWaitingForPlayers(true);
                        // The auto-advance logic will handle moving to next question
                      } else {

                      }
                    }
                  }, 100); // 100ms delay to ensure state is synced
                }

              } else if (targetQuestion >= questions.length) {

                const savedQuestion = result.playerData.currentQuestion || 0;
                game.setCurrentQuestionIndex(Math.min(savedQuestion, questions.length - 1));
              }
            } else {
              // No other active players online, use SAVED progress (not question 0!)
              const savedQuestion = result.playerData.currentQuestion || 0;

              game.setCurrentQuestionIndex(Math.min(savedQuestion, questions.length - 1));
            }
          } else {
            // Battle doesn't exist, use saved progress
            const savedQuestion = result.playerData.currentQuestion || 0;

            game.setCurrentQuestionIndex(Math.min(savedQuestion, questions.length - 1));
          }
        } catch (error) {

          // Fallback to SAVED progress (not question 0!)
          const savedQuestion = result.playerData.currentQuestion || 0;

          game.setCurrentQuestionIndex(Math.min(savedQuestion, questions.length - 1));
        }
      }

      // 3. Resume game
      game.setIsPaused(false);

      return result;
    } else {

      return result;
    }
  };
  
  const handleGiveUpReconnection = () => {

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

      } else if (!reconnection.connectionState.reconnectionAvailable && !reconnection.connectionState.isReconnecting) {
        // Unpause when connection is stable (not reconnecting, no reconnection needed)
        game.setIsPaused(false);

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

    if (mode === 'battle' && quiz?.gamePin && quiz?.currentUserId) {
      try {
        // 1. Set score to 0 in Firebase
        await updatePlayerScore(quiz.gamePin, quiz.currentUserId, 0);

        // 2. Mark as forfeited
        const playerRef = ref(realtimeDb, `battles/${quiz.gamePin}/players/user_${quiz.currentUserId}`);
        await update(playerRef, {
          forfeited: true,
          forfeitedAt: Date.now(),
          isOnline: false
        });

        // 3. Cleanup connection tracking
        await reconnection.disconnect();

      } catch (error) {

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
        
        // 🔥 FIX: Use PATCH for partial updates (Firebase REST API requirement)
        if (navigator.sendBeacon) {
          // sendBeacon uses POST by default, but we need PATCH for Firebase
          // For Firebase REST API, we can use PUT but only if we include all fields
          // Better approach: Use the full object structure
          const fullDisconnectData = {
            userId: quiz.currentUserId,
            isOnline: false,
            disconnectedAt: Date.now(),
            reason: 'beforeunload',
            gracePeriodActive: true
          };
          const blob = new Blob([JSON.stringify(fullDisconnectData)], { type: 'application/json' });
          navigator.sendBeacon(connectionUrl, blob);

        } else {
          // Fallback: synchronous XHR with PATCH
          try {
            const xhr = new XMLHttpRequest();
            xhr.open('PATCH', connectionUrl, false); // 🔥 CHANGED: synchronous PATCH
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(disconnectData));

          } catch (err) {

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

        window.removeEventListener('beforeunload', handleBeforeUnload);
        
        // Check if this is an intentional exit from the app (via onBack/onComplete)
        // If yes, fully cleanup. If no, it's likely a navigation/refresh
        // The reconnection.disconnect() will handle proper cleanup
        reconnection.disconnect();
      }
    };
  }, [mode, quiz?.gamePin, quiz?.currentUserId]);

  const handleTimeUp = () => {
    // Acquire submission lock to prevent race condition
    if (!acquireSubmissionLock()) {
      return; // Another submission is already in progress
    }

    // Prevent multiple timeout recordings
    if (timeoutHandledRef.current) {
      releaseSubmissionLock();
      return;
    }
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
    
    // Mark progress in Firebase (battle mode)
    if (mode === 'battle' && quiz?.gamePin) {
      updatePlayerProgress(quiz.gamePin, quiz.currentUserId, game.currentQuestionIndex + 1)
        .then(() => {})
        .catch(() => {});
    }

    game.isProcessingRef.current = true;

    // Both modes: Move immediately after timeout
    setTimeout(() => {
      if (game.currentQuestionIndex < questions.length - 1) {
        game.nextQuestion();
        resetTimer(quizTimer);
        timeoutHandledRef.current = false;
        game.isProcessingRef.current = false;
      } else {
        finishQuizWithAnswers(newAnswersHistory);
      }
    }, 100);
  };

  const handleAnswerSelect = (answer) => {
    if (game.selectedAnswer || game.isPaused || isProcessing) return;

    // Acquire submission lock to prevent race condition
    if (!acquireSubmissionLock()) {
      return; // Timer already submitted or another submission in progress
    }

    // Clear encouragement timer since user is answering
    if (encouragementTimerRef.current) {
      clearTimeout(encouragementTimerRef.current);
      encouragementTimerRef.current = null;
    }
    setShowEncouragement(false);

    // STRICT SYNC: Prevent re-answering already answered questions
    if (mode === 'battle' && quiz?.gamePin) {
      // Check if I already answered this question (my progress is beyond this question)
      // This can happen when reconnecting ahead of others
      // Note: We don't have direct access to playerData here, so we check via the waiting state
      // The waiting logic already handles this case by putting them in waiting mode
    }

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
      // Track correct answers (sync ref + state)
      correctAnswersCountRef.current += 1;
      setCorrectAnswersCount(correctAnswersCountRef.current);
      
      // ADAPTIVE SCORING: Award points based on difficulty
      const points = mode === 'solo' 
        ? getPointsForDifficulty(currentQ.difficulty)
        : 1; // Battle mode: flat 1 point per question
      
      game.updateScore(points);
      
      // Update score in Firebase for real-time leaderboard
      if (mode === 'battle' && quiz?.gamePin) {
        const newScore = game.scoreRef.current; // Already updated above with correct points
        updatePlayerScore(quiz.gamePin, quiz.currentUserId, newScore)
          .catch(() => {});
      }
      
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }

    // Show pet companion message
    setPetAnswerCorrect(isCorrect);
    setShowPetMessage(true);
    
    // Update progress in Firebase (battle mode)
    if (mode === 'battle' && quiz?.gamePin) {
      updatePlayerProgress(quiz.gamePin, quiz.currentUserId, game.currentQuestionIndex + 1)
        .catch(() => {});
      
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      
      // Both modes: advance immediately after showing answer
      if (game.currentQuestionIndex >= questions.length - 1) {
        finishQuizWithAnswers(newAnswersHistory);
      } else {
        handleNextQuestion();
      }
    }, ANSWER_DISPLAY_DURATION);
  };

  const handleFillInAnswer = () => {
    if (!game.userAnswer?.trim() || game.userAnswer.includes('_submitted') || game.isPaused || isProcessing) return;
    
    // Acquire submission lock to prevent race condition
    if (!acquireSubmissionLock()) {
      return; // Timer already submitted or another submission in progress
    }

    // Clear encouragement timer since user is answering
    if (encouragementTimerRef.current) {
      clearTimeout(encouragementTimerRef.current);
      encouragementTimerRef.current = null;
    }
    setShowEncouragement(false);
    
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
      // Track correct answers (sync ref + state)
      correctAnswersCountRef.current += 1;
      setCorrectAnswersCount(correctAnswersCountRef.current);
      
      // ADAPTIVE SCORING: Award points based on difficulty
      const points = mode === 'solo' 
        ? getPointsForDifficulty(currentQ.difficulty)
        : 1; // Battle mode: flat 1 point per question
      
      game.updateScore(points);
      
      // Update score in Firebase
      if (mode === 'battle' && quiz?.gamePin) {
        const newScore = game.scoreRef.current; // Already updated above with correct points
        updatePlayerScore(quiz.gamePin, quiz.currentUserId, newScore)
          .catch(() => {});
      }
      
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(1, 1);
      }
    }

    // Show pet companion message
    setPetAnswerCorrect(isCorrect);
    setShowPetMessage(true);
    
    // Update progress in Firebase (battle mode)
    if (mode === 'battle' && quiz?.gamePin) {
      updatePlayerProgress(quiz.gamePin, quiz.currentUserId, game.currentQuestionIndex + 1)
        .catch(() => {});
      
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      
      // Both modes: advance immediately after showing answer
      if (game.currentQuestionIndex >= questions.length - 1) {
        finishQuizWithAnswers(newAnswersHistory);
      } else {
        handleNextQuestion();
      }
    }, ANSWER_DISPLAY_DURATION);
  };

  const handleMatchingSubmit = (matches) => {
    if (game.isPaused || isProcessing) return;

    // Acquire submission lock to prevent race condition
    if (!acquireSubmissionLock()) {
      return; // Timer already submitted or another submission in progress
    }

    if (encouragementTimerRef.current) {
      clearTimeout(encouragementTimerRef.current);
      encouragementTimerRef.current = null;
    }
    setShowEncouragement(false);

    timeoutHandledRef.current = true;
    setIsProcessing(true);
    game.setUserMatches(matches);
    game.setIsMatchingSubmitted(true);
    const answerResult = game.isAnswerCorrect(currentQ, matches);

    // Handle partial credit for matching questions
    const isCorrect = typeof answerResult === 'object' ? answerResult.isCorrect : answerResult;
    const partialCredit = typeof answerResult === 'object' ? answerResult.partialCredit : 0;
    const accuracy = typeof answerResult === 'object' ? answerResult.accuracy : (isCorrect ? 100 : 0);

    const answerRecord = {
      question: currentQ.question,
      userAnswer: matches,
      correctAnswer: currentQ.matchingPairs,
      isCorrect: isCorrect,
      partialCredit: partialCredit,
      accuracy: accuracy,
      type: currentQ.type
    };
    const newAnswersHistory = [...answersHistory, answerRecord];
    setAnswersHistory(newAnswersHistory);
    
    // Award points (full points if correct, partial points otherwise)
    if (isCorrect || partialCredit > 0) {
      if (isCorrect || partialCredit >= 1) {
        correctAnswersCountRef.current += 1;
        setCorrectAnswersCount(correctAnswersCountRef.current);
      }
      
      const points = mode === 'solo'
        ? (partialCredit > 0 ? partialCredit : getPointsForDifficulty(currentQ.difficulty))
        : 1;
      
      game.updateScore(points);

      if (mode === 'battle' && quiz?.gamePin) {
        const newScore = game.scoreRef.current;
        updatePlayerScore(quiz.gamePin, quiz.currentUserId, newScore)
          .catch(() => {});
      }
      
      if (onPlayerScoreUpdate) {
        onPlayerScoreUpdate(partialCredit > 0 ? partialCredit : 1, 1);
      }
    }

    setPetAnswerCorrect(isCorrect || accuracy >= 60);
    setShowPetMessage(true);
    
    if (mode === 'battle' && quiz?.gamePin) {
      updatePlayerProgress(quiz.gamePin, quiz.currentUserId, game.currentQuestionIndex + 1)
        .catch(() => {});
    }

    setIsProcessing(false);
  };

  const handleNextQuestion = () => {
    // Reset pet message for next question
    setShowPetMessage(false);
    
    // EDGE CASE 1: Skip adaptive check if feedback is already showing
    if (isShowingFeedbackRef.current) {

      // Just proceed with normal transition
      setIsProcessing(false);
      timeoutHandledRef.current = false;

      if (game.currentQuestionIndex < questions.length - 1) {
        game.nextQuestion();
        resetTimer(quizTimer);
      } else {
        finishQuiz();
      }
      return;
    }

    // OPTION 1: Adaptive reordering logic
    let shouldShowFeedback = false;

    // EDGE CASE 2: Only run adaptive check if we have valid state and enough answers
    if (useAdaptiveMode && adaptiveState && answersHistory.length >= 2) {
      const result = performAdaptiveCheck({
        questionsAnswered: game.currentQuestionIndex + 1,
        allQuestions: questions,
        answersHistory,
        currentDifficulty: adaptiveState.currentDifficulty
      });

      // Update adaptive state if difficulty changed
      if (result.newDifficulty !== adaptiveState.currentDifficulty || result.action !== 'MAINTAIN') {
        const updatedAdaptiveState = {
          currentDifficulty: result.newDifficulty,
          difficultyHistory: [
            ...adaptiveState.difficultyHistory,
            {
              afterQuestion: game.currentQuestionIndex + 1,
              fromDifficulty: adaptiveState.currentDifficulty,
              toDifficulty: result.newDifficulty,
              action: result.action
            }
          ]
        };
        setAdaptiveState(updatedAdaptiveState);
      }

      // REORDER questions if needed
      if (result.shouldReorder && result.reorderedQuestions.length > 0) {
        setQuestions(result.reorderedQuestions);

      }

      // Show feedback if we have a message
      // EDGE CASE 3: Only show feedback for actual difficulty changes or staying messages
      if (result.messageKey) {
        // BULLETPROOF: Clear any existing feedback timeout first
        if (feedbackTimeoutRef.current) {
          clearTimeout(feedbackTimeoutRef.current);
          feedbackTimeoutRef.current = null;
        }

        // BULLETPROOF: Force clear previous feedback immediately
        setAdaptiveFeedbackMessage(null);
        setAdaptiveFeedbackAction(null);
        isShowingFeedbackRef.current = false;

        const messages = {
          easy_to_medium: ["You're crushing it! Moving to Medium difficulty!", "Nice work! Let's step it up a notch!"],
          medium_to_hard: ["On fire! Time for Hard mode!", "Beast mode activated! Hard questions incoming!"],
          staying_hard: ["Maintaining excellence! Keep it up!", "Peak performance! You're unstoppable!"],
          hard_to_medium: ["Let's review some fundamentals!", "Building a stronger foundation!"],
          medium_to_easy: ["Back to basics - you've got this!", "Let's master the fundamentals first!"],
          staying_easy: ["Practice makes perfect!", "Keep learning at your pace!"]
        };
        const messageArray = messages[result.messageKey] || [];

        // EDGE CASE 4: Validate message exists before showing
        if (messageArray.length > 0) {
          const randomMessage = messageArray[Math.floor(Math.random() * messageArray.length)];

          // BULLETPROOF: Small delay to ensure state clears, then show new feedback
          setTimeout(() => {
            setAdaptiveFeedbackMessage(randomMessage);
            setAdaptiveFeedbackAction(result.action);
            shouldShowFeedback = true;
            isShowingFeedbackRef.current = true;

            // BULLETPROOF: Force clear feedback after max duration (failsafe)
            feedbackTimeoutRef.current = setTimeout(() => {
              setAdaptiveFeedbackMessage(null);
              setAdaptiveFeedbackAction(null);
              isShowingFeedbackRef.current = false;
              feedbackTimeoutRef.current = null;
            }, 3000); // Extra 500ms buffer for safety
          }, 50);
        }
      }
    }

    // Now proceed with question transition
    setIsProcessing(false);
    timeoutHandledRef.current = false;

    // EDGE CASE: If showing adaptive feedback, delay question transition
    // Shorter delay (2.5s total) for faster flow while ensuring feedback completes
    const transitionDelay = shouldShowFeedback ? 2500 : 0;

    setTimeout(() => {
      // EDGE CASE 5: Ensure questions array is valid before transitioning
      if (!questions || questions.length === 0) {

        finishQuiz();
        return;
      }

      if (game.currentQuestionIndex < questions.length - 1) {
        game.nextQuestion();
        resetTimer(quizTimer);
      } else {
        finishQuiz();
      }

      // EDGE CASE 6: Reset feedback flag after transition completes
      if (shouldShowFeedback) {
        isShowingFeedbackRef.current = false;
      }
    }, transitionDelay);
  };

  const handleManualNext = () => {

    // For matching type, check if last question
    if (game.currentQuestionIndex >= questions.length - 1) {

      finishQuizWithAnswers(answersHistory);
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


    const results = {
      ...game.getResults(),
      quizTitle: quiz.title,
      answers: finalAnswers,
      questions: questions, // Pass questions for difficulty breakdown
      gamePin: quiz?.gamePin,
      isHost: mode === 'battle' ? (quiz?.isHost || false) : false,
    };

    // ADAPTIVE DIFFICULTY: Add journey data if adaptive mode was used
    if (useAdaptiveMode && adaptiveState) {
      results.adaptiveJourney = buildAdaptiveJourney(
        adaptiveState.difficultyHistory,
        finalAnswers
      );

    }

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

  // ============================================
  // EMOJI REACTION HANDLER
  // ============================================

  const handleEmojiSelect = async (emojiData) => {
    if (!quiz?.gamePin || !quiz?.currentUserId) return;

    const userName = realPlayers.find(p => p.id === quiz.currentUserId)?.name || 'You';

    await sendReaction(quiz.gamePin, {
      userId: quiz.currentUserId,
      userName,
      emoji: emojiData.emoji
    });

  };

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
    // Check if adaptive mode is enabled for tips
    const adaptiveCheck = canUseAdaptiveMode(questions);
    const isAdaptiveEnabled = adaptiveCheck.enabled;

    // In battle mode, questions might still be loading from Firebase
    if (mode === 'battle') {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
          <div className="text-center bg-white/20 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-white/40 max-w-md">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl sm:text-2xl font-bold text-black drop-shadow-sm mb-2">Loading questions...</h2>
            <p className="text-sm sm:text-base text-black/70 mb-4">Please wait while we load the quiz questions</p>

            {/* Loading Tip for Battle */}
            <div className="bg-blue-500/20 border border-blue-300/50 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs sm:text-sm font-medium text-black/90 mb-1">💡 Quiz Info</p>
              <p className="text-xs text-black/70">
                Timer: <strong>{quizTimer === 0 ? 'No Limit' : `${quizTimer}s per question`}</strong><br/>
                Battle mode: All players get the same 10 questions!
              </p>
            </div>

            <button onClick={onBack} className="btn-branded-yellow text-black font-bold px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl border-2 border-white/40">
              Cancel
            </button>
          </div>
        </div>
      );
    }

    // Solo mode: No questions means error
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center bg-white/20 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/40">
          <h2 className="text-2xl font-bold text-black drop-shadow-sm mb-4">No questions available</h2>
          <button onClick={onBack} className="bg-amber-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-amber-600 transition-all shadow-lg hover:shadow-xl border-2 border-white/40">
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: 'linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)'
    }}>
      {/* Subtle dot pattern for texture */}
      <div className="fixed inset-0 pointer-events-none opacity-30" style={{
        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Radial gradient overlay with branded yellow - stronger */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at 50% 20%, rgba(255, 219, 0, 0.15), transparent 60%)'
      }} />

      {/* Radial gradient overlay with indigo - bottom */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.08), transparent 50%)'
      }} />

      {/* Floating sparkles with branded yellow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-float blur-sm"
            style={{
              left: `${(i * 15 + 10)}%`,
              top: `${(i * 12 + 5)}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${4 + (i % 3)}s`,
              backgroundColor: 'rgba(255, 219, 0, 0.6)'
            }}
          >
            <div className="absolute inset-0 bg-white/40 rounded-full animate-ping" style={{ animationDuration: `${2 + (i % 2)}s` }} />
          </div>
        ))}
      </div>

      {/* DYNAMIC PATTERNS based on question type */}
      <QuizBackgroundPattern questionType={currentQ?.type} />

      {/* Header */}
      <QuizGameHeader
        quiz={quiz}
        currentQuestion={game.currentQuestionIndex}
        totalQuestions={questions.length}
        timeLeft={timeLeft}
        timeLimit={quizTimer}
        displayScore={game.displayScore}
        mode={mode}
        playersCount={allPlayers.length}
        onBack={handleBackOrForfeit}
        currentQuestionData={currentQ}
        correctAnswersCount={correctAnswersCountRef.current}
        maxPossibleScore={maxPossibleScore}
        adaptiveMode={useAdaptiveMode}
      />

      {/* ADAPTIVE DIFFICULTY FEEDBACK */}
      {useAdaptiveMode && adaptiveFeedbackMessage && (
        <AdaptiveFeedback
          message={adaptiveFeedbackMessage}
          action={adaptiveFeedbackAction}
          onComplete={() => {
            // BULLETPROOF: Force clear all feedback state
            setAdaptiveFeedbackMessage(null);
            setAdaptiveFeedbackAction(null);
            isShowingFeedbackRef.current = false;
            if (feedbackTimeoutRef.current) {
              clearTimeout(feedbackTimeoutRef.current);
              feedbackTimeoutRef.current = null;
            }
          }}
        />
      )}

      {/* EMOJI REACTIONS - Floating display */}
      {mode === 'battle' && (
        <EmojiReactions
          gamePin={quiz?.gamePin}
          currentUserId={quiz?.currentUserId}
        />
      )}

      {/* EMOJI PICKER - Mobile/Tablet only (Desktop uses inline below) */}
      {mode === 'battle' && leaderboardMode !== 'desktop' && (
        <div className="fixed top-28 sm:top-24 right-4 sm:right-6 z-50">
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            disabled={game.isPaused}
            mode="popup"
          />
        </div>
      )}

    
      {/* MAIN CONTENT */}
      {mode === 'battle' ? (
        // BATTLE MODE - Responsive leaderboard
        <>
          {leaderboardMode === 'desktop' ? (
            // Desktop: Side-by-side
            <div className="flex gap-4 max-w-[1800px] mx-auto px-4 pt-24 pb-4 min-h-screen">
              <div className="flex-1 px-2 sm:px-4">
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
                  isWaiting={false}
                />

                {/* Manual next button for matching type */}
                {currentQ.type === 'Matching' && game.isMatchingSubmitted && (
                  <div className="text-center mt-6">
                    <button
                      onClick={handleManualNext}
                      className="px-8 py-3 btn-branded-yellow text-black rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 border-2 border-white/40"
                    >
                      {game.currentQuestionIndex >= questions.length - 1 ? 'Finish Quiz →' : 'Next Question →'}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="w-80 xl:w-96 h-[calc(100vh-6rem)] sticky top-24 flex flex-col gap-3 overflow-hidden">
                {/* INLINE EMOJI PICKER - Desktop only */}
                <div className="flex-shrink-0">
                  <EmojiPicker
                    onEmojiSelect={handleEmojiSelect}
                    disabled={game.isPaused}
                    mode="inline"
                  />
                </div>

                {/* Leaderboard - Auto-sized */}
                <div>
                  <LiveLeaderboard
                    players={allPlayers}
                    currentPlayerName="You"
                    currentUserId={quiz?.currentUserId}
                    mode="desktop"
                    totalQuestions={questions.length}
                    recentAnswers={recentAnsweredUsers}
                  />
                </div>
              </div>
            </div>
          ) : leaderboardMode === 'tablet' ? (
            // Tablet: Bottom slide panel
            <div className="relative pb-32 px-4 pt-24">
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
                isWaiting={false}
              />

              {/* Manual next button for matching type */}
              {currentQ.type === 'Matching' && game.isMatchingSubmitted && (
                <div className="text-center mt-6 mb-32">
                  <button
                    onClick={handleManualNext}
                    className="px-8 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-amber-600 hover:from-yellow-500 hover:via-amber-600 hover:to-orange-600 text-white rounded-2xl font-bold shadow-xl shadow-amber-500/30 hover:shadow-2xl hover:shadow-amber-600/40 transition-all transform hover:scale-105 border-2 border-white/40"
                  >
                    {game.currentQuestionIndex >= questions.length - 1 ? 'Finish Quiz →' : 'Next Question →'}
                  </button>
                </div>
              )}

              <div className="fixed bottom-0 left-0 right-0 z-30">
                <LiveLeaderboard
                  players={allPlayers}
                  currentPlayerName="You"
                  currentUserId={quiz?.currentUserId}
                  mode="tablet"
                  totalQuestions={questions.length}
                  recentAnswers={recentAnsweredUsers}
                />
              </div>
            </div>
          ) : (
            // Mobile: Floating mini
            <div className="px-4 pt-24 pb-8">
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
                isWaiting={false}
              />

              {/* Manual next button for matching type */}
              {currentQ.type === 'Matching' && game.isMatchingSubmitted && (
                <div className="text-center mt-6 mb-32">
                  <button
                    onClick={handleManualNext}
                    className="px-8 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-amber-600 hover:from-yellow-500 hover:via-amber-600 hover:to-orange-600 text-white rounded-2xl font-bold shadow-xl shadow-amber-500/30 hover:shadow-2xl hover:shadow-amber-600/40 transition-all transform hover:scale-105 border-2 border-white/40"
                  >
                    {game.currentQuestionIndex >= questions.length - 1 ? 'Finish Quiz →' : 'Next Question →'}
                  </button>
                </div>
              )}

              <LiveLeaderboard
                players={allPlayers}
                currentPlayerName="You"
                currentUserId={quiz?.currentUserId}
                mode="mobile"
                totalQuestions={questions.length}
                recentAnswers={recentAnsweredUsers}
              />
            </div>
          )}
          
        </>
      ) : (
        // SOLO MODE - No leaderboard
        <div className="max-w-4xl mx-auto p-4 pt-24">
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
            isWaiting={false}
          />
          
          {/* Solo mode next button for matching */}
          {currentQ.type === 'Matching' && game.isMatchingSubmitted && (
            <div className="text-center mt-6">
              <button
                onClick={handleManualNext}
                className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 border-2 border-white/40"
              >
                {game.currentQuestionIndex >= questions.length - 1 ? 'Finish Quiz →' : 'Next Question →'}
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
          inGracePeriod={reconnection.connectionState.inGracePeriod}
          gracePeriodTimeRemaining={reconnection.connectionState.gracePeriodTimeRemaining}
        />
      )}

      {/* 🐾 PET COMPANION */}
      <QuizPetCompanion
        isCorrect={petAnswerCorrect}
        showMessage={showPetMessage}
        showEncouragement={showEncouragement}
        onMessageShown={() => setShowPetMessage(false)}
        onEncouragementShown={() => setShowEncouragement(false)}
      />
    </div>
  );
}
export default QuizGame;
