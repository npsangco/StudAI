import { useEffect } from 'react';

// Hook to simulate players joining and readying up in the lobby
export const useLobbySimulation = (lobbyPlayers, setLobbyPlayers, isActive) => {
  useEffect(() => {
    if (!isActive) return;

    // Simulate other players joining
    const playerNames = [
      { name: 'Denise', initial: 'D' },
      { name: 'Den', initial: 'D' },
      { name: 'Nimrod', initial: 'N' },
      { name: 'Bins', initial: 'B' }
    ];

    const joinTimers = [];
    const readyTimers = [];

    // Players join one by one
    playerNames.forEach((player, index) => {
      const joinTimer = setTimeout(() => {
        setLobbyPlayers(prev => [...prev, { ...player, id: index + 1, isReady: false }]);
      }, (index + 1) * 1500);
      joinTimers.push(joinTimer);
    });

    // Players click ready randomly after joining
    playerNames.forEach((player, index) => {
      const readyTimer = setTimeout(() => {
        setLobbyPlayers(prev => prev.map(p => 
          p.id === index + 1 ? { ...p, isReady: true } : p
        ));
      }, (index + 1) * 1500 + Math.random() * 3000 + 2000);
      readyTimers.push(readyTimer);
    });

    // Cleanup timers on unmount
    return () => {
      joinTimers.forEach(timer => clearTimeout(timer));
      readyTimers.forEach(timer => clearTimeout(timer));
    };
  }, [isActive, setLobbyPlayers]);
};

// You can enable this by importing and using in Quizzes.jsx:
// import { useLobbySimulation } from '../components/quizzes/QuizLobbySimulation';
// 
// Then in your component:
// useLobbySimulation(lobbyPlayers, setLobbyPlayers, currentView === 'lobby');