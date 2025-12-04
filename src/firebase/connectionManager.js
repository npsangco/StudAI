import { ref, onValue, onDisconnect, set, get, update, serverTimestamp } from 'firebase/database';
import { realtimeDb } from './config';

/**
 * Connection Manager - Handles heartbeats, disconnections, and reconnections
 */

// ============================================
// 🔌 CONNECTION STATE TRACKING
// ============================================

/**
 * Initialize connection tracking for a player
 * Sets up heartbeat and disconnect handlers with 90-second grace period
 */
export const initializeConnectionTracking = async (gamePin, userId) => {
  try {
    const playerRef = ref(realtimeDb, `battles/${gamePin}/players/user_${userId}`);
    const connectionRef = ref(realtimeDb, `battles/${gamePin}/connections/user_${userId}`);

    // Set initial connection state
    await set(connectionRef, {
      userId,
      isOnline: true,
      lastHeartbeat: Date.now(),
      connectedAt: Date.now(),
      disconnectedAt: null,
      gracePeriodActive: false
    });

    // IMPORTANT: Also update player's isOnline status so leaderboard shows correctly
    await update(playerRef, {
      isOnline: true,
      inGracePeriod: false,
      disconnectedAt: null, // Clear any previous disconnect
      gracePeriodExpiresAt: null // Clear expiration timestamp
    });

    // Setup disconnect handler - auto-mark as offline with grace period
    const disconnectRef = onDisconnect(connectionRef);
    const disconnectTimestamp = Date.now();
    const gracePeriodExpiresAt = disconnectTimestamp + 90000; // 90 seconds from now

    await disconnectRef.update({
      isOnline: false,
      disconnectedAt: disconnectTimestamp,
      gracePeriodActive: true, // Start grace period
      gracePeriodExpiresAt // When grace period expires
    });

    // Also update player's isOnline status (but keep in grace period)
    const playerDisconnectRef = onDisconnect(playerRef);
    await playerDisconnectRef.update({
      isOnline: false,
      inGracePeriod: true,
      disconnectedAt: disconnectTimestamp,
      gracePeriodExpiresAt // When grace period expires
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

/**
 * Send heartbeat to keep connection alive
 * Should be called every 5 seconds
 * Clears grace period if player reconnects
 */
export const sendHeartbeat = async (gamePin, userId) => {
  try {
    const connectionRef = ref(realtimeDb, `battles/${gamePin}/connections/user_${userId}`);

    await set(connectionRef, {
      userId,
      isOnline: true,
      lastHeartbeat: Date.now(),
      disconnectedAt: null,
      gracePeriodActive: false,
      gracePeriodExpiresAt: null // Clear expiration
    });

    // Also update player status (clear grace period)
    const playerRef = ref(realtimeDb, `battles/${gamePin}/players/user_${userId}`);
    await update(playerRef, {
      isOnline: true,
      inGracePeriod: false,
      disconnectedAt: null,
      gracePeriodExpiresAt: null // Clear expiration
    });

  } catch (error) {
    console.error('❌ Heartbeat failed:', error);
    // Don't throw - heartbeat failures shouldn't crash the app
  }
};

/**
 * Monitor connection state changes
 * Callback receives: { isOnline, lastHeartbeat }
 */
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

    // Check grace period using stored expiration timestamp
    if (data.gracePeriodExpiresAt) {
      const timeRemaining = Math.max(0, data.gracePeriodExpiresAt - now);

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

    // No grace period data (shouldn't happen, but handle gracefully)
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

// ============================================
// 🔄 RECONNECTION HELPERS
// ============================================

/**
 * Check if battle is still active (can rejoin)
 */
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

/**
 * Attempt to rejoin a battle
 * Returns player's saved state (score, currentQuestion, etc.) + battle metadata
 */
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
      isReconnecting: false // Clear reconnecting flag
    });

    return {
      success: true,
      playerData: {
        userId: playerData.userId,
        name: playerData.name,
        score: playerData.score || 0,
        currentQuestion: playerData.currentQuestion || 0,
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
    
    await set(stateRef, {
      userId,
      score: state.score || 0,
      currentQuestionIndex: state.currentQuestionIndex || 0,
      userAnswers: state.userAnswers || [],
      answeredQuestions: state.answeredQuestions || new Set(),
      savedAt: Date.now(),
      expiresAt: Date.now() + 90000 // Expires after 90 seconds
    });
    
  } catch (error) {
    console.error('❌ Error saving player state:', error);
  }
};

/**
 * Restore player's saved game state
 * Called when player reconnects during grace period
 */
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
        answeredQuestions: new Set(savedState.answeredQuestions || [])
      }
    };
    
  } catch (error) {
    console.error('❌ Error restoring player state:', error);
    return { success: false, error: 'Failed to restore state' };
  }
};

/**
 * Clear saved player state
 * Called after successful reconnection or when state expires
 */
export const clearSavedState = async (gamePin, userId) => {
  try {
    const stateRef = ref(realtimeDb, `battles/${gamePin}/savedStates/user_${userId}`);
    await set(stateRef, null);
  } catch (error) {
    console.error('❌ Error clearing saved state:', error);
  }
};