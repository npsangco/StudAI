import { ref, onValue, onDisconnect, set, get, serverTimestamp } from 'firebase/database';
import { realtimeDb } from './config';

/**
 * Connection Manager - Handles heartbeats, disconnections, and reconnections
 */

// ============================================
// 🔌 CONNECTION STATE TRACKING
// ============================================

/**
 * Initialize connection tracking for a player
 * Sets up heartbeat and disconnect handlers
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
      connectedAt: Date.now()
    });
    
    // Setup disconnect handler - auto-mark as offline
    const disconnectRef = onDisconnect(connectionRef);
    await disconnectRef.update({
      isOnline: false,
      disconnectedAt: Date.now()
    });
    
    // Also update player's isOnline status
    const playerDisconnectRef = onDisconnect(playerRef);
    await playerDisconnectRef.update({
      isOnline: false
    });
    
    console.log('✅ Connection tracking initialized for user:', userId);
    
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
 */
export const sendHeartbeat = async (gamePin, userId) => {
  try {
    const connectionRef = ref(realtimeDb, `battles/${gamePin}/connections/user_${userId}`);
    
    await set(connectionRef, {
      userId,
      isOnline: true,
      lastHeartbeat: Date.now()
    });
    
    // Also update player status
    const playerRef = ref(realtimeDb, `battles/${gamePin}/players/user_${userId}/isOnline`);
    await set(playerRef, true);
    
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
    return data.isOnline && heartbeatAge < 10000;
    
  } catch (error) {
    console.error('❌ Error checking online status:', error);
    return false;
  }
};

/**
 * Get all online players in a battle
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
    
    return Object.values(connections).filter(conn => {
      const heartbeatAge = now - (conn.lastHeartbeat || 0);
      return conn.isOnline && heartbeatAge < 10000;
    });
    
  } catch (error) {
    console.error('❌ Error getting online players:', error);
    return [];
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
    
    console.log('✅ Player marked offline:', userId);
    
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
    console.log('✅ Connection tracking cleaned up');
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
    
    // Can rejoin if status is 'in_progress'
    if (metadata.status === 'in_progress') {
      return { canRejoin: true };
    }
    
    if (metadata.status === 'waiting') {
      return { canRejoin: true, reason: 'Battle in lobby' };
    }
    
    return { canRejoin: false, reason: 'Battle already completed' };
    
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
    console.log('🔄 Attempting to rejoin battle:', gamePin, userId);
    
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
    
    await set(ref(realtimeDb, `battles/${gamePin}/players/user_${userId}/isOnline`), true);
    
    console.log('✅ Successfully rejoined battle');
    
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