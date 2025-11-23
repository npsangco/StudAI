import { ref, set, update, remove, onValue, get, serverTimestamp, runTransaction } from 'firebase/database';
import { realtimeDb } from './config';
import { API_URL } from '../config/api.config';

// ============================================
// BATTLE ROOM OPERATIONS
// ============================================

/**
 * Create a new battle room in Firebase
 * Called by HOST after MySQL battle creation
 */
export const createBattleRoom = async (gamePin, battleData) => {
  try {
    const battleRef = ref(realtimeDb, `battles/${gamePin}`);
    
    await set(battleRef, {
      metadata: {
        battleId: battleData.battleId,
        quizId: battleData.quizId,
        quizTitle: battleData.quizTitle,
        hostId: battleData.hostId,
        status: 'waiting',
        currentQuestion: 0,
        totalQuestions: battleData.totalQuestions,
        viewers: 0,
        createdAt: Date.now()
      },
      players: {}, // Empty at start
      answers: {}
    });

    return true;
  } catch (error) {
    console.error('❌ Error creating battle room:', error);
    throw error;
  }
};

/**
 * Add a player to the battle room
 * Called when player joins via MySQL API
 */
export const addPlayerToBattle = async (gamePin, playerData) => {
  try {
    const playerRef = ref(realtimeDb, `battles/${gamePin}/players/user_${playerData.userId}`);

    await set(playerRef, {
      userId: playerData.userId,
      name: playerData.name,
      initial: playerData.initial,
      profilePicture: playerData.profilePicture || null,
      isReady: false,
      score: 0,
      isOnline: true,
      joinedAt: Date.now()
    });

    return true;
  } catch (error) {
    console.error('❌ Error adding player:', error);
    throw error;
  }
};

/**
 * Mark player as ready
 */
export const markPlayerReady = async (gamePin, userId) => {
  try {
    const playerRef = ref(realtimeDb, `battles/${gamePin}/players/user_${userId}`);
    await update(playerRef, { isReady: true });
    
  } catch (error) {
    console.error('❌ Error marking ready:', error);
    throw error;
  }
};

/**
 * Mark player as unready
 */
export const markPlayerUnready = async (gamePin, userId) => {
  try {
    const playerRef = ref(realtimeDb, `battles/${gamePin}/players/user_${userId}`);
    await update(playerRef, { isReady: false });
    
  } catch (error) {
    console.error('❌ Error marking unready:', error);
    throw error;
  }
};

/**
 * Update battle status (waiting → in_progress → completed)
 */
export const updateBattleStatus = async (gamePin, status) => {
  try {
    const statusRef = ref(realtimeDb, `battles/${gamePin}/metadata/status`);
    await set(statusRef, status);
    
  } catch (error) {
    console.error('❌ Error updating status:', error);
    throw error;
  }
};

/**
 * Update player's current question progress
 */
export const updatePlayerProgress = async (gamePin, userId, questionIndex) => {
  try {
    const progressRef = ref(realtimeDb, `battles/${gamePin}/players/user_${userId}/currentQuestion`);
    await set(progressRef, questionIndex);
    
  } catch (error) {
    console.error('❌ Error updating progress:', error);
    throw error;
  }
};

/**
 * Advance to next question (HOST only)
 */
export const advanceQuestion = async (gamePin, questionIndex) => {
  try {
    const questionRef = ref(realtimeDb, `battles/${gamePin}/metadata/currentQuestion`);
    await set(questionRef, questionIndex);
    
  } catch (error) {
    console.error('❌ Error advancing question:', error);
    throw error;
  }
};

/**
 * Update player score in real-time
 */
export const updatePlayerScore = async (gamePin, userId, newScore) => {
  try {
    const scoreRef = ref(realtimeDb, `battles/${gamePin}/players/user_${userId}/score`);
    await set(scoreRef, newScore);
    
  } catch (error) {
    console.error('❌ Error updating score:', error);
    throw error;
  }
};

/**
 * Remove player from battle (when they leave)
 */
export const removePlayerFromBattle = async (gamePin, userId) => {
  try {
    const playerRef = ref(realtimeDb, `battles/${gamePin}/players/user_${userId}`);
    await remove(playerRef);
    
  } catch (error) {
    console.error('❌ Error removing player:', error);
    throw error;
  }
};

/**
 * Delete entire battle room (cleanup after battle ends)
 */
export const deleteBattleRoom = async (gamePin) => {
  try {
    const battleRef = ref(realtimeDb, `battles/${gamePin}`);
    await remove(battleRef);
    
  } catch (error) {
    console.error('❌ Error deleting battle:', error);
    throw error;
  }
};

