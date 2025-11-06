import React, { useState, useRef, useEffect } from 'react';
import { Trophy, X, GripVertical } from 'lucide-react';

export const LiveLeaderboard = ({ players, currentPlayerName = 'You', mode = 'desktop' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Draggable state for mobile
  const [position, setPosition] = useState({ x: window.innerWidth - 140, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const draggableRef = useRef(null);
  
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  // Get rank emoji
  const getRankEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  // Get rank suffix
  const getRankSuffix = (rank) => {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  };

  // Handle dragging for mobile
  const handleMouseDown = (e) => {
    if (isExpanded) return;
    setIsDragging(true);
    const rect = draggableRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleTouchStart = (e) => {
    if (isExpanded) return;
    setIsDragging(true);
    const touch = e.touches[0];
    const rect = draggableRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragOffset.x,
        y: touch.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Desktop - Light Mode Yellow/Black
  if (mode === 'desktop') {
    return (
      <div className="w-full bg-white rounded-2xl border-2 border-yellow-400 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-yellow-400 px-4 py-3 border-b-2 border-yellow-500">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-black" />
            <h3 className="text-lg font-bold text-black">Leaderboard</h3>
          </div>
        </div>

        {/* Player List - Auto height */}
        <div className="p-3 space-y-2">
          {sortedPlayers.map((player, index) => {
            const rank = index + 1;
            const isCurrentUser = player.name === currentPlayerName;
            
            return (
              <div
                key={player.id}
                className={`
                  flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200
                  ${isCurrentUser 
                    ? 'bg-yellow-400 text-black border-2 border-yellow-500' 
                    : 'bg-gray-50 text-gray-900 border border-gray-200 hover:border-yellow-400 hover:bg-gray-100'
                  }
                `}
              >
                {/* Rank & Name */}
                <div className="flex items-center gap-3 flex-1">
                  <span className={`
                    text-xl font-bold min-w-[32px] text-center
                    ${isCurrentUser ? 'text-black' : 'text-gray-700'}
                  `}>
                    {getRankEmoji(rank)}
                  </span>
                  
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${isCurrentUser ? 'text-black' : 'text-gray-900'}`}>
                      {isCurrentUser ? 'You' : player.name}
                    </p>
                    <p className={`text-xs ${isCurrentUser ? 'text-black/70' : 'text-gray-500'}`}>
                      {rank}{getRankSuffix(rank)} place
                    </p>
                  </div>
                </div>

                {/* Score */}
                <span className={`text-lg font-bold ${isCurrentUser ? 'text-black' : 'text-gray-900'}`}>
                  {player.score}pts
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Tablet - Light Mode Yellow/Black Bottom Panel
  if (mode === 'tablet') {
    const currentUserRank = sortedPlayers.findIndex(p => p.name === currentPlayerName) + 1;
    
    return (
      <>
        {/* Collapsed State */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full bg-white border-t-2 border-yellow-400 transition-all duration-300 shadow-xl hover:shadow-2xl"
        >
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <div className="text-left">
                <p className="font-bold text-gray-900 text-base">
                  {players.length} Players
                </p>
                <p className="text-sm text-gray-600">
                  You: {currentUserRank}{getRankSuffix(currentUserRank)} {getRankEmoji(currentUserRank)}
                </p>
              </div>
            </div>
            <span className="text-2xl text-gray-700 font-bold">
              {isExpanded ? '▼' : '▲'}
            </span>
          </div>
        </button>

        {/* Expanded State */}
        {isExpanded && (
          <div className="bg-white border-t-2 border-yellow-400 px-4 py-3 space-y-2 max-h-[45vh] overflow-y-auto">
            {sortedPlayers.map((player, index) => {
              const rank = index + 1;
              const isCurrentUser = player.name === currentPlayerName;
              
              return (
                <div
                  key={player.id}
                  className={`
                    flex items-center justify-between px-3 py-2.5 rounded-lg transition-all
                    ${isCurrentUser 
                      ? 'bg-yellow-400 text-black border-2 border-yellow-500' 
                      : 'bg-gray-50 text-gray-900 border border-gray-200'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xl font-bold ${isCurrentUser ? 'text-black' : 'text-gray-700'}`}>
                      {getRankEmoji(rank)}
                    </span>
                    <p className={`font-bold ${isCurrentUser ? 'text-black' : 'text-gray-900'}`}>
                      {isCurrentUser ? 'You' : player.name}
                    </p>
                  </div>
                  <span className={`text-lg font-bold ${isCurrentUser ? 'text-black' : 'text-gray-900'}`}>
                    {player.score}pts
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // Mobile - Draggable mini with updated full view
  if (mode === 'mobile') {
    const topPlayers = sortedPlayers.slice(0, 3);
    const remainingCount = Math.max(0, players.length - 3);

    return (
      <>
        {/* Mini Floating Card - DRAGGABLE */}
        <div
          ref={draggableRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={(e) => {
            if (!isDragging) {
              setIsExpanded(!isExpanded);
            }
          }}
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            zIndex: 40
          }}
          className="bg-white/95 backdrop-blur-xl rounded-2xl border-2 border-white/60 shadow-2xl p-3 hover:scale-105 transition-transform select-none"
        >
          {/* Drag handle */}
          <div className="flex items-center justify-center mb-1">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
          
          <div className="space-y-1.5 min-w-[130px]">
            {topPlayers.map((player, index) => {
              const rank = index + 1;
              const isCurrentUser = player.name === currentPlayerName;
              
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between text-xs ${
                    isCurrentUser ? 'font-bold text-yellow-900 bg-yellow-50 px-2 py-1 rounded-lg' : 'text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-base">{getRankEmoji(rank)}</span>
                    <span className="truncate max-w-[65px]">
                      {isCurrentUser ? 'You' : player.name}
                    </span>
                  </span>
                  <span className="font-bold text-sm">{player.score}</span>
                </div>
              );
            })}
            {remainingCount > 0 && (
              <p className="text-xs text-gray-500 text-center pt-1.5 border-t border-gray-200 font-medium">
                +{remainingCount} more
              </p>
            )}
          </div>
        </div>

        {/* Full Screen Modal - UPDATED DESIGN */}
        {isExpanded && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsExpanded(false)}
          >
            <div 
              className="bg-white rounded-3xl border-2 border-yellow-400 shadow-2xl max-w-sm w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Light Yellow */}
              <div className="bg-yellow-400 p-5 flex items-center justify-between border-b-2 border-yellow-500">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-black" />
                  <h3 className="text-xl font-bold text-black">Leaderboard</h3>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-black hover:text-black/70 transition-colors p-2 hover:bg-black/10 rounded-xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Full List - Light Mode */}
              <div className="p-4 space-y-2 overflow-y-auto max-h-[65vh]">
                {sortedPlayers.map((player, index) => {
                  const rank = index + 1;
                  const isCurrentUser = player.name === currentPlayerName;
                  
                  return (
                    <div
                      key={player.id}
                      className={`
                        flex items-center justify-between px-3 py-3 rounded-xl
                        ${isCurrentUser 
                          ? 'bg-yellow-400 text-black border-2 border-yellow-500' 
                          : 'bg-gray-50 border-2 border-gray-200'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold ${isCurrentUser ? 'text-black' : 'text-gray-700'}`}>
                          {getRankEmoji(rank)}
                        </span>
                        <div>
                          <p className={`font-bold text-base ${isCurrentUser ? 'text-black' : 'text-gray-900'}`}>
                            {isCurrentUser ? 'You' : player.name}
                          </p>
                          <p className={`text-xs ${isCurrentUser ? 'text-black/70' : 'text-gray-500'}`}>
                            {rank}{getRankSuffix(rank)} place
                          </p>
                        </div>
                      </div>
                      <span className={`text-xl font-bold ${isCurrentUser ? 'text-black' : 'text-gray-900'}`}>
                        {player.score}pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
