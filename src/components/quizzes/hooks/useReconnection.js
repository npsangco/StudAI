import { useState, useEffect, useRef, useCallback } from 'react';
import {
  initializeConnectionTracking,
  sendHeartbeat,
  listenToConnectionState,
  cleanupConnectionTracking,
  rejoinBattle,
  isPlayerOnline
} from '../../../firebase/connectionManager';
import {
  createReconnectionToken,
  verifyReconnectionToken,
  getStoredReconnectionToken,
  invalidateReconnectionToken
} from '../../../firebase/reconnectionTokens';

/**
 * Custom hook for handling reconnection logic
 * Manages heartbeats, disconnect detection, and reconnection flows
 * 
 * @param {string} gamePin - The battle game PIN
 * @param {number} userId - Current user's ID
 * @param {object} playerData - Player info (name, initial, etc.)
 * @param {boolean} isActive - Whether reconnection tracking is active
 */
export function useReconnection(gamePin, userId, playerData, isActive = false) {
  const [connectionState, setConnectionState] = useState({
    isOnline: true,
    isReconnecting: false,
    reconnectionAvailable: false,
    lastHeartbeat: Date.now()
  });
  
  const heartbeatIntervalRef = useRef(null);
  const connectionListenerRef = useRef(null);
  const reconnectionTokenRef = useRef(null);
  const hasInitializedRef = useRef(false);
  
  // ============================================
  // INITIALIZE CONNECTION TRACKING
  // ============================================
  
  useEffect(() => {
    // Prevent double initialization
    if (!isActive || !gamePin || !userId || hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    
    const init = async () => {
      try {
        // Initialize Firebase connection tracking
        await initializeConnectionTracking(gamePin, userId);
        
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
    
    // Send heartbeat every 5 seconds
    heartbeatIntervalRef.current = setInterval(() => {
      if (gamePin && userId) {
        sendHeartbeat(gamePin, userId);
        setConnectionState(prev => ({
          ...prev,
          lastHeartbeat: Date.now()
        }));
      }
    }, 5000);
    
    // Send initial heartbeat
    if (gamePin && userId) {
      sendHeartbeat(gamePin, userId);
    }
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
  // DISCONNECT HANDLING
  // ============================================
  
  const handleDisconnect = useCallback(() => {

    setConnectionState(prev => ({
      ...prev,
      isOnline: false,
      reconnectionAvailable: true
    }));
    
    // Stop heartbeat
    stopHeartbeat();
    
    // Show reconnection opportunity
    // (UI will detect reconnectionAvailable flag)
  }, [stopHeartbeat]);
  
  // ============================================
  // RECONNECTION LOGIC
  // ============================================
  
  const attemptReconnection = useCallback(async () => {
    if (!gamePin || !userId) {
      return { success: false, error: 'Missing game info' };
    }

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
      
      // Attempt to rejoin battle
      const rejoinResult = await rejoinBattle(gamePin, userId);
      
      if (!rejoinResult.success) {
        throw new Error(rejoinResult.error || 'Failed to rejoin');
      }
      
      // Success! Restart heartbeat
      startHeartbeat();
      setupConnectionListener();
      
      setConnectionState({
        isOnline: true,
        isReconnecting: false,
        reconnectionAvailable: false,
        lastHeartbeat: Date.now()
      });

      return {
        success: true,
        playerData: rejoinResult.playerData
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
    
    if (connectionListenerRef.current) {
      connectionListenerRef.current();
      connectionListenerRef.current = null;
    }
    
    if (gamePin && userId) {
      await cleanupConnectionTracking(gamePin, userId);
    }
  }, [gamePin, userId, stopHeartbeat]);
  
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
      lastHeartbeat: 0
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