// ============================================
// REAL-TIME LISTENERS
// ============================================

/**
 * Listen to all players in battle (for lobby & leaderboard)
 * Returns unsubscribe function
 */
export const listenToPlayers = (gamePin, callback) => {
  const playersRef = ref(realtimeDb, `battles/${gamePin}/players`);
  
  const unsubscribe = onValue(playersRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Convert object to array
      const players = Object.values(data);
      callback(players);
    } else {
      callback([]);
    }
  });
  
  return unsubscribe; // Call this to stop listening
};

/**
 * Listen to current question index (all players sync to host)
 */
export const listenToCurrentQuestion = (gamePin, callback) => {
  const questionRef = ref(realtimeDb, `battles/${gamePin}/metadata/currentQuestion`);
  
  return onValue(questionRef, (snapshot) => {
    const questionIndex = snapshot.val();
    if (questionIndex !== null) {
      callback(questionIndex);
    }
  });
};

/**
 * Listen to battle status changes
 */
export const listenToBattleStatus = (gamePin, callback) => {
  const statusRef = ref(realtimeDb, `battles/${gamePin}/metadata/status`);
  
  return onValue(statusRef, (snapshot) => {
    const status = snapshot.val();
    if (status) {
      callback(status);
    }
  });
};

/**
 * Get battle metadata once (not real-time)
 */
export const getBattleMetadata = async (gamePin) => {
  try {
    const metadataRef = ref(realtimeDb, `battles/${gamePin}/metadata`);
    const snapshot = await get(metadataRef);
    return snapshot.val();
  } catch (error) {
    console.error('❌ Error getting metadata:', error);
    throw error;
  }
};

/**
 * Store quiz questions in Firebase (called by HOST when starting)
 */
