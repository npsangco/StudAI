import React, { useEffect, useState } from 'react';
import { listenToReactions } from '../../../firebase/reactionOperations';

export const EmojiReactions = ({ gamePin, currentUserId }) => {
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    if (!gamePin) return;

    const unsubscribe = listenToReactions(gamePin, (newReactions) => {
      // Keep only the 5 most recent reactions
      setReactions(newReactions.slice(0, 5));
    });

    return () => unsubscribe();
  }, [gamePin]);

  if (reactions.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col-reverse gap-2 pointer-events-none">
      {reactions.map((reaction, index) => {
        const age = Date.now() - reaction.timestamp;
        const opacity = Math.max(0, 1 - (age / 5000)); // Fade out over 5 seconds
        const isMyReaction = reaction.userId === currentUserId;

        return (
          <div
            key={reaction.id}
            className="animate-slideUp"
            style={{
              opacity: opacity,
              transform: `translateY(-${index * 4}px)`,
              animationDelay: `${index * 50}ms`
            }}
          >
            <div className={`
              flex items-center gap-2 px-4 py-2 rounded-full shadow-lg
              ${isMyReaction
                ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                : 'bg-gradient-to-r from-white to-gray-100'
              }
              border-2 ${isMyReaction ? 'border-blue-300' : 'border-gray-200'}
            `}>
              <span className="text-2xl">{reaction.emoji}</span>
              <span className={`text-sm font-semibold ${isMyReaction ? 'text-white' : 'text-gray-700'}`}>
                {isMyReaction ? 'You' : reaction.userName}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
