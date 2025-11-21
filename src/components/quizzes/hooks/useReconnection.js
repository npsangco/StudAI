import { useState, useEffect, useRef, useCallback } from 'react';
import {
  initializeConnectionTracking,
  sendHeartbeat,
  listenToConnectionState,
  cleanupConnectionTracking,
  rejoinBattle,
  isPlayerOnline,
  checkGracePeriod,
  markAsForfeited,
  savePlayerState,
  restorePlayerState,
  clearSavedState
} from '../../../firebase/connectionManager';
import {
  createReconnectionToken,
  verifyReconnectionToken,
  getStoredReconnectionToken,
  invalidateReconnectionToken
} from '../../../firebase/reconnectionTokens';

/**
 * Custom hook for handling reconnection logic
 * Manages heartbeats, disconnect detection, reconnection flows, and state preservation
 * 
 * @param {string} gamePin - The battle game PIN
 * @param {number} userId - Current user's ID
 * @param {object} playerData - Player info (name, initial, etc.)
 * @param {boolean} isActive - Whether reconnection tracking is active
 * @param {object} gameState - Current game state to preserve (score, currentQuestionIndex, userAnswers)
 */
export function useReconnection(gamePin, userId, playerData, isActive = false, gameState = null) {
  const [connectionState, setConnectionState] = useState({
    isOnline: true,
    isReconnecting: false,
    reconnectionAvailable: false,
    lastHeartbeat: Date.now(),
    inGracePeriod: false,
    gracePeriodTimeRemaining: 0
  });
  
  const heartbeatIntervalRef = useRef(null);
  const connectionListenerRef = useRef(null);
  const reconnectionTokenRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const gracePeriodTimerRef = useRef(null);
  const gracePeriodCheckIntervalRef = useRef(null);
  
  // ============================================
  // INITIALIZE CONNECTION TRACKING
  // ============================================
  
  useEffect(() => {
    console.log('🔍 useReconnection useEffect triggered:', { isActive, gamePin, userId, hasInitialized: hasInitializedRef.current });

    // 🔥 FIX: Allow re-initialization if isActive changes from false to true
    // This handles cases where the component mounts before battle data is ready
    if (!isActive || !gamePin || !userId) {
      console.log('⏭️ Skipping connection init - Missing requirements:', {
        isActive,
        gamePin,
        userId
      });

      // If we were previously initialized but now inactive, cleanup
      if (hasInitializedRef.current && !isActive) {
        console.log('🧹 Cleaning up previous initialization due to isActive=false');
        cleanup();
        hasInitializedRef.current = false;
      }

      return;
    }

    // Prevent duplicate initialization for the same session
    if (hasInitializedRef.current) {
      console.log('⏭️ Already initialized, skipping');
      return;
    }

    console.log('🔌 Initializing connection tracking:', { gamePin, userId });
    hasInitializedRef.current = true;
    
    const init = async () => {
      try {
        // Initialize Firebase connection tracking
        console.log('🚀 Calling initializeConnectionTracking...');
        await initializeConnectionTracking(gamePin, userId);
        console.log('✅ Connection tracking initialized');
        
        // Create reconnection token
        if (playerData) {
          const token = await createReconnectionToken(gamePin, userId, playerData);
          reconnectionTokenRef.current = token;
          
        }
        
        // Start heartbeat
        startHeartbeat();
        
        // Listen to connection state changes
        setupConnectionListener();
        
      } catch (error) {

        hasInitializedRef.current = false; // Allow retry
      }
    };
    
    init();
    
    return () => {
      
      cleanup();
      hasInitializedRef.current = false;
    };
  }, [isActive, gamePin, userId]); // Remove playerData from dependencies to prevent re-init
  
  // ============================================
  // HEARTBEAT MECHANISM
  // ============================================
  
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // 🔥 FIX: Send initial heartbeat immediately BEFORE starting interval
    // This prevents double-sending at T=0
    if (gamePin && userId) {
      sendHeartbeat(gamePin, userId);
      setConnectionState(prev => ({
        ...prev,
        lastHeartbeat: Date.now()
      }));
    }

    // Send heartbeat every 5 seconds (starting at T=5s)
    heartbeatIntervalRef.current = setInterval(() => {
      if (gamePin && userId) {
        sendHeartbeat(gamePin, userId);
        setConnectionState(prev => ({
          ...prev,
          lastHeartbeat: Date.now()
        }));
      }
    }, 5000);
  }, [gamePin, userId]);
  
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      
    }
  }, []);
  
  // ============================================
  // CONNECTION STATE LISTENER
  // ============================================
  
  const setupConnectionListener = useCallback(() => {
    if (!gamePin || !userId) return;

    const unsubscribe = listenToConnectionState(gamePin, userId, (state) => {

      setConnectionState(prev => {
        const wasOnline = prev.isOnline;
        const isNowOnline = state.isOnline;
        
        // Detect disconnect
        if (wasOnline && !isNowOnline) {
          
          handleDisconnect();
        }
        
        return {
          ...prev,
          isOnline: isNowOnline,
          lastHeartbeat: state.lastHeartbeat
        };
      });
    });
    
    connectionListenerRef.current = unsubscribe;
  }, [gamePin, userId]);
  
  // ============================================
  // DISCONNECT HANDLING WITH GRACE PERIOD
  // ============================================

  // 🔥 MOVED BEFORE handleDisconnect to fix circular dependency
  const startGracePeriodMonitoring = useCallback(() => {
    // Clear any existing timer
    if (gracePeriodTimerRef.current) {
      clearTimeout(gracePeriodTimerRef.current);
    }
    if (gracePeriodCheckIntervalRef.current) {
      clearInterval(gracePeriodCheckIntervalRef.current);
    }
    
    // Check grace period status every second
    gracePeriodCheckIntervalRef.current = setInterval(async () => {
      if (!gamePin || !userId) return;
      
      const status = await checkGracePeriod(gamePin, userId);
      
      setConnectionState(prev => ({
        ...prev,
        inGracePeriod: status.inGracePeriod,
        gracePeriodTimeRemaining: status.timeRemaining
      }));
      
      // If forfeited, stop monitoring
      if (status.isForfeited) {
        if (gracePeriodCheckIntervalRef.current) {
          clearInterval(gracePeriodCheckIntervalRef.current);
        }
        setConnectionState(prev => ({
          ...prev,
          reconnectionAvailable: false,
          inGracePeriod: false
        }));
      }
    }, 1000); // Check every second
    
    // Set timeout for forfeit after 90 seconds
    gracePeriodTimerRef.current = setTimeout(async () => {
      if (gamePin && userId) {
        await markAsForfeited(gamePin, userId);
        
        setConnectionState(prev => ({
          ...prev,
          reconnectionAvailable: false,
          inGracePeriod: false,
          gracePeriodTimeRemaining: 0
        }));
        
        if (gracePeriodCheckIntervalRef.current) {
          clearInterval(gracePeriodCheckIntervalRef.current);
        }
      }
    }, 90000); // 90 seconds
  }, [gamePin, userId]);
  
  const stopGracePeriodMonitoring = useCallback(() => {
    if (gracePeriodTimerRef.current) {
      clearTimeout(gracePeriodTimerRef.current);
      gracePeriodTimerRef.current = null;
    }
    if (gracePeriodCheckIntervalRef.current) {
      clearInterval(gracePeriodCheckIntervalRef.current);
      gracePeriodCheckIntervalRef.current = null;
    }
  }, []);

  const handleDisconnect = useCallback(async () => {

    setConnectionState(prev => ({
      ...prev,
      isOnline: false,
      reconnectionAvailable: true,
      inGracePeriod: true,
      gracePeriodTimeRemaining: 90 // 90 seconds
    }));

    // Save current game state for reconnection
    if (gamePin && userId && gameState) {
      await savePlayerState(gamePin, userId, gameState);
    }

    // Stop heartbeat
    stopHeartbeat();

    // Start grace period countdown
    startGracePeriodMonitoring();

    // Show reconnection opportunity
    // (UI will detect reconnectionAvailable flag)
  }, [stopHeartbeat, gamePin, userId, gameState, startGracePeriodMonitoring]);

  // ============================================
  // RECONNECTION LOGIC
  // ============================================
  
  const attemptReconnection = useCallback(async () => {
    if (!gamePin || !userId) {
      return { success: false, error: 'Missing game info' };
    }

    // 🔥 NEW: Check if grace period has expired BEFORE attempting reconnection
    const gracePeriodStatus = await checkGracePeriod(gamePin, userId);

    if (gracePeriodStatus.isForfeited) {
      console.error('❌ Cannot reconnect - grace period expired and player forfeited');
      return {
        success: false,
        error: 'Reconnection window expired. You have been marked as forfeited.'
      };
    }

    if (!gracePeriodStatus.inGracePeriod && gracePeriodStatus.timeRemaining === 0) {
      console.error('❌ Cannot reconnect - grace period expired');
      return {
        success: false,
        error: 'Reconnection window expired (90 seconds)'
      };
    }

    // 🔥 CRITICAL FIX: Stop grace period monitoring IMMEDIATELY when reconnection starts
    // This prevents the forfeit timer from firing during reconnection
    stopGracePeriodMonitoring();

    setConnectionState(prev => ({
      ...prev,
      isReconnecting: true
    }));
    
    try {
      // Get stored token
      const storedToken = getStoredReconnectionToken(gamePin, userId);

      if (!storedToken) {
        throw new Error('No reconnection token found');
      }

      // Verify token with Firebase
      const verification = await verifyReconnectionToken(
        gamePin,
        userId,
        storedToken.token
      );

      if (!verification.valid) {
        throw new Error(verification.error || 'Invalid token');
      }

      // 🔥 CRITICAL FIX: Attempt to rejoin battle (this also checks if battle exists)
      const rejoinResult = await rejoinBattle(gamePin, userId);

      if (!rejoinResult.success) {
        // Battle doesn't exist or can't be rejoined
        throw new Error(rejoinResult.error || 'Battle no longer available');
      }
      
      // Restore saved game state
      const stateResult = await restorePlayerState(gamePin, userId);
      
      // Success! Restart heartbeat and clear grace period
      startHeartbeat();
      setupConnectionListener();
      stopGracePeriodMonitoring();
      
      // Clear saved state after successful restore
      if (stateResult.success) {
        await clearSavedState(gamePin, userId);
      }
      
      setConnectionState({
        isOnline: true,
        isReconnecting: false,
        reconnectionAvailable: false,
        lastHeartbeat: Date.now(),
        inGracePeriod: false,
        gracePeriodTimeRemaining: 0
      });

      return {
        success: true,
        playerData: rejoinResult.playerData,
        savedState: stateResult.success ? stateResult.state : null
      };
      
    } catch (error) {

      setConnectionState(prev => ({
        ...prev,
        isReconnecting: false,
        reconnectionAvailable: false
      }));
      
      return {
        success: false,
        error: error.message
      };
    }
  }, [gamePin, userId, startHeartbeat, setupConnectionListener]);
  
  // ============================================
  // CLEANUP
  // ============================================
  
  const cleanup = useCallback(async () => {

    stopHeartbeat();
    stopGracePeriodMonitoring();
    
    if (connectionListenerRef.current) {
      connectionListenerRef.current();
      connectionListenerRef.current = null;
    }
    
    if (gamePin && userId) {
      await cleanupConnectionTracking(gamePin, userId);
    }
  }, [gamePin, userId, stopHeartbeat, stopGracePeriodMonitoring]);
  
  // ============================================
  // MANUAL DISCONNECT (LEAVE BATTLE)
  // ============================================
  
  const disconnect = useCallback(async () => {

    // Invalidate reconnection token
    if (gamePin && userId) {
      await invalidateReconnectionToken(gamePin, userId);
    }
    
    await cleanup();
    
    setConnectionState({
      isOnline: false,
      isReconnecting: false,
      reconnectionAvailable: false,
      lastHeartbeat: 0,
      inGracePeriod: false,
      gracePeriodTimeRemaining: 0
    });
    
    hasInitializedRef.current = false; // Allow re-init if needed
  }, [gamePin, userId, cleanup]);
  
  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  const checkIfPlayerOnline = useCallback(async () => {
    if (!gamePin || !userId) return false;
    return await isPlayerOnline(gamePin, userId);
  }, [gamePin, userId]);
  
  return {
    // State
    connectionState,
    
    // Methods
    attemptReconnection,
    disconnect,
    checkIfPlayerOnline,
    
    // Refs (for advanced usage)
    reconnectionToken: reconnectionTokenRef.current
  };
}