export const storeQuizQuestions = async (gamePin, questions) => {
  try {
    console.log('🔥 Firebase - storeQuizQuestions called:', {
      gamePin,
      questionsCount: questions?.length,
      hasQuestions: !!questions && questions.length > 0,
      firstQuestion: questions?.[0]
    });

    if (!questions || questions.length === 0) {
      console.error('❌ Firebase - No questions to store!');
      throw new Error('No questions to store');
    }

    if (!gamePin) {
      console.error('❌ Firebase - No gamePin provided!');
      throw new Error('No gamePin provided');
    }

    const questionsRef = ref(realtimeDb, `battles/${gamePin}/questions`);
    console.log('🔥 Firebase - Setting questions at:', `battles/${gamePin}/questions`);
    await set(questionsRef, questions);
    console.log('✅ Firebase - Questions stored successfully');
    
    // ALSO update metadata with actual question count
    const metadataRef = ref(realtimeDb, `battles/${gamePin}/metadata/totalQuestions`);
    console.log('🔥 Firebase - Setting totalQuestions:', questions.length);
    await set(metadataRef, questions.length);
    console.log('✅ Firebase - Metadata updated successfully');
    
  } catch (error) {
    console.error('❌ Firebase - Error storing questions:', error);
    console.error('❌ Firebase - Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Listen to quiz questions (for non-host players)
 */
export const listenToQuizQuestions = (gamePin, callback) => {
  const questionsRef = ref(realtimeDb, `battles/${gamePin}/questions`);
  
  return onValue(questionsRef, (snapshot) => {
    const questions = snapshot.val();
    if (questions) {
      
      callback(questions);
    }
  });
};

// ============================================
// SYNC LOCK FUNCTIONS
// ============================================

/**
 * Acquire sync lock to prevent duplicate syncs
 * Uses Firebase transaction for atomic lock acquisition
 */
const acquireSyncLock = async (gamePin) => {
  try {
    const lockRef = ref(realtimeDb, `battles/${gamePin}/metadata/syncLock`);
    
    const transactionResult = await runTransaction(lockRef, (currentLock) => {
      // If lock exists and is recent (< 60 seconds), abort
      if (currentLock && currentLock.lockedAt > Date.now() - 60000) {
        return; // Abort transaction
      }
      
      // Acquire lock
      return {
        locked: true,
        lockedAt: Date.now(),
        lockedBy: 'host'
      };
    });
    
    if (!transactionResult.committed) {
      
      return { acquired: false, reason: 'Lock already held' };
    }

    return { acquired: true };
    
  } catch (error) {
    console.error('❌ Error acquiring sync lock:', error);
    return { acquired: false, reason: error.message };
  }
};

/**
 * Release sync lock
 */
const releaseSyncLock = async (gamePin) => {
  try {
    const lockRef = ref(realtimeDb, `battles/${gamePin}/metadata/syncLock`);
    await remove(lockRef);
    
  } catch (error) {
    console.error('❌ Error releasing sync lock:', error);
  }
};

// ============================================
// SYNC BATTLE RESULTS TO MYSQL
// ============================================

/**
 * Sync final battle results from Firebase to MySQL with retry logic
 * NOW WITH ATOMIC LOCK TO PREVENT DUPLICATE SYNCS
 */
export const syncBattleResultsToMySQL = async (gamePin, maxRetries = 3) => {

  // 🔒 STEP 1: ACQUIRE LOCK
  const lockResult = await acquireSyncLock(gamePin);
  
  if (!lockResult.acquired) {
    
    return { 
      success: false, 
      error: lockResult.reason,
      alreadySyncing: true 
    };
  }
  
  try {
    // Check if already synced (localStorage check)
    const syncKey = `battle_synced_${gamePin}`;
    const existingSync = localStorage.getItem(syncKey);
    
    if (existingSync) {
      const syncData = JSON.parse(existingSync);
      
      // If synced less than 5 minutes ago, skip
      if (Date.now() - syncData.timestamp < 5 * 60 * 1000) {
        
        await releaseSyncLock(gamePin);
        return { success: true, alreadySynced: true };
      }
    }
    
    // Get battle data from Firebase
    let battleData;
    try {
      const battleRef = ref(realtimeDb, `battles/${gamePin}`);
      const snapshot = await get(battleRef);
      
      if (!snapshot.exists()) {
        console.error('❌ Battle not found in Firebase:', gamePin);
        await releaseSyncLock(gamePin);
        return { 
          success: false, 
          error: 'Battle not found in Firebase' 
        };
      }
      
      battleData = snapshot.val();
    } catch (error) {
      console.error('❌ Failed to fetch battle from Firebase:', error);
      await releaseSyncLock(gamePin);
      return { 
        success: false, 
        error: 'Failed to fetch battle data from Firebase' 
      };
    }
    
    const players = battleData.players ? Object.values(battleData.players) : [];
    
    if (players.length === 0) {
      console.error('❌ No players found in battle:', gamePin);
      await releaseSyncLock(gamePin);
      return { 
        success: false, 
        error: 'No players found in battle' 
      };
    }
    
    // Determine winner (highest score)
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];
    const winnerId = winner.userId;

    // Retry loop with exponential backoff
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {

        const response = await fetch(
          `${API_URL}/api/quizzes/battle/${gamePin}/sync-results`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              players: players.map(p => ({
                userId: p.userId,
                score: p.score || 0,
                name: p.name
              })),
              winnerId: winnerId,
              completedAt: new Date().toISOString()
            })
          }
        );
        
        // Check response
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`❌ Attempt ${attempt} failed with status ${response.status}:`, errorData);
          
          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            await releaseSyncLock(gamePin);
            return {
              success: false,
              error: errorData.error || `Server rejected sync: ${response.status}`,
              attempt
            };
          }
          
          // Retry on 5xx errors (server errors)
          if (attempt < maxRetries) {
            const backoffMs = 1000 * Math.pow(2, attempt); // 2s, 4s, 8s
            
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          }
          
          await releaseSyncLock(gamePin);
          return {
            success: false,
            error: `Sync failed after ${maxRetries} attempts`,
            attempt
          };
        }
        
        // Parse successful response
        const result = await response.json();

        // ✅ VERIFY the sync actually worked
        if (!result.success) {
          console.error('❌ Server reported sync failure:', result);
          
          if (attempt < maxRetries) {
            const backoffMs = 1000 * Math.pow(2, attempt);
            
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          }
          
          await releaseSyncLock(gamePin);
          return {
            success: false,
            error: 'Server reported sync failure',
            attempt
          };
        }
        
        // ✅ Success! Store sync confirmation
        const syncConfirmation = {
          timestamp: Date.now(),
          gamePin,
          winnerId,
          totalPlayers: players.length,
          verified: true,
          attempt
        };
        
        localStorage.setItem(syncKey, JSON.stringify(syncConfirmation));
        
        // Mark sync complete in Firebase
        await markSyncComplete(gamePin, winnerId);
        
        // VERIFY THE SYNC WORKED
        
        try {
          const verifyResponse = await fetch(
            `${API_URL}/api/quizzes/battle/${gamePin}/verify-sync`,
            {
              method: 'GET',
              credentials: 'include'
            }
          );
          
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();

            // Double-check status
            if (verifyData.status !== 'completed') {
              console.warn('⚠️ WARNING: Battle status is not "completed":', verifyData.status);
            }
            if (!verifyData.winnerId) {
              console.warn('⚠️ WARNING: Winner ID is missing');
            }
          } else {
            console.warn('⚠️ Could not verify sync:', verifyResponse.status);
          }
        } catch (verifyError) {
          console.warn('⚠️ Verification request failed:', verifyError.message);
          // Don't fail the whole sync if verification fails
        }
        
        // Release lock
        await releaseSyncLock(gamePin);
        
        return {
          success: true,
          attempt,
          winnerId,
          totalPlayers: players.length
        };
        
      } catch (error) {
        console.error(`❌ Sync attempt ${attempt} threw error:`, error);
        
        // Network errors - retry
        if (attempt < maxRetries) {
          const backoffMs = 1000 * Math.pow(2, attempt);
          
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        
        await releaseSyncLock(gamePin);
        return {
          success: false,
          error: `Network error after ${maxRetries} attempts: ${error.message}`,
          attempt
        };
      }
    }
    
    // Should never reach here, but just in case
    await releaseSyncLock(gamePin);
    return {
      success: false,
      error: 'Sync failed for unknown reason',
      attempt: maxRetries
    };
    
  } catch (error) {
    console.error('❌ Fatal sync error:', error);
    await releaseSyncLock(gamePin);
    return {
      success: false,
      error: `Fatal error: ${error.message}`
    };
  }
};

