import React, { useEffect, useState } from 'react';
import { Loader2, Users, Check, Copy, Clock, Rocket, Sparkles } from 'lucide-react';
import { PHYSICS_UPDATE_INTERVAL, PLAYER_RADIUS } from '../utils/constants';
import { DefaultQuizPattern } from '../utils/QuizPatterns';

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
      box-shadow: 0 0 30px rgba(34, 197, 94, 0.6),
                  0 0 60px rgba(34, 197, 94, 0.3);
    }
    50% {
      box-shadow: 0 0 50px rgba(34, 197, 94, 0.9),
                  0 0 100px rgba(34, 197, 94, 0.5);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200% center;
    }
    100% {
      background-position: 200% center;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes bounceIn {
    0% {
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.2);
    }
    70% {
      transform: translate(-50%, -50%) scale(0.9);
    }
    100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }

  @keyframes chargeUp {
    0% {
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.3),
                  0 0 40px rgba(34, 197, 94, 0.2),
                  inset 0 0 20px rgba(34, 197, 94, 0.1);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 40px rgba(34, 197, 94, 0.6),
                  0 0 80px rgba(34, 197, 94, 0.4),
                  inset 0 0 30px rgba(34, 197, 94, 0.3);
      transform: scale(1.05);
    }
    100% {
      box-shadow: 0 0 30px rgba(34, 197, 94, 0.5),
                  0 0 60px rgba(34, 197, 94, 0.3),
                  inset 0 0 25px rgba(34, 197, 94, 0.2);
      transform: scale(1);
    }
  }

  @keyframes energyPulse {
    0%, 100% {
      opacity: 0.5;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.3);
    }
  }

  @keyframes popupFade {
    0% {
      transform: translateY(0) scale(0.5);
      opacity: 0;
    }
    20% {
      transform: translateY(-10px) scale(1.2);
      opacity: 1;
    }
    80% {
      transform: translateY(-30px) scale(1);
      opacity: 1;
    }
    100% {
      transform: translateY(-50px) scale(0.8);
      opacity: 0;
    }
  }

  @keyframes floatUp {
    0% {
      transform: translateY(100vh) translateX(0) scale(0);
      opacity: 0;
    }
    10% {
      opacity: 0.6;
    }
    90% {
      opacity: 0.6;
    }
    100% {
      transform: translateY(-20vh) translateX(var(--drift)) scale(1);
      opacity: 0;
    }
  }

  .animate-fade-in {
    animation: fadeIn 0.5s ease-out;
  }

  .animate-bounce-in {
    animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  .animate-float {
    animation: float 3s ease-in-out infinite;
  }

  .animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }

  .animate-charge-up {
    animation: chargeUp 1.5s ease-in-out infinite;
  }

  .animate-energy-pulse {
    animation: energyPulse 1s ease-in-out infinite;
  }

  .animate-popup-fade {
    animation: popupFade 1.5s ease-out forwards;
  }

  .animate-slide-up {
    animation: slideUp 0.4s ease-out;
  }

  .shimmer-bg {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.3) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 3s infinite;
  }

  .floating-bubble {
    position: absolute;
    border-radius: 50%;
    animation: floatUp linear infinite;
    pointer-events: none;
  }

  body, html {
    overflow: hidden !important;
  }
