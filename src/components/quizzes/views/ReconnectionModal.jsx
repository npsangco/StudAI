import React, { useState } from 'react';
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';

/**
 * Reconnection Modal
 * Shows when player loses connection during quiz battle
 */
export const ReconnectionModal = ({ 
  isOpen, 
  onReconnect, 
  onGiveUp,
  isReconnecting = false,
  gamePin,
  playerName,
  inGracePeriod = false,
  gracePeriodTimeRemaining = 0
}) => {
  const [error, setError] = useState(null);
  
  if (!isOpen) return null;
  
  // Format time remaining
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleReconnect = async () => {
    setError(null);
    const result = await onReconnect();
    
    if (!result.success) {
      setError(result.error || 'Failed to reconnect');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
            <WifiOff className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            Connection Lost!
          </h2>
          <p className="text-white/90 text-sm">
            You've been disconnected from the quiz battle
          </p>
        </div>
        
        {/* Content */}
        <div className="p-6">
          
          {/* Battle Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Battle PIN:</span>
              <span className="font-mono font-bold text-lg text-gray-900">{gamePin}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Player:</span>
              <span className="font-semibold text-gray-900">{playerName}</span>
            </div>
          </div>
          
          {/* Status Message */}
          {isReconnecting ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <div>
                  <p className="font-semibold text-blue-900 mb-1">
                    Reconnecting...
                  </p>
                  <p className="text-sm text-blue-700">
                    Please wait while we restore your connection
                  </p>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 mb-1">
                    Reconnection Failed
                  </p>
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Wifi className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 mb-1">
                    Reconnection Available
                  </p>
                  <p className="text-sm text-green-700">
                    Your progress has been saved. Click below to rejoin the battle.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Grace Period Countdown */}
          {inGracePeriod && gracePeriodTimeRemaining > 0 && (
            <div className="bg-yellow-50 rounded-lg p-4 mb-4 border-2 border-yellow-300">
              <div className="text-center">
                <p className="text-sm text-yellow-800 font-semibold mb-2">
                  ⏰ Reconnect before time runs out!
                </p>
                <div className="text-3xl font-bold text-yellow-900 mb-1">
                  {formatTime(gracePeriodTimeRemaining)}
                </div>
                <p className="text-xs text-yellow-700">
                  {gracePeriodTimeRemaining <= 30 ? 'Hurry! Time running out!' : 'Your progress is saved'}
                </p>
              </div>
            </div>
          )}
          
          {/* Info */}
          <div className="bg-yellow-50 rounded-lg p-3 mb-4 border border-yellow-200">
            <p className="text-xs text-yellow-800 leading-relaxed">
              <strong>Note:</strong> If you don't reconnect within 90 seconds, you'll be marked as forfeit.
            </p>
          </div>
          
          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all ${
                isReconnecting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {isReconnecting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Reconnecting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Wifi className="w-5 h-5" />
                  Reconnect to Battle
                </span>
              )}
            </button>
            
            <button
              onClick={onGiveUp}
              disabled={isReconnecting}
              className="w-full py-3 px-4 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Leave Battle
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

/**
 * Reconnection Opportunity Banner
 * Shows at top of screen when reconnection is available on page load
 */
export const ReconnectionBanner = ({ 
  opportunity, 
  onReconnect, 
  onDismiss 
}) => {
  if (!opportunity) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg animate-slide-down">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Wifi className="w-5 h-5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-sm">
              You were disconnected from a quiz battle!
            </p>
            <p className="text-xs text-white/90 truncate">
              PIN: {opportunity.gamePin} • {opportunity.playerName}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onReconnect}
            className="px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors shadow-md"
          >
            Rejoin
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-white/20 text-white rounded-lg font-semibold text-sm hover:bg-white/30 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};