// ============================================
// ATOMIC VIEWER MANAGEMENT & CLEANUP
// ============================================

/**
 * Atomically increment viewer count
 * Called when user opens leaderboard
 * 
 * @param {string} gamePin - The battle game PIN
 * @returns {Promise<{success: boolean, viewerCount: number}>}
 */
export const incrementViewers = async (gamePin) => {

  const viewersRef = ref(realtimeDb, `battles/${gamePin}/metadata/viewers`);
  
  try {
    // Use Firebase transaction for atomic increment
    const transactionResult = await runTransaction(viewersRef, (currentViewers) => {
      // If null, start at 0
      if (currentViewers === null) {
        return 1;
      }
      
      // Increment
      return currentViewers + 1;
    });
    
    if (!transactionResult.committed) {
      console.warn('⚠️ Increment transaction not committed');
      return {
        success: false,
        viewerCount: 0,
        error: 'Transaction failed to commit'
      };
    }
    
    const newViewerCount = transactionResult.snapshot.val();

    return {
      success: true,
      viewerCount: newViewerCount
    };
    
  } catch (error) {
    console.error('❌ Error incrementing viewers:', error);
    return {
      success: false,
      viewerCount: -1,
      error: error.message
    };
  }
};

/**
 * Atomically decrement viewer count and cleanup if needed
 * Uses Firebase transactions to prevent race conditions
 * 
 * @param {string} gamePin - The battle game PIN
 * @returns {Promise<{success: boolean, viewerCount: number, cleanedUp: boolean}>}
 */
export const decrementViewersAndCleanup = async (gamePin) => {

  const viewersRef = ref(realtimeDb, `battles/${gamePin}/metadata/viewers`);
  
  try {
    // Use Firebase transaction for atomic decrement
    const transactionResult = await runTransaction(viewersRef, (currentViewers) => {
      // If null, treat as 0
      if (currentViewers === null) {
        return 0;
      }
      
      // Decrement but never go below 0
      return Math.max(0, currentViewers - 1);
    });
    
    if (!transactionResult.committed) {
      console.warn('⚠️ Transaction not committed, retrying...');
      return {
        success: false,
        viewerCount: 0,
        cleanedUp: false,
        error: 'Transaction failed to commit'
      };
    }
    
    const newViewerCount = transactionResult.snapshot.val();

    // Check if this was the last viewer
    if (newViewerCount === 0) {

      // Check if MySQL sync is complete before cleanup
      const canCleanup = await checkSyncStatusAndCleanup(gamePin);
      
      return {
        success: true,
        viewerCount: newViewerCount,
        cleanedUp: canCleanup
      };
    }
    
    return {
      success: true,
      viewerCount: newViewerCount,
      cleanedUp: false
    };
    
  } catch (error) {
    console.error('❌ Error in decrementViewersAndCleanup:', error);
    return {
      success: false,
      viewerCount: -1,
      cleanedUp: false,
      error: error.message
    };
  }
};

