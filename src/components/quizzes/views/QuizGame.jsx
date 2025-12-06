import { useState, useEffect, useRef } from 'react';
import { useQuizGame } from '../hooks/useQuizGame';
import { useQuizTimer } from '../hooks/useQuizTimer';
import { QuizGameHeader } from '../QuizGameHeader';
import { QuizQuestion } from '../QuizCore';
import { LiveLeaderboard } from './QuizLiveLeaderboard';
import { ANSWER_DISPLAY_DURATION } from '../utils/constants';
import { listenToPlayers, updatePlayerScore, updatePlayerProgress, markPlayerFinished, listenForAllPlayersFinished } from '../../../firebase/battleOperations';
import { sendReaction } from '../../../firebase/reactionOperations';
import { ref, update, get } from 'firebase/database';
import { realtimeDb } from '../../../firebase/config';
import { useReconnection } from '../hooks/useReconnection';
import { ReconnectionModal } from './ReconnectionModal';
import { savePlayerState } from '../../../firebase/connectionManager';
import { QuizBackgroundPattern } from '../utils/QuizPatterns';
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
import { EmojiReactions } from './EmojiReactions';
import { EmojiPicker } from './EmojiPicker';

const QuizGame = ({
  quiz,
  mode = 'solo',
  onBack,
  onComplete,
  onPlayerScoreUpdate
}) => {
  console.log('🚀 QuizGame RENDERED:', { mode, hasQuiz: !!quiz, gamePin: quiz?.gamePin });
  
  const rawQuestions = quiz?.questions || [];

  // 🔒 SAFETY CHECK: Ensure questions is always an array
  const safeRawQuestions = Array.isArray(rawQuestions) ? rawQuestions : [];

  // Get quiz mode from quiz object (set by handleSoloQuiz)
  // 'casual' = shuffled random questions, 'adaptive' = difficulty-based with performance tracking
  const quizMode = quiz?.quizMode || 'casual';
  const useAdaptiveMode = mode === 'solo' && quizMode === 'adaptive';

  // 🔥 Question Bank: Use questions already shuffled and limited by handleSoloQuiz/handleQuizBattle
  const [questions, setQuestions] = useState(() => {
    // Battle: Use ALL questions passed (already shuffled and limited by host)
    if (mode === 'battle') {
      return safeRawQuestions;
    }

    // Solo modes: Use questions already shuffled and sliced by handleSoloQuiz
    // (handleSoloQuiz already did the random selection based on user's choice)
    const selectedQuestions = safeRawQuestions;

    // 🔒 SAFETY: Ensure we have questions
    if (!selectedQuestions || selectedQuestions.length === 0) {
      console.error('No questions available for solo mode');
      return [];
    }

    // Apply mode-specific ordering/logic
    if (useAdaptiveMode) {
      // Solo Adaptive: Initialize adaptive queue with selected questions
      const { orderedQuestions, startingDifficulty} = initializeAdaptiveQueue(selectedQuestions);

      return orderedQuestions || selectedQuestions; // Fallback to selectedQuestions if initialization fails
    }

    // Solo Classic: Sort selected questions by difficulty
    const sorted = sortQuestionsByDifficulty(selectedQuestions);

    return sorted || selectedQuestions; // Fallback to selectedQuestions if sorting fails
  });

  // Adaptive state tracking
  const [adaptiveState, setAdaptiveState] = useState(() => {
    if (mode === 'solo' && useAdaptiveMode && safeRawQuestions.length > 0) {
      // 🔥 OPTION 1: Get starting difficulty from initialization
      const initResult = initializeAdaptiveQueue(safeRawQuestions);
      const startingDifficulty = initResult?.startingDifficulty || 'medium';

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

  // Track actual battle question count from Firebase
  // After reconnection, quiz.questions might have ALL questions (15), not battle questions (10)
  const [battleTotalQuestions, setBattleTotalQuestions] = useState(null);

  // 🎭 EMOJI REACTIONS: Track recent answers for pulse effect
  const [recentAnsweredUsers, setRecentAnsweredUsers] = useState([]);
  const recentAnswersTimeoutRef = useRef(null);

  // 🐾 PET COMPANION: Track when to show pet motivation
  const [showPetMessage, setShowPetMessage] = useState(false);
  const [petAnswerCorrect, setPetAnswerCorrect] = useState(null);
  const [showEncouragement, setShowEncouragement] = useState(false);
  
  // Battle: Waiting for other players
  const [waitingForPlayers, setWaitingForPlayers] = useState(false);
  const [finishedPlayersCount, setFinishedPlayersCount] = useState({ finished: 0, total: 0 });
  const [waitingTimeRemaining, setWaitingTimeRemaining] = useState(60); // 1 minute countdown
  const encouragementTimerRef = useRef(null);
  const waitingTimeoutRef = useRef(null);
  const waitingCountdownRef = useRef(null);

  // 🔒 SUBMISSION MUTEX: Prevent race condition between timer and manual submission
  const submissionLockRef = useRef({ locked: false, timestamp: 0 });

  // Track if initial save has been done (prevent re-running on reconnection)
  const initialSaveDoneRef = useRef(false);

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

    return () => {
      if (encouragementTimerRef.current) {
        clearTimeout(encouragementTimerRef.current);
        encouragementTimerRef.current = null;
      }
    };
  }, [game.currentQuestionIndex, showPetMessage]);

  // ⏳ Waiting state countdown and auto-proceed
  useEffect(() => {
    if (!waitingForPlayers) {
      // Clear countdown when not waiting
      if (waitingCountdownRef.current) {
        clearInterval(waitingCountdownRef.current);
        waitingCountdownRef.current = null;
      }
      return;
    }

    // Reset timer to 60 seconds when entering waiting state
    setWaitingTimeRemaining(60);

    // Start countdown
    waitingCountdownRef.current = setInterval(() => {
      setWaitingTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up! Auto-proceed to results
          clearInterval(waitingCountdownRef.current);
          waitingCountdownRef.current = null;

          // Mark disconnected players as forfeited and finished
          if (quiz?.gamePin) {
            const markDisconnectedAsFinished = async () => {
              try {
                const battleRef = ref(realtimeDb, `battles/${quiz.gamePin}/players`);
                const snapshot = await get(battleRef);
                if (snapshot.exists()) {
                  const playersData = snapshot.val();
                  const updates = {};

                  Object.entries(playersData).forEach(([key, player]) => {
                    // Mark offline/disconnected players as finished
                    if (player.isOnline === false && player.finished !== true) {
                      updates[`${key}/finished`] = true;
                      updates[`${key}/hasForfeited`] = true;
                    }
                  });

                  if (Object.keys(updates).length > 0) {
                    await update(battleRef, updates);
                  }
                }
              } catch (error) {
                console.error('❌ Error marking disconnected players:', error);
              }
            };
            markDisconnectedAsFinished();
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (waitingCountdownRef.current) {
        clearInterval(waitingCountdownRef.current);
        waitingCountdownRef.current = null;
      }
    };
  }, [waitingForPlayers, quiz?.gamePin]);

  // FETCH BATTLE TOTAL QUESTIONS from Firebase metadata
  useEffect(() => {
    if (mode === 'battle' && quiz?.gamePin) {
      const fetchBattleMetadata = async () => {
        try {
          const metadataRef = ref(realtimeDb, `battles/${quiz.gamePin}/metadata`);
          const snapshot = await get(metadataRef);
          if (snapshot.exists()) {
            const metadata = snapshot.val();
            setBattleTotalQuestions(metadata.totalQuestions || questions.length);
          }
        } catch (error) {
          console.error('❌ Error fetching battle metadata:', error);
          // Fallback to questions.length
          setBattleTotalQuestions(questions.length);
        }
      };
      fetchBattleMetadata();
    }
  }, [mode, quiz?.gamePin]);

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

  // HELPER: Get correct total questions count
  // In battle mode after reconnection, use Firebase metadata instead of questions.length
  const getTotalQuestions = () => {
    if (mode === 'battle' && battleTotalQuestions !== null) {
      return battleTotalQuestions;
    }
    return questions.length;
  };

  const currentQ = game.currentQuestion;

  // 🔒 SAFETY: Ensure currentQuestion exists and is valid
  useEffect(() => {
    if (!currentQ && questions.length > 0 && game.currentQuestionIndex >= questions.length) {
      console.error('Current question index out of bounds:', {
        currentIndex: game.currentQuestionIndex,
        totalQuestions: questions.length
      });
      // Reset to last valid question
      const validIndex = Math.max(0, questions.length - 1);
      game.setCurrentQuestionIndex(validIndex);
      game.currentQuestionIndexRef.current = validIndex; // Keep ref in sync
    }
  }, [currentQ, questions.length, game.currentQuestionIndex]);

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
      score: game.scoreRef.current, // FIX: Use scoreRef.current
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
  // AUTO-SAVE PROGRESS TO FIREBASE (Battle Mode Only)
  // ============================================
  
  // Auto-save game state every 3 seconds for reliable reconnection
  useEffect(() => {
    if (mode !== 'battle' || !quiz?.gamePin || !quiz?.currentUserId) return;

    const autoSaveInterval = setInterval(() => {
      const currentGameState = {
        score: game.scoreRef.current,
        currentQuestionIndex: game.currentQuestionIndexRef.current, // FIX: Use ref to avoid closure
        userAnswers: game.userAnswers,
        answeredQuestions: game.answeredQuestions,
        questions: questions
      };

      savePlayerState(quiz.gamePin, quiz.currentUserId, currentGameState);
    }, 3000);

    return () => clearInterval(autoSaveInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, quiz?.gamePin, quiz?.currentUserId]);

  // Initial save when battle starts (save the question set immediately)
  // NOTE: This should NOT run on reconnection - only on first battle join
  useEffect(() => {
    if (mode !== 'battle' || !quiz?.gamePin || !quiz?.currentUserId) return;
    if (!questions || questions.length === 0) return;
    if (initialSaveDoneRef.current) return;

    // FIX: Don't run initial save if player is reconnecting
    // Reconnecting players already have saved state, don't overwrite with zeros
    if (reconnection.connectionState.isReconnecting || reconnection.connectionState.reconnectionAvailable) {
      initialSaveDoneRef.current = true; // Mark as done to prevent future runs
      return;
    }

    const initialGameState = {
      score: 0,
      currentQuestionIndex: 0,
      userAnswers: [],
      answeredQuestions: [],
      questions: questions
    };

    savePlayerState(quiz.gamePin, quiz.currentUserId, initialGameState);
    initialSaveDoneRef.current = true;
  }, [mode, quiz?.gamePin, quiz?.currentUserId, questions, reconnection.connectionState.isReconnecting, reconnection.connectionState.reconnectionAvailable]);

  // ============================================
  // RECONNECTION HANDLERS 
  // ============================================
  
  const handleReconnection = async () => {
    // Set isReconnecting flag in Firebase so leaderboard shows "Reconnecting"
    if (mode === 'battle' && quiz?.gamePin && quiz?.currentUserId) {
      try {
        const playerRef = ref(realtimeDb, `battles/${quiz.gamePin}/players/user_${quiz.currentUserId}`);
        await update(playerRef, {
          isReconnecting: true
        });
      } catch (error) {
        console.error('❌ Failed to set isReconnecting flag:', error);
      }
    }

    const result = await reconnection.attemptReconnection();

    if (!result.success) {
      // Clear isReconnecting flag on failure
      if (mode === 'battle' && quiz?.gamePin && quiz?.currentUserId) {
        try {
          const playerRef = ref(realtimeDb, `battles/${quiz.gamePin}/players/user_${quiz.currentUserId}`);
          await update(playerRef, {
            isReconnecting: false
          });
        } catch (error) {
          console.error('❌ Failed to clear isReconnecting flag:', error);
        }
      }
      return result;
    }

    if (result.savedState) {
      // SIMPLE APPROACH: Restore everything from savedState (ONE source of truth)
      const saved = result.savedState;

      // Set questions FIRST (synchronously in memory)
      const restoredQuestions = saved.questions || questions;
      setQuestions(restoredQuestions);

      // Set score
      game.scoreRef.current = saved.score || 0;
      game.updateScore(0); // Sync to display

      // Set answers
      game.setUserAnswers(saved.userAnswers || []);
      game.setAnsweredQuestions(new Set(saved.answeredQuestions || []));

      // Set position - use MIN to ensure within bounds
      const targetIndex = Math.min(
        saved.currentQuestionIndex || 0,
        restoredQuestions.length - 1
      );
      const finalIndex = Math.max(0, targetIndex);
      game.setCurrentQuestionIndex(finalIndex);
      game.currentQuestionIndexRef.current = finalIndex; // Keep ref in sync

      // Reset timer for current question
      resetTimer(quizTimer);

      // Resume
      game.setIsPaused(false);
    }

    // Clear isReconnecting flag
    if (mode === 'battle' && quiz?.gamePin && quiz?.currentUserId) {
      try {
        const playerRef = ref(realtimeDb, `battles/${quiz.gamePin}/players/user_${quiz.currentUserId}`);
        await update(playerRef, {
          isReconnecting: false
        });
      } catch (error) {
        console.error('❌ Failed to clear isReconnecting flag:', error);
      }
    }

    return result;
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

        // 2. Mark as forfeited AND finished (so other players don't wait)
        const playerRef = ref(realtimeDb, `battles/${quiz.gamePin}/players/user_${quiz.currentUserId}`);
        await update(playerRef, {
          forfeited: true,
          finished: true, // Mark as finished so others don't wait
          forfeitedAt: Date.now(),
          isOnline: false
        });

        console.log('✅ Player forfeited and marked as finished');

        // 3. Cleanup connection tracking
        await reconnection.disconnect();

      } catch (error) {
        console.error('❌ Error during forfeit:', error);
      }
    }
    
    // 4. Call onBack to return to previous screen
    onBack();
  };

  useEffect(() => {
    // Track if this is an intentional exit
    let isIntentionalExit = false;
    
    // Handle browser close/refresh (X button)
    const handleBeforeUnload = (e) => {
      if (mode === 'battle' && quiz?.gamePin && quiz?.currentUserId) {

        // CRITICAL: Save final game state before disconnect
        const finalGameState = {
          score: game.scoreRef.current,
          currentQuestionIndex: game.currentQuestionIndex,
          userAnswers: game.userAnswers,
          answeredQuestions: Array.from(game.answeredQuestions), // Convert Set to Array
          questions: questions
        };
        const savedStateUrl = `https://studai-quiz-battles-default-rtdb.asia-southeast1.firebasedatabase.app/battles/${quiz.gamePin}/savedStates/user_${quiz.currentUserId}.json`;
        const savedStateBlob = new Blob([JSON.stringify({
          ...finalGameState,
          savedAt: Date.now(),
          expiresAt: Date.now() + 300000 // 5 minutes
        })], { type: 'application/json' });

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

        // Use PATCH for partial updates (Firebase REST API requirement)
        if (navigator.sendBeacon) {
          // Save state FIRST (most critical)
          navigator.sendBeacon(savedStateUrl, savedStateBlob);

          // Then mark as disconnected
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
            xhr.open('PATCH', connectionUrl, false); // synchronous PATCH
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

    // 🔒 SAFETY: Validate answer exists
    if (!answer || answer === '') {
      console.error('Invalid answer selected');
      return;
    }

    // 🔒 SAFETY: Validate current question
    if (!currentQ || !currentQ.type) {
      console.error('Cannot select answer: Current question is invalid');
      return;
    }

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
      // Track correct answers using state updater (prevents flickering)
      setCorrectAnswersCount(prev => {
        const newCount = prev + 1;
        correctAnswersCountRef.current = newCount; // Keep ref in sync
        return newCount;
      });
      
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
      // Track correct answers using state updater (prevents flickering)
      setCorrectAnswersCount(prev => {
        const newCount = prev + 1;
        correctAnswersCountRef.current = newCount; // Keep ref in sync
        return newCount;
      });
      
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
        // Track correct answers using state updater (prevents flickering)
        setCorrectAnswersCount(prev => {
          const newCount = prev + 1;
          correctAnswersCountRef.current = newCount; // Keep ref in sync
          return newCount;
        });
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

    // Auto-proceed after showing color feedback (like MC/TF)
    setTimeout(() => {
      setIsProcessing(false);
      
      // Advance to next question or finish quiz
      if (game.currentQuestionIndex >= questions.length - 1) {
        finishQuizWithAnswers(newAnswersHistory);
      } else {
        handleNextQuestion();
      }
    }, 800); // 800ms to see RED/GREEN feedback
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

  const finishQuizWithAnswers = async (finalAnswers) => {


    const quizId = quiz.quiz_id || quiz.quizId || quiz.id;
    console.log('🎯 Quiz ID detection:', { quiz_id: quiz.quiz_id, quizId: quiz.quizId, id: quiz.id, selected: quizId });
    
    const results = {
      ...game.getResults(),
      quizTitle: quiz.title,
      quizId: quizId, // Add quizId for leaderboard fetching
      answers: finalAnswers,
      questions: questions, // Pass questions for difficulty breakdown
      gamePin: quiz?.gamePin,
      isHost: mode === 'battle' ? (quiz?.isHost || false) : false,
      currentUserId: quiz?.currentUserId, // Pass currentUserId for token invalidation
    };

    // ADAPTIVE DIFFICULTY: Add journey data if adaptive mode was used
    if (useAdaptiveMode && adaptiveState) {
      results.adaptiveJourney = buildAdaptiveJourney(
        adaptiveState.difficultyHistory,
        finalAnswers
      );

    }

    if (mode === 'battle') {
      // Mark this player as finished in Firebase
      const finalScore = game.scoreRef.current;
      await markPlayerFinished(quiz.gamePin, quiz.currentUserId, finalScore);
      
      console.log('✅ Player finished, waiting for Firebase to sync...');
      
      // ⏳ Wait 1 second for Firebase to propagate the update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('🔍 Now checking if all players done...');
      
      // Import the check function
      const { checkAllPlayersFinished } = await import('../../../firebase/battleOperations');
      
      // First, do an immediate check
      const immediateCheck = await checkAllPlayersFinished(quiz.gamePin);
      console.log(`📊 Immediate check: ${immediateCheck.finishedCount}/${immediateCheck.totalPlayers} finished`);
      
      if (immediateCheck.allFinished) {
        console.log('🎉 All players already finished! Proceeding to leaderboard immediately...');
        
        // Get fresh player data from Firebase
        const { get, ref } = await import('firebase/database');
        const { realtimeDb } = await import('../../../firebase/config');
        const playersRef = ref(realtimeDb, `battles/${quiz.gamePin}/players`);
        const snapshot = await get(playersRef);
        const players = snapshot.exists() ? Object.values(snapshot.val()).filter(p => p && p.userId && p.name) : [];
        
        // Prepare results with all players' final scores
        results.players = players.map(player => ({
          id: `player_${player.userId}`,
          userId: player.userId,
          name: player.name,
          initial: player.initial || player.name?.[0] || '?',
          score: player.score || 0,
          forfeited: player.forfeited || false
        }));
        
        results.winner = results.players.reduce((prev, current) => 
          prev.score > current.score ? prev : current
        );
        
        onComplete(results);
        return;
      }
      
      // Not all finished yet - show waiting screen and listen
      console.log('⏳ Not all players finished, setting up listener...');
      setWaitingForPlayers(true);
      setFinishedPlayersCount({ finished: immediateCheck.finishedCount, total: immediateCheck.totalPlayers });
      
      // Listen for all players to finish
      const unsubscribe = listenForAllPlayersFinished(quiz.gamePin, ({ allFinished, finishedCount, totalPlayers, players }) => {
        console.log(`📊 Listener fired: ${finishedCount}/${totalPlayers} players finished`);
        
        setFinishedPlayersCount({ finished: finishedCount, total: totalPlayers });
        
        if (allFinished) {
          console.log('🎉 All players finished! Showing leaderboard...');
          unsubscribe(); // Stop listening
          
          // Prepare results with all players' final scores from Firebase
          results.players = players.map(player => ({
            id: `player_${player.userId}`,
            userId: player.userId,
            name: player.name,
            initial: player.initial || player.name?.[0] || '?',
            score: player.score || 0,
            forfeited: player.forfeited || false
          }));
          
          results.winner = results.players.reduce((prev, current) => 
            prev.score > current.score ? prev : current
          );
          
          setWaitingForPlayers(false);
          console.log('🚀 CALLING onComplete with results:', { 
            gamePin: results.gamePin, 
            isHost: results.isHost, 
            playersCount: results.players?.length,
            hasPlayers: !!results.players 
          });
          onComplete(results);
        }
      });
      
      return; // Don't call onComplete yet, wait for all players
    }
    
    // Solo mode: Complete immediately
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
  
  // 🔒 CRITICAL SAFETY CHECK: Validate game state before rendering
  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
        <div className="text-center bg-white/20 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-white/40 max-w-md">
          <div className="text-4xl sm:text-5xl mb-4">⚠️</div>
          <h2 className="text-xl sm:text-2xl font-bold text-black drop-shadow-sm mb-4">No Questions Available</h2>
          <p className="text-sm sm:text-base text-black/70 mb-6">
            This quiz has no questions. Please add questions before starting.
          </p>
          <button onClick={onBack} className="btn-branded-yellow text-black font-bold px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl border-2 border-white/40">
            Go Back
          </button>
        </div>
      </div>
    );
  }

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
        totalQuestions={getTotalQuestions()}
        timeLeft={timeLeft}
        timeLimit={quizTimer}
        displayScore={game.displayScore}
        mode={mode}
        playersCount={allPlayers.length}
        onBack={handleBackOrForfeit}
        currentQuestionData={currentQ}
        correctAnswersCount={correctAnswersCount}
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
        <>
          {leaderboardMode === 'desktop' ? (
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
                    totalQuestions={getTotalQuestions()}
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

              <div className="fixed bottom-0 left-0 right-0 z-30">
                <LiveLeaderboard
                  players={allPlayers}
                  currentPlayerName="You"
                  currentUserId={quiz?.currentUserId}
                  mode="tablet"
                  totalQuestions={getTotalQuestions()}
                  recentAnswers={recentAnsweredUsers}
                />
              </div>
            </div>
          ) : (
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

              <LiveLeaderboard
                players={allPlayers}
                currentPlayerName="You"
                currentUserId={quiz?.currentUserId}
                mode="mobile"
                totalQuestions={getTotalQuestions()}
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

      {/* WAITING FOR OTHER PLAYERS MODAL */}
      {waitingForPlayers && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-yellow-400 transform animate-bounce-gentle">
            <div className="text-6xl mb-4 animate-pulse">⏳</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Waiting for Other Players...</h2>
            <p className="text-gray-600 mb-4">
              You finished the quiz! Hold on while others complete their questions.
            </p>
            
            <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-2xl p-4 mb-4 border-2 border-yellow-300">
              <div className="text-5xl font-bold text-yellow-600 mb-1">
                {finishedPlayersCount.finished}/{finishedPlayersCount.total}
              </div>
              <div className="text-sm text-gray-700 font-semibold">Players Finished</div>
            </div>

            {/* Countdown Timer */}
            <div className="bg-gradient-to-r from-red-100 to-orange-100 rounded-xl p-3 mb-4 border-2 border-red-300">
              <div className="text-2xl font-bold text-red-600 mb-1">
                {Math.floor(waitingTimeRemaining / 60)}:{(waitingTimeRemaining % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-700 font-medium">Time Remaining</div>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <span className="animate-pulse">●</span>
              <span className="animate-pulse animation-delay-200">●</span>
              <span className="animate-pulse animation-delay-400">●</span>
            </div>
          </div>
        </div>
      )}

      {/* 🐾 PET COMPANION */}
      <QuizPetCompanion
        isCorrect={petAnswerCorrect}
        showMessage={showPetMessage}
        showEncouragement={showEncouragement}
        onMessageShown={() => setShowPetMessage(false)}
        onEncouragementShown={() => setShowEncouragement(false)}
      />
      
      <style jsx>{`
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  );
}
export default QuizGame;
