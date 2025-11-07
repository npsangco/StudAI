import { useState, useEffect } from 'react';
import { 
  listenToPlayers, 
  markPlayerReady, 
  removePlayerFromBattle 
} from '../../../firebase/battleOperations';
import { PLAYER_RADIUS } from '../utils/constants';

export function useLobby(isActive, gamePin, currentUserId, isHost) {
  const [players, setPlayers] = useState([]);
  const [playerPositions, setPlayerPositions] = useState([]);

  // 🔥 REAL-TIME LISTENER: Subscribe to players in Firebase
  useEffect(() => {
    if (!isActive || !gamePin) return;
    
    console.log('🔥 Subscribing to players for PIN:', gamePin);
    
    // Listen to Firebase players
    const unsubscribe = listenToPlayers(gamePin, (firebasePlayers) => {
      console.log('📡 Players updated:', firebasePlayers);
      
      // Transform Firebase data to match your existing format
      const transformedPlayers = firebasePlayers.map(p => ({
        id: `user_${p.userId}`,
        name: p.name,
        initial: p.initial,
        isReady: p.isReady,
        score: p.score || 0,
        isOnline: p.isOnline,
        userId: p.userId // Keep original userId for comparison
      }));
      
      setPlayers(transformedPlayers);
    });
    
    // Cleanup: Unsubscribe when component unmounts
    return () => {
      console.log('🔥 Unsubscribing from players');
      unsubscribe();
    };
  }, [isActive, gamePin]);

  // Mark current user as ready
  const markUserReady = async () => {
    if (!gamePin || !currentUserId) return;
    
    try {
      await markPlayerReady(gamePin, currentUserId);
      console.log('✅ Marked self as ready');
    } catch (error) {
      console.error('❌ Error marking ready:', error);
    }
  };

  // Get current user player object
  const userPlayer = players.find(p => p.userId === currentUserId);
  
  // Check if all players are ready
  const readyCount = players.filter(p => p.isReady).length;
  const allReady = players.length > 1 && players.every(p => p.isReady);

  // Generate initial positions for new players
  useEffect(() => {
    if (isActive && players.length > 0) {
      setPlayerPositions(prev => {
        const newPositions = [...prev];
        const radius = PLAYER_RADIUS;

        for (let i = prev.length; i < players.length; i++) {
          let x, y, tooClose;
          let attempts = 0;

          do {
            x = Math.random() * (100 - radius * 4) + radius * 2;
            y = Math.random() * (73 - radius * 2) + (12 + radius);
            tooClose = false;

            for (let j = 0; j < newPositions.length; j++) {
              const dx = x - newPositions[j].x;
              const dy = y - newPositions[j].y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < radius * 2 + 3) {
                tooClose = true;
                break;
              }
            }

            attempts++;
          } while (tooClose && attempts < 50);

          newPositions.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.2
          });
        }

        return newPositions;
      });
    }
  }, [players.length, isActive]);

  return {
    players,
    playerPositions,
    setPlayerPositions,
    markUserReady,
    allReady,
    userPlayer,
    readyCount
  };
}