/**
 * Check MySQL sync status and cleanup if safe
 * Only deletes Firebase data if MySQL sync is confirmed
 * 
 * @param {string} gamePin - The battle game PIN
 * @returns {Promise<boolean>} - Whether cleanup was performed
 */
const checkSyncStatusAndCleanup = async (gamePin) => {
  try {
    const battleRef = ref(realtimeDb, `battles/${gamePin}`);
    const snapshot = await get(battleRef);
    
    if (!snapshot.exists()) {
      
      return true;
    }
    
    const battleData = snapshot.val();
    const syncStatus = battleData?.metadata?.syncedToMySQL;
    
    // Check if MySQL sync is confirmed
    if (syncStatus?.synced === true) {

      // Check how old the sync is (safety check)
      const syncAge = Date.now() - (syncStatus.timestamp || 0);
      const maxAge = 10 * 60 * 1000; // 10 minutes
      
      if (syncAge > maxAge) {
        console.warn('⚠️ Sync is very old, but proceeding with cleanup');
      }
      
      // Delete the entire battle room
      await deleteBattleRoom(gamePin);

      return true;
    }
    
    // MySQL sync not confirmed yet

    // Mark battle for delayed cleanup
    const pendingCleanupRef = ref(realtimeDb, `battles/${gamePin}/metadata/pendingCleanup`);
    await set(pendingCleanupRef, {
      markedAt: Date.now(),
      reason: 'Waiting for MySQL sync confirmation'
    });
    
    // Set a TTL - auto-delete after 5 minutes even without sync confirmation
    // This prevents orphaned data if sync somehow never completes
    setTimeout(async () => {

      // Check one more time if still exists
      const checkSnapshot = await get(battleRef);
      if (checkSnapshot.exists()) {
        await deleteBattleRoom(gamePin);
        
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return false;
    
  } catch (error) {
    console.error('❌ Error checking sync status:', error);
    return false;
  }
};

/**
 * Mark MySQL sync as complete in Firebase
 * Called after successful MySQL sync
 * Triggers any pending cleanups
 * 
 * @param {string} gamePin - The battle game PIN
 * @param {number} winnerId - Winner's user ID
 * @returns {Promise<boolean>}
 */
export const markSyncComplete = async (gamePin, winnerId) => {
  try {
    const syncStatusRef = ref(realtimeDb, `battles/${gamePin}/metadata/syncedToMySQL`);
    
    await set(syncStatusRef, {
      synced: true,
      timestamp: Date.now(),
      winnerId: winnerId
    });

    // Check if there's a pending cleanup
    const pendingCleanupRef = ref(realtimeDb, `battles/${gamePin}/metadata/pendingCleanup`);
    const pendingSnapshot = await get(pendingCleanupRef);
    
    if (pendingSnapshot.exists()) {

      // Check if viewers is 0
      const viewersRef = ref(realtimeDb, `battles/${gamePin}/metadata/viewers`);
      const viewersSnapshot = await get(viewersRef);
      const viewerCount = viewersSnapshot.val() || 0;
      
      if (viewerCount === 0) {
        await deleteBattleRoom(gamePin);
        
      } else {
        
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error marking sync complete:', error);
    return false;
  }
};

/**
 * Check if a battle is safe to cleanup
 * (for manual cleanup or debugging)
 * 
 * @param {string} gamePin - The battle game PIN
 * @returns {Promise<{canCleanup: boolean, reason: string}>}
 */
export const canSafelyCleanup = async (gamePin) => {
  try {
    const battleRef = ref(realtimeDb, `battles/${gamePin}`);
    const snapshot = await get(battleRef);
    
    if (!snapshot.exists()) {
      return { canCleanup: true, reason: 'Battle does not exist' };
    }
    
    const battleData = snapshot.val();
    const viewers = battleData?.metadata?.viewers || 0;
    const synced = battleData?.metadata?.syncedToMySQL?.synced || false;
    
    if (viewers > 0) {
      return { canCleanup: false, reason: `${viewers} viewers still present` };
    }
    
    if (!synced) {
      return { canCleanup: false, reason: 'MySQL sync not confirmed' };
    }
    
    return { canCleanup: true, reason: 'Safe to cleanup' };
    
  } catch (error) {
    console.error('❌ Error checking cleanup safety:', error);
    return { canCleanup: false, reason: `Error: ${error.message}` };
  }
};

export { acquireSyncLock, releaseSyncLock };