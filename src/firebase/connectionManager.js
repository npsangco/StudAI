import { ref, onValue, onDisconnect, set, get, update, serverTimestamp } from 'firebase/database';
import { realtimeDb } from './config';

// Handles heartbeats, disconnections, and reconnections

export const initializeConnectionTracking = async (gamePin, userId) => {
  try {
    const playerRef = ref(realtimeDb, `battles/${gamePin}/players/user_${userId}`);
    const connectionRef = ref(realtimeDb, `battles/${gamePin}/connections/user_${userId}`);

    await set(connectionRef, {
      userId,
      isOnline: true,
      lastHeartbeat: Date.now(),
      connectedAt: Date.now(),
      disconnectedAt: null,
      gracePeriodActive: false
    });

    // Update player's isOnline status
    await update(playerRef, {
      isOnline: true,
      inGracePeriod: false,
      disconnectedAt: null
    });

    // Auto-mark as offline with grace period on disconnect
    const disconnectRef = onDisconnect(connectionRef);

    await disconnectRef.update({
      isOnline: false,
      disconnectedAt: serverTimestamp(),
      gracePeriodActive: true,
      gracePeriodExpiresAt: null
    });

    const playerDisconnectRef = onDisconnect(playerRef);
    await playerDisconnectRef.update({
      isOnline: false,
      inGracePeriod: true,
      disconnectedAt: serverTimestamp(),
      gracePeriodExpiresAt: null
    });

    return {
      connectionRef,
      playerRef
    };

  } catch (error) {
    console.error('❌ Error initializing connection tracking:', error);
    throw error;
  }
};

export const sendHeartbeat = async (gamePin, userId) => {
  try {
    const connectionRef = ref(realtimeDb, `battles/${gamePin}/connections/user_${userId}`);

    await set(connectionRef, {
      userId,
      isOnline: true,
      lastHeartbeat: Date.now(),
      disconnectedAt: null,
      gracePeriodActive: false
    });

    // Also update player status
    const playerRef = ref(realtimeDb, `battles/${gamePin}/players/user_${userId}`);
    await update(playerRef, {
      isOnline: true,
      inGracePeriod: false,
      disconnectedAt: null
    });

  } catch (error) {
    console.error('❤️ Heartbeat failed:', error);
  }
};

// Monitor connection state changes
export const listenToConnectionState = (gamePin, userId, callback) => {
  const connectionRef = ref(realtimeDb, `battles/${gamePin}/connections/user_${userId}`);
  
  return onValue(connectionRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data);
    }
  });
};

/**
 * Check if a player is still online
 * Uses heartbeat timeout (10 seconds = 2 missed heartbeats)
 * Includes grace period logic (90 seconds before forfeit)
 */
export const isPlayerOnline = async (gamePin, userId) => {
  try {
    const connectionRef = ref(realtimeDb, `battles/${gamePin}/connections/user_${userId}`);
    const snapshot = await get(connectionRef);
    
    if (!snapshot.exists()) {
      return false;
    }
    
    const data = snapshot.val();
    const now = Date.now();
    const heartbeatAge = now - (data.lastHeartbeat || 0);
    
    // Consider offline if no heartbeat in 10 seconds
    const isCurrentlyOnline = data.isOnline && heartbeatAge < 10000;
    
    // If offline, check if still in grace period
    if (!isCurrentlyOnline && data.disconnectedAt) {
      const disconnectAge = now - data.disconnectedAt;
      const GRACE_PERIOD = 90000; // 90 seconds
      
      // Still in grace period = considered "temporarily offline" not forfeited
      if (disconnectAge < GRACE_PERIOD) {
        return 'grace_period'; // Special status
      }
    }
    
    return isCurrentlyOnline;
    
  } catch (error) {
    console.error('❌ Error checking online status:', error);
    return false;
  }
};

/**
 * Get all online players in a battle
 * Includes players in grace period as "temporarily offline"
 */