`;

// Floating Bubbles Background Pattern Component
const FloatingBubblesPattern = () => {
  const bubbles = Array.from({ length: 15 }, (_, i) => {
    const size = Math.random() * 60 + 20; // 20-80px
    const left = Math.random() * 100; // 0-100%
    const duration = Math.random() * 8 + 10; // 10-18s
    const delay = Math.random() * 5; // 0-5s delay
    const drift = (Math.random() - 0.5) * 100; // -50 to 50px horizontal drift
    const opacity = Math.random() * 0.15 + 0.05; // 0.05-0.2 opacity

    // Yellow/amber color variations
    const colors = [
      'rgba(251, 191, 36, opacity)', // amber-400
      'rgba(245, 158, 11, opacity)', // amber-500
      'rgba(252, 211, 77, opacity)', // amber-300
      'rgba(254, 243, 199, opacity)', // amber-100
    ];
    const color = colors[Math.floor(Math.random() * colors.length)].replace('opacity', opacity);

    return {
      id: i,
      size,
      left,
      duration,
      delay,
      drift,
      color,
    };
  });

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="floating-bubble"
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            left: `${bubble.left}%`,
            bottom: '0',
            background: bubble.color,
            animationDuration: `${bubble.duration}s`,
            animationDelay: `${bubble.delay}s`,
            '--drift': `${bubble.drift}px`,
          }}
        />
      ))}
    </div>
  );
};

// Solo Loading Screen Component
export const SoloLoadingScreen = ({ countdown, quizTitle, quizMode = 'casual', timerPerQuestion = 30 }) => {
  const proTips = [
    "💪 Read each question carefully!",
    "🎯 Trust your first instinct!",
    "⏰ Manage your time wisely!",
    "🧠 Stay calm and focused!",
    "✨ Every question is an opportunity!"
  ];

  const [randomTip] = useState(() => proTips[Math.floor(Math.random() * proTips.length)]);
  
  // Determine if quiz is timed (not infinite)
  const isTimed = timerPerQuestion > 0;

  // Memoize particle positions to prevent flickering on countdown changes
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: i * 0.3,
      duration: 3 + Math.random() * 4
    }))
  );

  return (
    <>
      <style>{styles}</style>
      <div className="fixed inset-0 w-full h-full flex items-center justify-center overflow-hidden" style={{
        background: 'linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)'
      }}>
        {/* Subtle dot pattern */}
        <div className="fixed inset-0 pointer-events-none opacity-30" style={{
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {/* Animated particles - Yellow, Orange, and Indigo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((particle) => {
            const colorType = particle.id % 3;
            const background = colorType === 0 ? '#fbbf24' : colorType === 1 ? '#f97316' : '#818cf8';
            const boxShadow = colorType === 0
              ? '0 0 12px rgba(251, 191, 36, 0.8)'
              : colorType === 1
              ? '0 0 12px rgba(249, 115, 22, 0.8)'
              : '0 0 12px rgba(129, 140, 248, 0.8)';

            return (
              <div
                key={particle.id}
                className="absolute w-2 h-2 rounded-full animate-float-shard"
                style={{
                  background,
                  left: `${particle.left}%`,
                  top: `${particle.top}%`,
                  animationDelay: `${particle.delay}s`,
                  animationDuration: `${particle.duration}s`,
                  opacity: 0.6,
                  boxShadow
                }}
              />
            );
          })}
        </div>

        {/* Radial glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-400/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        <div className="text-center animate-fade-in z-10 relative px-4 max-w-2xl">
          {/* Mode Badge */}
          <div className="mb-8 flex justify-center">
            <div className={`backdrop-blur-xl border-2 rounded-2xl px-6 py-3 shadow-2xl ${
              quizMode === 'adaptive'
                ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-400'
                : quizMode === 'casual'
                ? 'bg-gradient-to-r from-yellow-400/20 to-amber-500/20 border-yellow-400'
                : 'bg-white/60 border-white'
            }`}>
              <div className="flex items-center gap-3">
                {quizMode === 'adaptive' ? (
                  <>
                    <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div className="text-left">
                      <div className="text-indigo-700 font-bold text-sm">ADAPTIVE MODE</div>
                      <div className="text-indigo-600/80 text-xs">Difficulty adjusts to your performance</div>
                    </div>
                  </>
                ) : quizMode === 'casual' ? (
                  <>
                    <svg className="w-6 h-6 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <div className="text-left">
                      <div className="text-yellow-700 font-bold text-sm">CASUAL MODE</div>
                      <div className="text-yellow-600/80 text-xs">Questions in random order</div>
                    </div>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <div className="text-left">
                      <div className="text-gray-900 font-bold text-sm">NORMAL MODE</div>
                      <div className="text-gray-700 text-xs">Questions in original order</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Countdown Circle - Frosted Glass */}
          <div className="mb-8 relative">
            {/* Glass layers */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full backdrop-blur-2xl bg-white/20 border-2 border-white/40 transform translate-y-2 translate-x-2" style={{
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)'
              }} />
            </div>
            <div className="relative w-48 h-48 mx-auto rounded-full backdrop-blur-xl bg-white/40 border-2 border-white/60 flex items-center justify-center" style={{
              boxShadow: '0 25px 50px rgba(255, 219, 0, 0.25), 0 10px 20px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.9)'
            }}>
              {/* Pulsing rings */}
              <div className="absolute inset-0 rounded-full border-4 border-yellow-400/40 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-4 rounded-full border-2 border-yellow-400/60" />

              {/* Countdown number */}
              <div className="text-9xl font-black bg-gradient-to-b from-yellow-500 to-yellow-600 bg-clip-text text-transparent animate-bounce drop-shadow-lg">
                {countdown}
              </div>
            </div>
          </div>

          {/* Get Ready Text */}
          <h2 className="text-5xl sm:text-6xl font-black mb-4 bg-gradient-to-r from-gray-900 via-yellow-600 to-gray-900 bg-clip-text text-transparent drop-shadow-sm">
            Get Ready!
          </h2>

          <p className="text-gray-700 text-xl sm:text-2xl font-semibold mb-8 drop-shadow-sm">
            {quizTitle}
          </p>

          {/* Mechanics Icons */}
          <div className="flex justify-center gap-6 mb-8">
            <div className="backdrop-blur-lg bg-white/60 border-2 border-white/70 rounded-xl p-4 flex flex-col items-center gap-2 shadow-lg">
              <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isTimed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                )}
              </svg>
              <span className="text-gray-700 text-xs font-semibold">{isTimed ? 'Timed' : 'Untimed'}</span>
            </div>
            <div className="backdrop-blur-lg bg-white/60 border-2 border-white/70 rounded-xl p-4 flex flex-col items-center gap-2 shadow-lg">
              <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span className="text-gray-700 text-xs font-semibold">Score</span>
            </div>
          </div>

          {/* Pro Tip */}
          <div className="max-w-md mx-auto">
            <div className="backdrop-blur-xl bg-white/60 border-2 border-white/70 rounded-2xl p-4 shadow-2xl">
              <p className="text-sm text-gray-800 font-medium">
                <span className="font-bold text-yellow-700">Pro Tip:</span> <span className="text-gray-900">{randomTip}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Leave Lobby Confirmation Modal
const LeaveLobbyModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-scaleIn">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              Leave Lobby?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            Are you sure you want to leave the lobby?
          </p>
        </div>

        <div className="flex gap-2 sm:gap-3 p-4 sm:p-6 bg-gray-50 rounded-b-3xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 sm:px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm text-sm sm:text-base"
          >
            Stay
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 sm:px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg text-sm sm:text-base"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

// Battle Lobby Screen Component
export const BattleLobbyScreen = ({
  lobbyPlayers,
  playerPositions: externalPositions,
  quizTitle,
  onUserReady,
  onUserUnready,
  onLeave,
  setPlayerPositions,
  gamePin,
  isHost,
  currentUserId,
  onStartBattle
}) => {
  const [playerPositions, setLocalPlayerPositions] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [lobbyCountdown, setLobbyCountdown] = useState(60); // 1 minute lobby countdown 

  // Copy PIN function
  const handleCopyPin = () => {
    if (gamePin) {
      navigator.clipboard.writeText(gamePin);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Lobby countdown timer (host only, cancels if player joins)
  useEffect(() => {
    if (!isHost) return; // Only host has countdown
    
    const totalPlayers = lobbyPlayers?.length || 0;
    
    // If a player joined (more than 1 player), cancel countdown
    if (totalPlayers > 1) {
      setLobbyCountdown(60); // Reset for display but don't restart
      return;
    }
    
    // Only host in lobby, start countdown
    const countdownInterval = setInterval(() => {
      setLobbyCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Countdown reached 0, go back to quiz page
          if (onLeave) {
            onLeave();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(countdownInterval);
  }, [isHost, lobbyPlayers?.length, onLeave]);

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
        const minDist = radius * 2;
        const wallRestitution = 0.8; // Coefficient of restitution for walls (0-1, lower = less bouncy)
        const playerRestitution = 0.9; // Coefficient of restitution between players
        const friction = 0.995; // Air resistance (closer to 1 = less friction, keeps them moving longer)
        const separationForce = 1.1; // Force to push overlapping players apart
        const minSpeed = 0.35; // Minimum "walking" speed to keep players moving
        const boostChance = 0.015; // 1.5% chance per frame to get a random direction change

        // Copy positions
        const newPositions = prev.map(pos => ({ ...pos }));

        // 1. Apply friction (air resistance) but maintain minimum speed
        for (let i = 0; i < newPositions.length; i++) {
          newPositions[i].vx *= friction;
          newPositions[i].vy *= friction;
          
          // Calculate current speed
          const speed = Math.sqrt(newPositions[i].vx ** 2 + newPositions[i].vy ** 2);
          
          // If too slow, boost to minimum speed in current direction or random
          if (speed < minSpeed) {
            if (speed > 0.01) {
              // Maintain current direction but boost to min speed
              const ratio = minSpeed / speed;
              newPositions[i].vx *= ratio;
              newPositions[i].vy *= ratio;
            } else {
              // Give random direction if nearly stopped
              const angle = Math.random() * Math.PI * 2;
              newPositions[i].vx = Math.cos(angle) * minSpeed;
              newPositions[i].vy = Math.sin(angle) * minSpeed;
            }
          }
          
          // Random occasional boost for variety (like changing direction while walking)
          if (Math.random() < boostChance) {
            const angle = Math.random() * Math.PI * 2;
            newPositions[i].vx += Math.cos(angle) * 0.4;
            newPositions[i].vy += Math.sin(angle) * 0.4;
          }
        }

        // 1.5. Chase/Avoid Logic - Ready players chase non-ready players!
        const chaseStrength = 0.04; // Gentle force for chasing (reduced for smoother movement)
        const avoidStrength = 0.06; // Gentle force for avoiding (reduced to be easier on eyes)
        const chaseRange = 30; // Max distance to chase (slightly reduced range)
        
        for (let i = 0; i < newPositions.length; i++) {
          const currentPlayer = lobbyPlayers[i];
          if (!currentPlayer) continue;

          // Find nearest player
          let nearestDist = Infinity;
          let nearestIdx = -1;
          let nearestDx = 0;
          let nearestDy = 0;

          for (let j = 0; j < newPositions.length; j++) {
            if (i === j) continue;
            const targetPlayer = lobbyPlayers[j];
            if (!targetPlayer) continue;

            const dx = newPositions[j].x - newPositions[i].x;
            const dy = newPositions[j].y - newPositions[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < nearestDist && dist < chaseRange) {
              nearestDist = dist;
              nearestIdx = j;
              nearestDx = dx;
              nearestDy = dy;
            }
          }

          // Apply chase/avoid behavior if we found someone nearby
          if (nearestIdx !== -1 && nearestDist > 0.01) {
            const targetPlayer = lobbyPlayers[nearestIdx];
            const nx = nearestDx / nearestDist; // Normalize direction
            const ny = nearestDy / nearestDist;

            // Ready players CHASE non-ready players
            if (currentPlayer.isReady && !targetPlayer.isReady) {
              newPositions[i].vx += nx * chaseStrength;
              newPositions[i].vy += ny * chaseStrength;
            }
            // Non-ready players RUN AWAY from ready players
            else if (!currentPlayer.isReady && targetPlayer.isReady) {
              newPositions[i].vx -= nx * avoidStrength;
              newPositions[i].vy -= ny * avoidStrength;
            }
          }
        }

        // 2. Detect and handle player-to-player collisions with realistic physics
        for (let i = 0; i < newPositions.length; i++) {
          for (let j = i + 1; j < newPositions.length; j++) {
            const dx = newPositions[j].x - newPositions[i].x;
            const dy = newPositions[j].y - newPositions[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist && dist > 0.001) {
              // Collision detected - normalize collision direction
              const nx = dx / dist;
              const ny = dy / dist;

              // Calculate relative velocity along collision normal
              const dvx = newPositions[j].vx - newPositions[i].vx;
              const dvy = newPositions[j].vy - newPositions[i].vy;
              const relativeVelocity = dvx * nx + dvy * ny;

              // Only apply impulse if moving towards each other
              if (relativeVelocity < 0) {
                // Realistic elastic collision with equal mass
                // Impulse = -(1 + e) * vrel / 2, where e is coefficient of restitution
                const impulse = -(1 + playerRestitution) * relativeVelocity / 2;
                
                // Apply impulse to both players
                newPositions[i].vx -= impulse * nx;
                newPositions[i].vy -= impulse * ny;
                newPositions[j].vx += impulse * nx;
                newPositions[j].vy += impulse * ny;
              }

              // Separate overlapping players to prevent sticking
              const overlap = minDist - dist;
              if (overlap > 0) {
                const separation = (overlap / 2) * separationForce;
                newPositions[i].x -= separation * nx;
                newPositions[i].y -= separation * ny;
                newPositions[j].x += separation * nx;
                newPositions[j].y += separation * ny;
              }
            }
          }
        }

        // 3. Update positions based on velocity
        for (let i = 0; i < newPositions.length; i++) {
          newPositions[i].x += newPositions[i].vx;
          newPositions[i].y += newPositions[i].vy;
        }

        // 4. Handle wall collisions with realistic bounce
        for (let i = 0; i < newPositions.length; i++) {
          let collided = false;
          
          // Left wall
          if (newPositions[i].x - radius <= 0) {
            newPositions[i].x = radius;
            newPositions[i].vx = -newPositions[i].vx * wallRestitution;
            collided = true;
          }
          
          // Right wall
          if (newPositions[i].x + radius >= 100) {
            newPositions[i].x = 100 - radius;
            newPositions[i].vx = -newPositions[i].vx * wallRestitution;
            collided = true;
          }
          
          // Top wall (adjusted for top bar spacing)
          if (newPositions[i].y - radius <= 10) {
            newPositions[i].y = 10 + radius;
            newPositions[i].vy = -newPositions[i].vy * wallRestitution;
            collided = true;
          }
          
          // Bottom wall (adjusted for bottom controls)
          if (newPositions[i].y + radius >= 85) {
            newPositions[i].y = 85 - radius;
            newPositions[i].vy = -newPositions[i].vy * wallRestitution;
            collided = true;
          }

          // Apply additional friction on wall collision (sliding friction)
          if (collided) {
            newPositions[i].vx *= 0.9;
            newPositions[i].vy *= 0.9;
          }
        }

        // 5. Safety clamp to ensure positions stay within bounds
        for (let i = 0; i < newPositions.length; i++) {
          newPositions[i].x = Math.max(radius, Math.min(100 - radius, newPositions[i].x));
          newPositions[i].y = Math.max(10 + radius, Math.min(85 - radius, newPositions[i].y));
          
          // Cap maximum velocity to prevent extreme speeds (but allow faster than walking)
          const maxSpeed = 1.5;
          const speed = Math.sqrt(newPositions[i].vx ** 2 + newPositions[i].vy ** 2);
          if (speed > maxSpeed) {
            newPositions[i].vx = (newPositions[i].vx / speed) * maxSpeed;
            newPositions[i].vy = (newPositions[i].vy / speed) * maxSpeed;
          }
        }

        return newPositions;
      });
    }, PHYSICS_UPDATE_INTERVAL);

    return () => clearInterval(animationInterval);
  }, [lobbyPlayers]);
  
  const userPlayer = lobbyPlayers.find(p => p.id === 'user');
  const totalPlayers = lobbyPlayers.length;
  const readyPlayers = lobbyPlayers.filter(p => p.isReady).length;
  const allReady = totalPlayers > 1 && lobbyPlayers.every(p => p.isReady);
  
  return (
    <>
      <style>{styles}</style>
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 overflow-hidden">
        <DefaultQuizPattern />

        {/* Compact Top Bar */}
        <div className="absolute top-5 left-0 right-0 z-10 px-4 md:px-6 animate-slide-up">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-full shadow-lg px-3 md:px-5 py-2 md:py-2.5 border border-gray-200">
              <div className="flex items-center justify-between gap-2 md:gap-4">

                {/* Left: Game PIN */}
                <div className="flex items-center gap-1.5 md:gap-2">
                  {gamePin && (
                    <>
                      <span className="text-xs text-gray-600 font-semibold hidden sm:inline">PIN:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base md:text-xl font-black text-amber-600 tracking-wider font-mono">
                          {gamePin}
                        </span>
                        <button
                          onClick={handleCopyPin}
                          className="p-1 md:p-1.5 bg-amber-100 hover:bg-amber-200 rounded-md transition-all hover:scale-110 active:scale-95"
                          title="Copy PIN"
                        >
                          {copySuccess ? (
                            <Check className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 md:w-4 md:h-4 text-amber-700" />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Center: Title with Indigo Accent */}
                <div className="text-center flex-1 hidden md:block">
                  <h1 className="text-base md:text-lg font-black text-indigo-700 tracking-tight">
                    Battle Lobby
                  </h1>
                </div>

                {/* Right: Player Count - Keep Yellow Theme */}
                <div className="flex items-center gap-1.5 md:gap-2 bg-amber-50 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full border border-amber-200">
                  <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-600" />
                  <span className="font-bold text-amber-700 text-xs md:text-sm">
                    {readyPlayers}/{totalPlayers}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Lobby countdown banner (only show for host when alone) */}
            {isHost && totalPlayers === 1 && (
              <div className="mt-3 text-center animate-slide-up">
                <div className="inline-flex items-center gap-2 bg-yellow-100 border-2 border-yellow-400 text-yellow-800 px-4 py-2 rounded-full text-sm font-semibold shadow-md">
                  <Clock className="w-4 h-4" />
                  <span>Lobby closes in: {Math.floor(lobbyCountdown / 60)}:{(lobbyCountdown % 60).toString().padStart(2, '0')}</span>
                </div>
                <p className="text-white text-xs mt-1">Waiting for players to join...</p>
              </div>
            )}
          </div>
        </div>

        {/* Player Bubbles - Bouncing Area */}
        <div className="absolute inset-0 z-20 pointer-events-none" style={{ top: '100px', bottom: '120px' }}>
          {lobbyPlayers.map((player, index) => {
            const pos = playerPositions[index] || { x: 50, y: 50 };

            return (
              <div
                key={player.id}
                className="absolute animate-bounce-in"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  transition: 'left 0.05s linear, top 0.05s linear',
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <div className="flex flex-col items-center pointer-events-auto transition-transform duration-300 hover:scale-110">
                  {/* Avatar Circle with Energy Rings */}
                  <div className="relative w-16 h-16 md:w-20 md:h-20">
                    {/* Energy Rings for Ready Players */}
                    {player.isReady && (
                      <>
                        <div className="absolute inset-0 rounded-full border-4 border-green-400 opacity-60 animate-energy-pulse" style={{ animationDelay: '0s' }}></div>
                        <div className="absolute inset-0 rounded-full border-4 border-green-300 opacity-40 animate-energy-pulse" style={{ animationDelay: '0.3s' }}></div>
                        <div className="absolute inset-0 rounded-full border-4 border-green-200 opacity-20 animate-energy-pulse" style={{ animationDelay: '0.6s' }}></div>
                        
                        {/* Sparkle particles */}
                        <div className="absolute -top-2 -right-2 w-2 h-2 bg-yellow-300 rounded-full animate-popup-fade"></div>
                        <div className="absolute -top-1 -left-2 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-popup-fade" style={{ animationDelay: '0.2s' }}></div>
                        <div className="absolute -bottom-2 -right-1 w-1 h-1 bg-green-300 rounded-full animate-popup-fade" style={{ animationDelay: '0.4s' }}></div>
                      </>
                    )}

                    <div
                      className={`w-full h-full rounded-full flex items-center justify-center text-white font-bold text-xl md:text-2xl shadow-lg border-3 transition-all overflow-hidden relative z-10 ${
                        player.isReady
                          ? 'bg-gradient-to-br from-green-400 to-green-500 border-green-400 animate-charge-up'
                          : 'bg-gradient-to-br from-blue-400 to-blue-500 border-blue-400'
                      }`}
                    >
                      {player.profilePicture ? (
                        <img
                          src={player.profilePicture}
                          alt={player.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        player.initial
                      )}
                    </div>

                    {/* Subtle Ready Checkmark - Badge Style Overlap */}
                    {player.isReady && (
                      <div className="absolute -top-0.5 -right-0.5 w-5 h-5 md:w-6 md:h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg z-20 animate-bounce-in">
                        <span className="text-white text-[10px] md:text-xs font-bold">✓</span>
                      </div>
                    )}
                  </div>

                  {/* Username Label - Yellow Primary + Centered */}
                  <div className="mt-2 bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-1.5 rounded-full shadow-lg border-2 border-yellow-300 text-center">
                    <span className="font-black text-gray-900 text-xs md:text-sm whitespace-nowrap tracking-wide">
                      {player.name}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Bottom Controls */}
        <div className="absolute bottom-6 left-0 right-0 z-30 px-4 animate-slide-up">
          <div className="max-w-2xl mx-auto text-center space-y-3">

            {/* HOST VIEW */}
            {isHost && onStartBattle && (
              <>
                {/* Host Ready/Unready Button */}
                {(() => {
                  const hostPlayer = lobbyPlayers.find(p => p.userId === currentUserId);
                  const isHostReady = hostPlayer?.isReady || false;

                  return !isHostReady ? (
                    <button
                      onClick={onUserReady}
                      className="inline-flex items-center gap-2 px-10 md:px-14 py-4 md:py-4.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-full font-bold text-lg md:text-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg hover:shadow-2xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-100 border-2 border-indigo-400"
                    >
                      <Check className="w-5 h-5" />
                      <span>Ready Up</span>
                    </button>
                  ) : (
                    <button
                      onClick={onUserUnready}
                      className="inline-flex items-center gap-2.5 px-8 md:px-10 py-3.5 md:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full font-bold text-base md:text-lg shadow-lg hover:from-green-600 hover:to-green-700 hover:scale-105 active:scale-100 transition-all border-2 border-green-400"
                    >
                      <Check className="w-5 h-5" />
                      <span>Ready (Click to unready)</span>
                    </button>
                  );
                })()}

                {/* Start Battle Button */}
                <button
                  onClick={onStartBattle}
                  disabled={totalPlayers < 2 || !allReady}
                  className={`inline-flex items-center gap-2 px-8 md:px-12 py-3.5 md:py-4 rounded-full font-bold text-base md:text-lg transition-all shadow-lg ${
                    totalPlayers >= 2 && allReady
                      ? 'bg-green-500 text-white hover:bg-green-600 hover:shadow-xl hover:scale-105 active:scale-100'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {totalPlayers < 2
                    ? 'Waiting for players...'
                    : !allReady
                    ? `Waiting for ${totalPlayers - readyPlayers} player${totalPlayers - readyPlayers !== 1 ? 's' : ''}...`
                    : (
                      <>
                        <Rocket className="w-5 h-5" />
                        <span>Start Battle</span>
                      </>
                    )
                  }
                </button>
              </>
            )}

            {/* PLAYER VIEW (Not Host) */}
            {!isHost && (
              <>
                {(() => {
                  const currentUserPlayer = lobbyPlayers.find(p => p.userId === currentUserId);
                  const isUserReady = currentUserPlayer?.isReady || false;

                  return !isUserReady ? (
                    <button
                      onClick={onUserReady}
                      className="inline-flex items-center gap-2 px-10 md:px-14 py-4 md:py-4.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-full font-bold text-lg md:text-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg hover:shadow-2xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-100 border-2 border-indigo-400"
                    >
                      <Check className="w-5 h-5" />
                      <span>Ready Up</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={onUserUnready}
                        className="inline-flex items-center gap-2.5 px-8 md:px-10 py-3.5 md:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full font-bold text-base md:text-lg shadow-lg hover:from-green-600 hover:to-green-700 hover:scale-105 active:scale-100 transition-all border-2 border-green-400"
                      >
                        <Check className="w-5 h-5" />
                        <span>Ready (Click to unready)</span>
                      </button>

                      {totalPlayers > 1 && readyPlayers < totalPlayers && (
                        <div className="inline-flex items-center gap-2 px-5 md:px-6 py-2 md:py-2.5 bg-yellow-50 backdrop-blur-sm text-amber-800 rounded-full font-semibold text-sm md:text-base shadow-md border border-yellow-200">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                          <span>Waiting for {totalPlayers - readyPlayers} more...</span>
                        </div>
                      )}

                      {readyPlayers === totalPlayers && totalPlayers > 1 && (
                        <div className="inline-flex items-center gap-2.5 px-6 md:px-8 py-2.5 md:py-3 bg-amber-500 text-white rounded-full font-bold text-sm md:text-base shadow-lg animate-pulse">
                          <Clock className="w-4 h-4 md:w-5 md:h-5" />
                          <span>Waiting for host to start...</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}

            {/* Leave Button - Minimal */}
            <div>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="text-gray-600 hover:text-gray-800 font-medium text-sm md:text-base hover:underline transition-all"
              >
                Leave Lobby
              </button>
            </div>
          </div>
        </div>

        {/* Leave Confirmation Modal */}
        <LeaveLobbyModal
          isOpen={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          onConfirm={onLeave}
        />
      </div>
    </>
  );
};