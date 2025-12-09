import React, { useEffect, useState, useRef } from 'react';

/**
 * AdaptiveFeedback Component - Redesigned
 * Displays contextual feedback with action-specific styling and animations
 * Positioned near difficulty badge for visual flow
 *
 * EDGE CASES HANDLED:
 * 1. ✅ Rapid consecutive messages - Clears previous before showing new
 * 2. ✅ Message null/undefined - Gracefully returns null
 * 3. ✅ Action undefined - Falls back to default styling
 * 4. ✅ Timer cleanup - All timeouts cleaned up on unmount
 * 5. ✅ Overlapping animations - State reset between messages
 * 6. ✅ Fast question answering - 150ms delay prevents flicker
 * 7. ✅ Component unmount mid-animation - Cleanup prevents memory leaks
 */
export const AdaptiveFeedback = ({ message, action, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState(null);
  const [displayAction, setDisplayAction] = useState(null);
  const timersRef = useRef({ reset: null, hide: null, clear: null });
  const messageIdRef = useRef(0); // Track unique message IDs to prevent race conditions

  useEffect(() => {
    // 🔥 BULLETPROOF: Clear ALL timers immediately on any change
    Object.values(timersRef.current).forEach(timer => {
      if (timer) clearTimeout(timer);
    });
    timersRef.current = { reset: null, hide: null, clear: null };

    if (message) {
      // Generate unique ID for this message
      const currentMessageId = ++messageIdRef.current;

      // Step 1: Immediately hide any previous message
      setIsVisible(false);
      setDisplayMessage(null);
      setDisplayAction(null);

      // Step 2: Small delay to reset, then show new message
      timersRef.current.reset = setTimeout(() => {
        // 🔥 Race condition check: Only update if this is still the current message
        if (currentMessageId === messageIdRef.current) {
          setDisplayMessage(message);
          setDisplayAction(action);
          setIsVisible(true);
        }
      }, 100);

      // Step 3: Auto-hide after 1.3 seconds (speedrunner optimized)
      timersRef.current.hide = setTimeout(() => {
        if (currentMessageId === messageIdRef.current) {
          setIsVisible(false);
        }
      }, 1300);

      // Step 4: Clear message completely after fade out
      timersRef.current.clear = setTimeout(() => {
        if (currentMessageId === messageIdRef.current) {
          setDisplayMessage(null);
          setDisplayAction(null);
          if (onComplete) onComplete();
        }
      }, 1600);

    } else {
      // 🔥 FORCE CLEAR: If message is null, nuke everything immediately
      setIsVisible(false);
      setDisplayMessage(null);
      setDisplayAction(null);
    }

    // 🔥 CLEANUP: Always clear timers on unmount or re-render
    return () => {
      Object.values(timersRef.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [message, action, onComplete]);

  // 🔥 EDGE CASE: Don't render if no message
  if (!displayMessage) return null;

  // Determine styling based on action type
  const getActionStyle = () => {
    switch (displayAction) {
      case 'LEVEL_UP':
        return {
          gradient: 'from-emerald-500 via-green-500 to-lime-500',
          icon: '🚀',
          animation: 'animate-bounce-slow',
          glow: 'shadow-green-500/50',
          border: 'border-green-400'
        };
      case 'LEVEL_DOWN':
        return {
          gradient: 'from-blue-500 via-indigo-500 to-purple-500',
          icon: '💡',
          animation: '',
          glow: 'shadow-blue-500/30',
          border: 'border-blue-400'
        };
      case 'MAINTAIN':
        return {
          gradient: 'from-amber-500 via-yellow-500 to-orange-500',
          icon: '⭐',
          animation: 'animate-pulse-slow',
          glow: 'shadow-yellow-500/40',
          border: 'border-yellow-400'
        };
      default:
        return {
          gradient: 'from-purple-500 via-pink-500 to-rose-500',
          icon: '✨',
          animation: '',
          glow: 'shadow-purple-500/40',
          border: 'border-purple-400'
        };
    }
  };

  const style = getActionStyle();

  return (
    <>
      {/* 🔥 Main feedback card - positioned below header */}
      <div className="fixed top-24 left-0 right-0 flex justify-center z-50 pointer-events-none px-4">
        <div
          className={`
            bg-gradient-to-r ${style.gradient}
            text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl
            shadow-2xl ${style.glow}
            border-2 ${style.border}
            transform transition-all duration-300 ease-out
            max-w-md w-full
            ${isVisible
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 -translate-y-4 scale-95'
            }
            ${style.animation}
          `}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl" role="img" aria-label="icon">
              {style.icon}
            </span>
            <p className="text-sm sm:text-base font-bold drop-shadow-lg text-center">
              {displayMessage}
            </p>
          </div>
        </div>
      </div>

      {/* 🔥 LEVEL UP: Confetti particles */}
      {displayAction === 'LEVEL_UP' && isVisible && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-ping"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${10 + Math.random() * 30}%`,
                backgroundColor: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 0.3}s`,
                animationDuration: `${0.6 + Math.random() * 0.4}s`
              }}
            />
          ))}
        </div>
      )}

      {/* 🔥 LEVEL DOWN: Gentle glow effect */}
      {displayAction === 'LEVEL_DOWN' && isVisible && (
        <div className="fixed top-24 left-0 right-0 flex justify-center z-40 pointer-events-none">
          <div
            className="absolute w-64 h-64 bg-blue-400/20 rounded-full blur-3xl animate-pulse-slow"
            style={{ animationDuration: '2s' }}
          />
        </div>
      )}

      {/* Custom animations */}
      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 0.8s ease-in-out 2;
        }
        .animate-pulse-slow {
          animation: pulse-slow 1.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

/**
 * DifficultyBadge Component
 * Shows current difficulty level with color coding
 */
export const DifficultyBadge = ({ difficulty }) => {
  const getDifficultyColor = (diff) => {
    const normalized = diff?.toLowerCase() || 'medium';
    switch (normalized) {
      case 'easy':
        return 'bg-green-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      case 'hard':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getDifficultyIcon = (diff) => {
    const normalized = diff?.toLowerCase() || 'medium';
    switch (normalized) {
      case 'easy':
        return '🌱';
      case 'medium':
        return '⚡';
      case 'hard':
        return '🔥';
      default:
        return '📝';
    }
  };

  if (!difficulty) return null;

  const normalizedDifficulty = difficulty?.toLowerCase() || 'medium';
  const displayText = normalizedDifficulty.charAt(0).toUpperCase() + normalizedDifficulty.slice(1);

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
        font-bold text-sm transition-all duration-300
        ${getDifficultyColor(normalizedDifficulty)}
      `}
    >
      <span>{getDifficultyIcon(normalizedDifficulty)}</span>
      <span>{displayText}</span>
    </div>
  );
};
