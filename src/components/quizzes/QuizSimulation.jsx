import React, { useState, useEffect } from 'react';

// Simulated Players Hook
export const useSimulatedPlayers = (totalQuestions, currentQuestion, lobbyPlayers = []) => {
  const [simulatedPlayers] = useState(() => {
    if (lobbyPlayers.length > 1) {
      return lobbyPlayers
        .filter(p => p.id !== 'user')
        .map(p => ({
          ...p,
          score: 0,
          accuracy: Math.random() * 0.3 + 0.6
        }));
    }
    
    return [
      { id: 1, name: 'Denise', initial: 'D', score: 0, accuracy: 0.85 },
      { id: 2, name: 'Den', initial: 'D', score: 0, accuracy: 0.75 },
      { id: 3, name: 'Nimrod', initial: 'N', score: 0, accuracy: 0.70 },
      { id: 4, name: 'Bins', initial: 'B', score: 0, accuracy: 0.65 }
    ];
  });

  const [players, setPlayers] = useState(simulatedPlayers);

  useEffect(() => {
    if (currentQuestion > 0) {
      const timer = setTimeout(() => {
        setPlayers(prev => prev.map(player => {
          const gotCorrect = Math.random() < player.accuracy;
          return {
            ...player,
            score: gotCorrect ? player.score + 1 : player.score
          };
        }));
      }, Math.random() * 3000 + 1000);

      return () => clearTimeout(timer);
    }
  }, [currentQuestion]);

  return players;
};