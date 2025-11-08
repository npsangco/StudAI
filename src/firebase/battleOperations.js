// src/firebase/battleOperations.js
import { ref, set, update, remove, onValue, get, serverTimestamp } from 'firebase/database';
import { realtimeDb } from './config';

// ============================================
// 🎮 BATTLE ROOM OPERATIONS
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
        createdAt: Date.now()
      },
      players: {}, // Empty at start
      answers: {}
    });
    
    console.log('✅ Firebase battle room created:', gamePin);
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
      isReady: false,
      score: 0,
      isOnline: true,
      joinedAt: Date.now()
    });
    
    console.log('✅ Player added to Firebase:', playerData.name);
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
    console.log('✅ Player marked ready:', userId);
  } catch (error) {
    console.error('❌ Error marking ready:', error);
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
    console.log('✅ Battle status updated:', status);
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
    console.log('✅ Progress updated for user:', userId, '→ Q', questionIndex);
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
    console.log('✅ Question advanced to:', questionIndex);
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
    console.log('✅ Score updated for user:', userId, '→', newScore);
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
    console.log('✅ Player removed:', userId);
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
    console.log('✅ Battle room deleted:', gamePin);
  } catch (error) {
    console.error('❌ Error deleting battle:', error);
    throw error;
  }
};

// ============================================
// 📡 REAL-TIME LISTENERS
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
    const questionsRef = ref(realtimeDb, `battles/${gamePin}/questions`);
    await set(questionsRef, questions);
    console.log('✅ Questions stored in Firebase:', questions.length);
  } catch (error) {
    console.error('❌ Error storing questions:', error);
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
      console.log('📚 Questions received from Firebase!');
      callback(questions);
    }
  });
};

// ============================================
// 💾 SYNC BATTLE RESULTS TO MYSQL
// ============================================

/**
 * Sync final battle results from Firebase to MySQL
 * Called after battle completes and leaderboard is shown
 * 
 * @param {string} gamePin - The battle game PIN
 * @returns {Promise<boolean>} - Success status
 */
export const syncBattleResultsToMySQL = async (gamePin) => {
  try {
    console.log('🔄 Starting sync for battle:', gamePin);
    
    // 1. Get final battle data from Firebase
    const battleRef = ref(realtimeDb, `battles/${gamePin}`);
    const snapshot = await get(battleRef);
    
    if (!snapshot.exists()) {
      console.error('❌ Battle not found in Firebase:', gamePin);
      return false;
    }
    
    const battleData = snapshot.val();
    const players = battleData.players ? Object.values(battleData.players) : [];
    
    if (players.length === 0) {
      console.error('❌ No players found in battle:', gamePin);
      return false;
    }
    
    // 2. Determine winner (highest score)
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];
    const winnerId = winner.userId;
    
    console.log('🏆 Winner:', winner.name, 'with score:', winner.score);
    
    // 3. Send to MySQL API
    const response = await fetch(`http://localhost:4000/api/quizzes/battle/${gamePin}/sync-results`, {
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
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ MySQL sync failed:', errorData);
      return false;
    }
    
    const result = await response.json();
    console.log('✅ MySQL sync successful:', result);
    
    return true;
    
  } catch (error) {
    console.error('❌ Fatal sync error:', error);
    return false;
  }
};