import React, { useEffect, useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import { PHYSICS_UPDATE_INTERVAL, PLAYER_RADIUS } from '../utils/constants';

// Animations
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-20px);
    }
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
    }
    50% {
      box-shadow: 0 0 40px rgba(34, 197, 94, 0.8);
    }
  }

  .animate-fade-in {
    animation: fadeIn 0.5s ease-out;
  }

  .animate-float {
    animation: float 3s ease-in-out infinite;
  }

  .animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }

  .player-icon {
    transition: transform 0.3s ease;
    cursor: pointer;
  }

  .player-icon:hover {
    transform: scale(1.1);
  }

  body, html {
    overflow: hidden !important;
  }
`;

// Solo Loading Screen Component
export const SoloLoadingScreen = ({ countdown, quizTitle }) => {
  const proTips = [
    "💪 Read each question carefully!",
    "🎯 Trust your first instinct!",
    "⏰ Manage your time wisely!",
    "🧠 Stay calm and focused!",
    "✨ Every question is an opportunity!"
  ];
  
  const [randomTip] = useState(() => proTips[Math.floor(Math.random() * proTips.length)]);
  
  return (
    <>
      <style>{styles}</style>
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={`q-${i}`}
              className="absolute text-6xl opacity-20 animate-float"
              style={{
                left: `${(i * 15) % 100}%`,
                top: `${(i * 20) % 100}%`,
                animationDuration: `${3 + (i % 3)}s`
              }}
            >
              ?
            </div>
          ))}
          
          {[...Array(5)].map((_, i) => (
            <div
              key={`circle-${i}`}
              className="absolute rounded-full bg-white opacity-10"
              style={{
                width: `${100 + i * 50}px`,
                height: `${100 + i * 50}px`,
                left: `${20 + i * 15}%`,
                top: `${30 + i * 10}%`,
                animation: `pulse-glow ${2 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`
              }}
            />
          ))}
        </div>

        <div className="text-center animate-fade-in z-10 relative px-4">
          <div className="mb-6 relative">
            <div className="w-32 h-32 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl">
              <div className="text-8xl font-bold text-yellow-500 animate-bounce">
                {countdown}
              </div>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-black mb-3 drop-shadow-lg">
            Get Ready!
          </h2>
          <p className="text-gray-800 text-xl font-semibold mb-6">
            {quizTitle}
          </p>

          <div className="mt-8 max-w-md mx-auto">
            <div className="bg-white bg-opacity-90 rounded-2xl p-4 shadow-lg">
              <p className="text-sm text-gray-700 font-medium">
                <span className="font-bold">Pro Tip:</span> {randomTip}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Battle Lobby Screen Component
export const BattleLobbyScreen = ({ 
  lobbyPlayers, 
  playerPositions: externalPositions,
  quizTitle, 
  onUserReady, 
  onLeave,
  setPlayerPositions,
  gamePin,       
  isHost,        
  onStartBattle   
}) => {
  const [playerPositions, setLocalPlayerPositions] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false); 

  // Copy PIN function
  const handleCopyPin = () => {
    if (gamePin) {
      navigator.clipboard.writeText(gamePin);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  useEffect(() => {
    if (externalPositions && externalPositions.length > 0) {
      setLocalPlayerPositions(prev => {
        if (prev.length === 0) {
          return externalPositions;
        }
        
        if (externalPositions.length > prev.length) {
          const newPositions = [...prev];
          for (let i = prev.length; i < externalPositions.length; i++) {
            newPositions.push(externalPositions[i]);
          }
          return newPositions;
        }
        
        return prev;
      });
    }
  }, [externalPositions?.length]);

  useEffect(() => {
    const animationInterval = setInterval(() => {
      setLocalPlayerPositions(prev => {
        if (!prev || prev.length === 0) return prev;
        
        const radius = PLAYER_RADIUS;
        
        let newPositions = prev.map((pos) => ({
          x: pos.x,
          y: pos.y,
          vx: pos.vx,
          vy: pos.vy
        }));

        for (let i = 0; i < newPositions.length; i++) {
          for (let j = i + 1; j < newPositions.length; j++) {
            const dx = newPositions[j].x - newPositions[i].x;
            const dy = newPositions[j].y - newPositions[i].y;
            const currentDist = Math.sqrt(dx * dx + dy * dy);
            
            const nextX_i = newPositions[i].x + newPositions[i].vx;
            const nextY_i = newPositions[i].y + newPositions[i].vy;
            const nextX_j = newPositions[j].x + newPositions[j].vx;
            const nextY_j = newPositions[j].y + newPositions[j].vy;
            
            const nextDx = nextX_j - nextX_i;
            const nextDy = nextY_j - nextY_i;
            const nextDist = Math.sqrt(nextDx * nextDx + nextDy * nextDy);
            
            const minDist = radius * 2;
            
            if (currentDist <= minDist || nextDist <= minDist) {
              if (currentDist < 0.001) continue;
              
              const nx = dx / currentDist;
              const ny = dy / currentDist;
              
              const rvx = newPositions[j].vx - newPositions[i].vx;
              const rvy = newPositions[j].vy - newPositions[i].vy;
              const rvn = rvx * nx + rvy * ny;
              
              if (rvn < 0) {
                const bounce = 0.5;
                const impulse = (1 + bounce) * rvn * 0.7;
                
                newPositions[i].vx += impulse * nx;
                newPositions[i].vy += impulse * ny;
                newPositions[j].vx -= impulse * nx;
                newPositions[j].vy -= impulse * ny;
                
                if (currentDist < minDist) {
                  const overlap = minDist - currentDist;
                  const pushDist = overlap / 2;
                  
                  newPositions[i].x -= pushDist * nx;
                  newPositions[i].y -= pushDist * ny;
                  newPositions[j].x += pushDist * nx;
                  newPositions[j].y += pushDist * ny;
                }
              }
            }
          }
        }

        for (let i = 0; i < newPositions.length; i++) {
          newPositions[i].x += newPositions[i].vx;
          newPositions[i].y += newPositions[i].vy;
        }

        for (let i = 0; i < newPositions.length; i++) {
          if (newPositions[i].x - radius <= 0) {
            newPositions[i].x = radius;
            newPositions[i].vx = Math.abs(newPositions[i].vx) * 0.85;
          }
          if (newPositions[i].x + radius >= 100) {
            newPositions[i].x = 100 - radius;
            newPositions[i].vx = -Math.abs(newPositions[i].vx) * 0.85;
          }
          if (newPositions[i].y - radius <= 8) {
            newPositions[i].y = 8 + radius;
            newPositions[i].vy = Math.abs(newPositions[i].vy) * 0.85;
          }
          if (newPositions[i].y + radius >= 88) {
            newPositions[i].y = 88 - radius;
            newPositions[i].vy = -Math.abs(newPositions[i].vy) * 0.85;
          }
        }

        for (let pass = 0; pass < 5; pass++) {
          let foundOverlap = false;
          
          for (let i = 0; i < newPositions.length; i++) {
            for (let j = i + 1; j < newPositions.length; j++) {
              const dx = newPositions[j].x - newPositions[i].x;
              const dy = newPositions[j].y - newPositions[i].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              const minDist = radius * 2;
              
              if (dist < minDist && dist > 0.001) {
                foundOverlap = true;
                
                const nx = dx / dist;
                const ny = dy / dist;
                const overlap = minDist - dist;
                const pushDist = overlap / 2;
                
                newPositions[i].x -= pushDist * nx;
                newPositions[i].y -= pushDist * ny;
                newPositions[j].x += pushDist * nx;
                newPositions[j].y += pushDist * ny;
              }
            }
          }
          
          if (!foundOverlap) break;
        }

        for (let i = 0; i < newPositions.length; i++) {
          newPositions[i].x = Math.max(radius, Math.min(100 - radius, newPositions[i].x));
          newPositions[i].y = Math.max(8 + radius, Math.min(88 - radius, newPositions[i].y));
        }

        return newPositions;
      });
    }, PHYSICS_UPDATE_INTERVAL);

    return () => clearInterval(animationInterval);
  }, []);
  
  const userPlayer = lobbyPlayers.find(p => p.id === 'user');
  const totalPlayers = lobbyPlayers.length;
  const readyPlayers = lobbyPlayers.filter(p => p.isReady).length;
  const allReady = totalPlayers > 1 && lobbyPlayers.every(p => p.isReady);
  
  return (
    <>
      <style>{styles}</style>
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={`q-${i}`}
              className="absolute text-6xl opacity-20 animate-float"
              style={{
                left: `${(i * 15) % 100}%`,
                top: `${(i * 20) % 100}%`,
                animationDuration: `${3 + (i % 3)}s`
              }}
            >
              ?
            </div>
          ))}
          
          {[...Array(5)].map((_, i) => (
            <div
              key={`circle-${i}`}
              className="absolute rounded-full bg-white opacity-10"
              style={{
                width: `${100 + i * 50}px`,
                height: `${100 + i * 50}px`,
                left: `${20 + i * 15}%`,
                top: `${30 + i * 10}%`,
                animation: `pulse-glow ${2 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`
              }}
            />
          ))}
        </div>

        {/* Game PIN Display at Top */}
        <div className="absolute top-4 left-0 right-0 z-10 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Game PIN (For Host - Big Display) */}
            {isHost && gamePin && (
              <div className="bg-white bg-opacity-95 rounded-2xl shadow-2xl p-4 mb-4 text-center">
                <p className="text-xs text-gray-600 mb-1 font-semibold">
                  📍 Share this PIN:
                </p>
                <div className="flex items-center justify-center gap-3">
                  <div className="text-4xl md:text-5xl font-bold text-yellow-600 tracking-widest font-mono">
                    {gamePin}
                  </div>
                  <button
                    onClick={handleCopyPin}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all hover:scale-105 flex items-center gap-2 font-semibold shadow-lg text-sm"
                  >
                    {copySuccess ? '✓' : '📋'}
                  </button>
                </div>
              </div>
            )}

            {/* Game PIN (For Players - Small Display) */}
            {!isHost && gamePin && (
              <div className="bg-white bg-opacity-90 rounded-xl shadow-lg p-2 mb-4 text-center">
                <p className="text-xs text-gray-600">PIN:</p>
                <div className="text-2xl font-bold text-yellow-600 tracking-widest font-mono">
                  {gamePin}
                </div>
              </div>
            )}

            {/* Existing Header */}
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-black mb-2 drop-shadow-lg">Quiz Battle Lobby</h1>
              <p className="text-base md:text-lg text-black font-medium mb-3 md:mb-4">{quizTitle}</p>
              
              <div className="inline-flex items-center gap-3 px-4 md:px-6 py-2 md:py-3 bg-white bg-opacity-90 rounded-full shadow-lg">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-yellow-700" />
                <span className="font-bold text-yellow-700 text-base md:text-lg">
                  {readyPlayers}/{totalPlayers} Ready
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 z-20 pointer-events-none">
          {lobbyPlayers.map((player, index) => {
            const pos = playerPositions[index] || { x: 50, y: 50 };
            
            return (
              <div
                key={player.id}
                className="absolute"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  transition: 'left 0.05s linear, top 0.05s linear'
                }}
              >
                <div className="text-center pointer-events-auto">
                  <div 
                    className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-white to-gray-100 rounded-full flex items-center justify-center text-black font-bold text-xl md:text-2xl shadow-2xl border-4 ${
                      player.isReady 
                        ? 'border-green-500 animate-pulse-glow' 
                        : 'border-yellow-600'
                    }`}
                  >
                    {player.initial}
                  </div>
                  <div className="mt-2 bg-black bg-opacity-70 px-2 md:px-3 py-1 rounded-full">
                    <div className="font-bold text-white text-xs">{player.name}</div>
                    {player.isReady ? (
                      <div className="text-xs text-green-400 font-medium flex items-center justify-center gap-1">
                        <span>✓</span> Ready
                      </div>
                    ) : (
                      <div className="text-xs text-gray-300">Waiting...</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 md:p-6">
          <div className="max-w-4xl mx-auto text-center space-y-3 md:space-y-4">
            {/* Host shows Start button */}
            {isHost && onStartBattle && (
              <button
                onClick={onStartBattle}
                disabled={totalPlayers < 2}
                className={`px-8 md:px-12 py-4 md:py-5 rounded-2xl font-bold text-xl md:text-2xl transition-all shadow-2xl hover:scale-105 ${
                  totalPlayers >= 2
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
              >
                {totalPlayers < 2 
                  ? 'Waiting for players...' 
                  : `🚀 Start Battle (${totalPlayers} players)`
                }
              </button>
            )}

            {/* Player shows Ready button */}
            {!isHost && userPlayer && !userPlayer.isReady && (
              <button
                onClick={onUserReady}
                className="px-8 md:px-12 py-4 md:py-5 bg-green-500 text-white rounded-2xl font-bold text-xl md:text-2xl hover:bg-green-600 transition-all shadow-2xl hover:scale-105"
              >
                I'm Ready!
              </button>
            )}

            {allReady && (
              <div className="inline-flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-white bg-opacity-95 text-black rounded-2xl font-bold text-lg md:text-xl shadow-2xl">
                <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                All players ready! Starting quiz...
              </div>
            )}

            {userPlayer && userPlayer.isReady && !allReady && totalPlayers === 1 && (
              <div className="inline-flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-white bg-opacity-90 text-blue-700 rounded-2xl font-semibold text-base md:text-lg shadow-xl">
                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                Waiting for other players to join...
              </div>
            )}

            {userPlayer && userPlayer.isReady && !allReady && totalPlayers > 1 && (
              <div className="inline-flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-white bg-opacity-90 text-blue-700 rounded-2xl font-semibold text-base md:text-lg shadow-xl">
                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                Waiting for {totalPlayers - readyPlayers} more player{totalPlayers - readyPlayers !== 1 ? 's' : ''} to ready up...
              </div>
            )}
            
            <div>
              <button 
                onClick={onLeave}
                className="text-black hover:text-gray-800 font-bold text-base md:text-lg bg-white bg-opacity-70 px-5 md:px-6 py-2 rounded-full hover:bg-opacity-90 transition-all"
              >
                ← Leave Lobby
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};