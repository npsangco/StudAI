import { ref, push, set, get, update, onValue, serverTimestamp, query, orderByChild, limitToLast } from 'firebase/database';
import { realtimeDb } from './config';

/**
 * Emoji Reaction Operations for Quiz Battles
 */

// ============================================
// SEND REACTION
// ============================================

/**
 * Send an emoji reaction during battle
 * @param {string} gamePin - Battle PIN
 * @param {object} reactionData - { userId, userName, emoji }
 */
export const sendReaction = async (gamePin, reactionData) => {
  try {
    const reactionsRef = ref(realtimeDb, `battles/${gamePin}/reactions`);
    const newReactionRef = push(reactionsRef);

    const reactionId = newReactionRef.key;
    const now = Date.now();

    await set(newReactionRef, {
      reactionId,
      userId: reactionData.userId,
      userName: reactionData.userName,
      emoji: reactionData.emoji,
      timestamp: now,
      expiresAt: now + 5000 // 5 seconds TTL
    });

    console.log(`✅ Reaction sent: ${reactionData.emoji} by ${reactionData.userName}`);
    return { success: true, reactionId };

  } catch (error) {
    console.error('❌ Error sending reaction:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// LISTEN TO REACTIONS
// ============================================

/**
 * Listen to reactions in real-time
 * @param {string} gamePin - Battle PIN
 * @param {function} callback - Called with array of recent reactions
 */
export const listenToReactions = (gamePin, callback) => {
  const reactionsRef = ref(realtimeDb, `battles/${gamePin}/reactions`);
  const recentReactionsQuery = query(reactionsRef, orderByChild('timestamp'), limitToLast(20));

  return onValue(recentReactionsQuery, (snapshot) => {
    const reactions = [];
    const now = Date.now();

    snapshot.forEach((childSnapshot) => {
      const reaction = childSnapshot.val();

      // Filter out expired reactions (older than 5 seconds)
      if (reaction.expiresAt > now) {
        reactions.push({
          ...reaction,
          id: childSnapshot.key
        });
      }
    });

    // Sort by timestamp (newest first for display)
    reactions.sort((a, b) => b.timestamp - a.timestamp);

    callback(reactions);
  });
};

// ============================================
// CLEANUP EXPIRED REACTIONS
// ============================================

/**
 * Cleanup expired reactions (called periodically)
 * @param {string} gamePin - Battle PIN
 */
export const cleanupExpiredReactions = async (gamePin) => {
  try {
    const reactionsRef = ref(realtimeDb, `battles/${gamePin}/reactions`);
    const snapshot = await get(reactionsRef);

    if (!snapshot.exists()) return;

    const now = Date.now();
    const updates = {};

    snapshot.forEach((childSnapshot) => {
      const reaction = childSnapshot.val();
      if (reaction.expiresAt <= now) {
        updates[childSnapshot.key] = null; // Delete expired
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(reactionsRef, updates);
      console.log(`🧹 Cleaned up ${Object.keys(updates).length} expired reactions`);
    }

  } catch (error) {
    console.error('❌ Error cleaning reactions:', error);
  }
};
