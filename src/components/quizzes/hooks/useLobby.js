import { useState, useEffect } from 'react';
import { simulatedPlayerNames } from '../utils/mockData';
import { PLAYER_RADIUS } from '../utils/constants';

export function useLobby(isActive) {
  const [players, setPlayers] = useState([
    { id: 'user', name: 'You', initial: 'Y', isReady: false }
  ]);
  const [playerPositions, setPlayerPositions] = useState([]);

  const markUserReady = () => {
    setPlayers(prev =>
      prev.map(p => (p.id === 'user' ? { ...p, isReady: true } : p))
    );
  };

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

  // Simulate other players joining
  useEffect(() => {
    if (!isActive) return;

    const joinTimers = [];
    const readyTimers = [];

    simulatedPlayerNames.forEach((player, index) => {
      const joinTimer = setTimeout(() => {
        setPlayers(prev => [...prev, { ...player, id: index + 1, isReady: false }]);
      }, (index + 1) * 1500);
      joinTimers.push(joinTimer);

      const readyTimer = setTimeout(() => {
        setPlayers(prev =>
          prev.map(p => (p.id === index + 1 ? { ...p, isReady: true } : p))
        );
      }, (index + 1) * 1500 + Math.random() * 3000 + 2000);
      readyTimers.push(readyTimer);
    });

    return () => {
      joinTimers.forEach(timer => clearTimeout(timer));
      readyTimers.forEach(timer => clearTimeout(timer));
    };
  }, [isActive]);

  return {
    players,
    playerPositions,
    setPlayerPositions,
    markUserReady,
    allReady
  };
}