export const getOnlinePlayers = async (gamePin) => {
  try {
    const connectionsRef = ref(realtimeDb, `battles/${gamePin}/connections`);
    const snapshot = await get(connectionsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const connections = snapshot.val();
    const now = Date.now();
    const GRACE_PERIOD = 90000; // 90 seconds
    
    return Object.values(connections).filter(conn => {
      const heartbeatAge = now - (conn.lastHeartbeat || 0);
      const isCurrentlyOnline = conn.isOnline && heartbeatAge < 10000;
      
      // Include players in grace period
      if (!isCurrentlyOnline && conn.disconnectedAt) {
        const disconnectAge = now - conn.disconnectedAt;
        return disconnectAge < GRACE_PERIOD; // Still in grace period
      }
      
      return isCurrentlyOnline;
    });
    
  } catch (error) {
    console.error('❌ Error getting online players:', error);
    return [];
  }
};

/**
 * Check grace period status for a disconnected player
 * Returns: { inGracePeriod: boolean, timeRemaining: number, isForfeited: boolean }
 */
export const checkGracePeriod = async (gamePin, userId) => {
  try {
    const playerRef = ref(realtimeDb, `battles/${gamePin}/players/user_${userId}`);
    const snapshot = await get(playerRef);

    if (!snapshot.exists()) {
      return { inGracePeriod: false, timeRemaining: 0, isForfeited: true };
    }

    const data = snapshot.val();
    const now = Date.now();

    // Check if already forfeited
    if (data.hasForfeited === true) {
      return { inGracePeriod: false, timeRemaining: 0, isForfeited: true };
    }

    // Check if currently online
    if (data.isOnline === true) {
      return { inGracePeriod: false, timeRemaining: 0, isForfeited: false };
    }

    // Calculate grace period from disconnectedAt timestamp
    // Grace period = 90 seconds from when they disconnected
    if (data.disconnectedAt) {
      const GRACE_PERIOD_MS = 90000; // 90 seconds
      const disconnectTime = data.disconnectedAt;
      const gracePeriodEndsAt = disconnectTime + GRACE_PERIOD_MS;
      const timeRemaining = Math.max(0, gracePeriodEndsAt - now);

      if (timeRemaining > 0) {
        return {
          inGracePeriod: true,
          timeRemaining: Math.ceil(timeRemaining / 1000), // Convert to seconds
          isForfeited: false
        };
      }

      // Grace period expired - mark as forfeited in Firebase
      await markAsForfeited(gamePin, userId);
      return { inGracePeriod: false, timeRemaining: 0, isForfeited: true };
    }

    // No disconnectedAt timestamp (player never disconnected or just connected)
    return { inGracePeriod: false, timeRemaining: 0, isForfeited: false };

  } catch (error) {
    console.error('❌ Error checking grace period:', error);
    return { inGracePeriod: false, timeRemaining: 0, isForfeited: false };
  }
};

/**
 * Mark player as forfeited after grace period expires
 */
export const markAsForfeited = async (gamePin, userId) => {
  try {
    const playerRef = ref(realtimeDb, `battles/${gamePin}/players/user_${userId}`);
    
    await update(playerRef, {
      isOnline: false,
      inGracePeriod: false,
      hasForfeited: true,
      finished: true, // Mark as finished so other players don't wait
      score: 0, // Forfeited players get 0 score
      forfeitedAt: Date.now()
    });
    
    console.log(`✅ Player ${userId} auto-forfeited (grace period expired) and marked as finished`);
    
    const connectionRef = ref(realtimeDb, `battles/${gamePin}/connections/user_${userId}`);
    await update(connectionRef, {
      isOnline: false,
      gracePeriodActive: false,
      hasForfeited: true
    });
    
  } catch (error) {
    console.error('❌ Error marking as forfeited:', error);
  }
};

/**
 * Manually mark player as offline
 * Called when player explicitly leaves
 */
export const markPlayerOffline = async (gamePin, userId) => {
  try {
    const connectionRef = ref(realtimeDb, `battles/${gamePin}/connections/user_${userId}`);
    
    await set(connectionRef, {
      userId,
      isOnline: false,
      disconnectedAt: Date.now()
    });
    
    // Update player status
    const playerRef = ref(realtimeDb, `battles/${gamePin}/players/user_${userId}/isOnline`);
    await set(playerRef, false);

  } catch (error) {
    console.error('❌ Error marking offline:', error);
  }
};

/**
 * Cleanup connection tracking
 * Called when leaving battle
 */
export const cleanupConnectionTracking = async (gamePin, userId) => {
  try {
    await markPlayerOffline(gamePin, userId);
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
};

export const canRejoinBattle = async (gamePin) => {
  try {
    const metadataRef = ref(realtimeDb, `battles/${gamePin}/metadata`);
    const snapshot = await get(metadataRef);
    
    if (!snapshot.exists()) {
      return { canRejoin: false, reason: 'Battle not found' };
    }
    
    const metadata = snapshot.val();
    
    // ❌ CANNOT rejoin completed battles
    if (metadata.status === 'completed' || metadata.status === 'finished') {
      return { canRejoin: false, reason: 'Battle already completed' };
    }
    
    // ✅ Can rejoin if status is 'in_progress'
    if (metadata.status === 'in_progress') {
      return { canRejoin: true };
    }
    
    // ✅ Can rejoin if status is 'waiting' (lobby)
    if (metadata.status === 'waiting') {
      return { canRejoin: true, reason: 'Battle in lobby' };
    }
    
    // Default: Cannot rejoin
    return { canRejoin: false, reason: 'Battle not active' };
    
  } catch (error) {
    console.error('❌ Error checking rejoin eligibility:', error);
    return { canRejoin: false, reason: 'Error checking battle status' };
  }
};

export const rejoinBattle = async (gamePin, userId) => {
  try {

    // Check if battle still exists and is active
    const eligibility = await canRejoinBattle(gamePin);
    
    if (!eligibility.canRejoin) {
      return {
        success: false,
        error: eligibility.reason || 'Cannot rejoin this battle'
      };
    }
    
    // 🔥 GET BATTLE METADATA (includes quizId, battleId, quizTitle)
    const metadataRef = ref(realtimeDb, `battles/${gamePin}/metadata`);
    const metadataSnapshot = await get(metadataRef);
    
    if (!metadataSnapshot.exists()) {
      return {
        success: false,
        error: 'Battle metadata not found'
      };
    }
    
    const metadata = metadataSnapshot.val();
    
    // Get player's saved state
    const playerRef = ref(realtimeDb, `battles/${gamePin}/players/user_${userId}`);
    const snapshot = await get(playerRef);
    
    if (!snapshot.exists()) {
      return {
        success: false,
        error: 'Player data not found'
      };
    }
    
    const playerData = snapshot.val();
    
    // 🔥 ENHANCED: Check multiple sources for most reliable progress
    let currentQuestion = 0;
    let resolvedScore = playerData.score || 0;
    
    // Priority 1: Check savedStates (most recent, auto-saved every 3s)
    try {
      const savedStateRef = ref(realtimeDb, `battles/${gamePin}/savedStates/user_${userId}`);
      const savedStateSnapshot = await get(savedStateRef);
      
      if (savedStateSnapshot.exists()) {
        const savedState = savedStateSnapshot.val();
        const now = Date.now();
        
        // Use if not expired (5 minutes)
        if (!savedState.expiresAt || now <= savedState.expiresAt) {
          currentQuestion = savedState.currentQuestionIndex || 0;
          resolvedScore = savedState.score || resolvedScore;
          console.log('✅ Using savedState progress:', { currentQuestion, score: resolvedScore });
        } else {
          console.log('⚠️ savedState expired, using fallback');
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch savedState:', err);
    }
    
    // Priority 2: Fallback to player's currentQuestion if savedState not found/expired
    if (currentQuestion === 0 && playerData.currentQuestion) {
      currentQuestion = playerData.currentQuestion;
      console.log('✅ Using player currentQuestion fallback:', currentQuestion);
    }
    
    console.log('🔄 Reconnection resolved progress:', { 
      currentQuestion, 
      score: resolvedScore,
      sources: {
        savedState: 'checked',
        playerData: playerData.currentQuestion || 0
      }
    });
    
    // Mark player as back online
    await set(ref(realtimeDb, `battles/${gamePin}/connections/user_${userId}`), {
      userId,
      isOnline: true,
      lastHeartbeat: Date.now(),
      reconnectedAt: Date.now()
    });
    
    await update(ref(realtimeDb, `battles/${gamePin}/players/user_${userId}`), {
      isOnline: true,
      inGracePeriod: false,
      isReconnecting: false, // Clear reconnecting flag
      currentQuestion: currentQuestion, // Sync resolved progress back to player node
      score: resolvedScore // Sync resolved score back
    });

    return {
      success: true,
      playerData: {
        userId: playerData.userId,
        name: playerData.name,
        score: resolvedScore,
        currentQuestion: currentQuestion, // Use resolved progress
        isReady: playerData.isReady || false,
        // 🔥 ADD BATTLE METADATA
        quizId: metadata.quizId,
        battleId: metadata.battleId,
        quizTitle: metadata.quizTitle,
        gamePin: gamePin
      }
    };
    
  } catch (error) {
    console.error('❌ Error rejoining battle:', error);
    return {
      success: false,
      error: 'Failed to rejoin battle'
    };
  }
};

/**
 * Listen for players reconnecting/disconnecting
 */
export const listenToPlayerConnections = (gamePin, callback) => {
  const connectionsRef = ref(realtimeDb, `battles/${gamePin}/connections`);
  
  return onValue(connectionsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const connections = Object.values(data);
      callback(connections);
    } else {
      callback([]);
    }
  });
};

// ============================================
// 💾 STATE PRESERVATION FOR RECONNECTION
// ============================================

/**
 * Save player's current game state for reconnection
 * Called when player disconnects during battle
 */
export const savePlayerState = async (gamePin, userId, state) => {
  try {
    const stateRef = ref(realtimeDb, `battles/${gamePin}/savedStates/user_${userId}`);

    // Convert Set to Array for Firebase (Firebase doesn't support Set type)
    const answeredQuestionsArray = state.answeredQuestions instanceof Set
      ? Array.from(state.answeredQuestions)
      : (Array.isArray(state.answeredQuestions) ? state.answeredQuestions : []);

    await set(stateRef, {
      userId,
      score: state.score || 0,
      currentQuestionIndex: state.currentQuestionIndex || 0,
      userAnswers: state.userAnswers || [],
      answeredQuestions: answeredQuestionsArray,
      questions: state.questions || [],
      savedAt: Date.now(),
      expiresAt: Date.now() + 300000
    });

  } catch (error) {
    console.error('❌ Error saving player state:', error);
  }
};

export const restorePlayerState = async (gamePin, userId) => {
  try {
    const stateRef = ref(realtimeDb, `battles/${gamePin}/savedStates/user_${userId}`);
    const snapshot = await get(stateRef);
    
    if (!snapshot.exists()) {
      return { success: false, error: 'No saved state found' };
    }
    
    const savedState = snapshot.val();
    const now = Date.now();
    
    // Check if state has expired
    if (savedState.expiresAt && now > savedState.expiresAt) {
      // Clean up expired state
      await set(stateRef, null);
      return { success: false, error: 'Saved state expired' };
    }
    
    return {
      success: true,
      state: {
        score: savedState.score,
        currentQuestionIndex: savedState.currentQuestionIndex,
        userAnswers: savedState.userAnswers || [],
        answeredQuestions: new Set(savedState.answeredQuestions || []),
        questions: savedState.questions || [] // 🔥 Restore the selected questions
      }
    };
    
  } catch (error) {
    console.error('❌ Error restoring player state:', error);
    return { success: false, error: 'Failed to restore state' };
  }
};

export const clearSavedState = async (gamePin, userId) => {
  try {
    const stateRef = ref(realtimeDb, `battles/${gamePin}/savedStates/user_${userId}`);
    await set(stateRef, null);
  } catch (error) {
    console.error('❌ Error clearing saved state:', error);
  }
};