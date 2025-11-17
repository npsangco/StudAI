import { ref, set, get, remove } from 'firebase/database';
import { realtimeDb } from './config';

/**
 * Reconnection Token System
 * Secure tokens stored in localStorage + Firebase for reconnection validation
 */

// ============================================
// 🎟️ TOKEN GENERATION & STORAGE
// ============================================

/**
 * Generate a secure reconnection token
 */
const generateToken = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create reconnection token for a player
 * Stored in both localStorage and Firebase
 */
export const createReconnectionToken = async (gamePin, userId, playerData) => {
  try {
    const token = generateToken();
    const tokenData = {
      token,
      gamePin,
      userId,
      playerName: playerData.name,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
    };
    
    // Store in Firebase
    const tokenRef = ref(realtimeDb, `battles/${gamePin}/reconnectionTokens/user_${userId}`);
    await set(tokenRef, tokenData);
    
    // Store in localStorage
    localStorage.setItem(`reconnect_${gamePin}_${userId}`, JSON.stringify(tokenData));
    
    return token;
    
  } catch (error) {
    console.error('❌ Error creating reconnection token:', error);
    throw error;
  }
};

/**
 * Verify reconnection token
 * Checks both localStorage and Firebase
 */
export const verifyReconnectionToken = async (gamePin, userId, token) => {
  try {

    // Get token from Firebase
    const tokenRef = ref(realtimeDb, `battles/${gamePin}/reconnectionTokens/user_${userId}`);
    const snapshot = await get(tokenRef);
    
    if (!snapshot.exists()) {
      
      return { valid: false, error: 'Token not found' };
    }
    
    const tokenData = snapshot.val();
    
    // Check if token matches
    if (tokenData.token !== token) {
      
      return { valid: false, error: 'Invalid token' };
    }
    
    // Check if expired
    if (Date.now() > tokenData.expiresAt) {
      
      await remove(tokenRef); // Clean up expired token
      return { valid: false, error: 'Token expired' };
    }

    return {
      valid: true,
      tokenData
    };
    
  } catch (error) {
    console.error('❌ Error verifying token:', error);
    return { valid: false, error: 'Verification failed' };
  }
};

/**
 * Get reconnection token from localStorage
 */
export const getStoredReconnectionToken = (gamePin, userId) => {
  try {
    const key = `reconnect_${gamePin}_${userId}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return null;
    }
    
    const tokenData = JSON.parse(stored);
    
    // Check if expired
    if (Date.now() > tokenData.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    
    return tokenData;
    
  } catch (error) {
    console.error('❌ Error getting stored token:', error);
    return null;
  }
};

/**
 * Check if user has valid reconnection token
 */
export const hasValidReconnectionToken = (gamePin, userId) => {
  const tokenData = getStoredReconnectionToken(gamePin, userId);
  return tokenData !== null;
};

/**
 * Invalidate reconnection token
 * Called when player officially leaves or battle ends
 */
export const invalidateReconnectionToken = async (gamePin, userId) => {
  try {
    // Remove from Firebase
    const tokenRef = ref(realtimeDb, `battles/${gamePin}/reconnectionTokens/user_${userId}`);
    await remove(tokenRef);
    
    // Remove from localStorage
    const key = `reconnect_${gamePin}_${userId}`;
    localStorage.removeItem(key);

  } catch (error) {
    console.error('❌ Error invalidating token:', error);
  }
};

/**
 * Clean up all expired tokens for a battle
 * Should be called periodically by host
 */
export const cleanupExpiredTokens = async (gamePin) => {
  try {
    const tokensRef = ref(realtimeDb, `battles/${gamePin}/reconnectionTokens`);
    const snapshot = await get(tokensRef);
    
    if (!snapshot.exists()) {
      return;
    }
    
    const tokens = snapshot.val();
    const now = Date.now();
    let cleaned = 0;
    
    for (const [userId, tokenData] of Object.entries(tokens)) {
      if (now > tokenData.expiresAt) {
        await remove(ref(realtimeDb, `battles/${gamePin}/reconnectionTokens/${userId}`));
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up tokens:', error);
  }
};

/**
 * Check for active reconnection opportunity on page load
 * Returns reconnection info if found
 */
export const checkForReconnectionOpportunity = () => {
  try {
    // Scan localStorage for any active reconnection tokens
    const keys = Object.keys(localStorage).filter(key => key.startsWith('reconnect_'));
    
    if (keys.length === 0) {
      return null;
    }
    
    // Get the most recent token
    let latestToken = null;
    let latestTime = 0;
    
    for (const key of keys) {
      try {
        const tokenData = JSON.parse(localStorage.getItem(key));
        
        // Skip expired
        if (Date.now() > tokenData.expiresAt) {
          localStorage.removeItem(key);
          continue;
        }
        
        if (tokenData.createdAt > latestTime) {
          latestTime = tokenData.createdAt;
          latestToken = tokenData;
        }
      } catch (e) {
        // Invalid token, remove it
        localStorage.removeItem(key);
      }
    }
    
    return latestToken;
    
  } catch (error) {
    console.error('❌ Error checking reconnection opportunity:', error);
    return null;
  }
};

/**
 * Clear all reconnection tokens (logout/clear data)
 */
export const clearAllReconnectionTokens = () => {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('reconnect_'));
    
    for (const key of keys) {
      localStorage.removeItem(key);
    }

  } catch (error) {
    console.error('❌ Error clearing tokens:', error);
  }
};