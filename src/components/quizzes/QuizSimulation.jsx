import React, { useState, useEffect } from 'react';

// Live Leaderboard Component for Battle Mode
export const LiveLeaderboard = ({ players, currentPlayerName = 'You' }) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h3 className="font-bold text-lg mb-4 text-center">Live Leaderboard</h3>
      <div className="space-y-2">
        {sortedPlayers.map((player, index) => (
          <div 
            key={player.id} 
            className={`flex items-center justify-between p-3 rounded-lg ${
              player.name === currentPlayerName ? 'bg-yellow-100 border-yellow-300 border' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                index === 0 ? 'bg-yellow-500' : 
                index === 1 ? 'bg-gray-400' : 
                index === 2 ? 'bg-orange-400' : 'bg-gray-600'
              }`}>
                {player.initial}
              </div>
              <div>
                <div className={`font-semibold ${player.name === currentPlayerName ? 'text-yellow-800' : 'text-black'}`}>
                  {player.name === currentPlayerName ? 'You' : player.name}
                </div>
                <div className="text-xs text-gray-500">
                  {index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} place
                </div>
              </div>
            </div>
            <div className={`font-bold ${
              index === 0 ? 'text-green-600' : 'text-gray-600'
            }`}>
              {player.score}pts
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Simulated Players Hook - ONLY used during actual quiz battle gameplay
// This creates AI opponents that answer questions during the game
export const useSimulatedPlayers = (totalQuestions, currentQuestion, lobbyPlayers = []) => {
  // If lobbyPlayers are provided (from real lobby), use those
  // Otherwise fall back to default simulated players
  const [simulatedPlayers] = useState(() => {
    if (lobbyPlayers.length > 1) {
      // Use the players from lobby (excluding the user)
      return lobbyPlayers
        .filter(p => p.id !== 'user')
        .map(p => ({
          ...p,
          score: 0,
          accuracy: Math.random() * 0.3 + 0.6 // Random accuracy between 60-90%
        }));
    }
    
    // Default simulated players if no lobby data
    return [
      { id: 1, name: 'Denise', initial: 'D', score: 0, accuracy: 0.85 },
      { id: 2, name: 'Den', initial: 'D', score: 0, accuracy: 0.75 },
      { id: 3, name: 'Nimrod', initial: 'N', score: 0, accuracy: 0.70 },
      { id: 4, name: 'Bins', initial: 'B', score: 0, accuracy: 0.65 }
    ];
  });

  const [players, setPlayers] = useState(simulatedPlayers);

  // Simulate other players answering when current question changes
  useEffect(() => {
    if (currentQuestion > 0) {
      const timer = setTimeout(() => {
        setPlayers(prev => prev.map(player => {
          // Simulate answer based on player's accuracy
          const gotCorrect = Math.random() < player.accuracy;
          return {
            ...player,
            score: gotCorrect ? player.score + 1 : player.score
          };
        }));
      }, Math.random() * 3000 + 1000); // Random delay 1-4 seconds

      return () => clearTimeout(timer);
    }
  }, [currentQuestion]);

  return players;
};