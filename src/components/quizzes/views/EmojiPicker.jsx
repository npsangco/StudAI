import React, { useState, useRef, useEffect } from 'react';

const BATTLE_EMOJIS = [
  { id: 'fire', emoji: '🔥', label: 'On fire!' },
  { id: 'sweat', emoji: '😅', label: 'This is hard' },
  { id: 'party', emoji: '🎉', label: 'Got it!' },
  { id: 'skull', emoji: '💀', label: 'Oof' },
  { id: 'eyes', emoji: '👀', label: 'Watching' },
  { id: 'muscle', emoji: '💪', label: 'Let\'s go!' }
];

export const EmojiPicker = ({ onEmojiSelect, disabled = false, cooldown = 2000, mode = 'popup' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [onCooldown, setOnCooldown] = useState(false);
  const pickerRef = useRef(null);

  // Close picker when clicking outside (only for popup mode)
  useEffect(() => {
    if (mode === 'inline') return; // Don't need click-outside for inline mode

    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, mode]);

  const handleEmojiClick = (emoji) => {
    if (onCooldown || disabled) return;

    onEmojiSelect(emoji);
    if (mode === 'popup') {
      setIsOpen(false);
    }
    setOnCooldown(true);

    // Cooldown timer
    setTimeout(() => {
      setOnCooldown(false);
    }, cooldown);
  };

  // INLINE MODE - Always visible, horizontal layout
  if (mode === 'inline') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 bg-white rounded-2xl shadow-xl border-2 border-yellow-400 p-2" ref={pickerRef}>
        {BATTLE_EMOJIS.map((item) => (
          <button
            key={item.id}
            onClick={() => handleEmojiClick(item)}
            disabled={disabled || onCooldown}
            className={`
              relative w-12 h-12 flex items-center justify-center text-2xl rounded-xl transition-all transform
              ${disabled || onCooldown
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-yellow-50 hover:scale-110 active:scale-95'
              }
            `}
            title={item.label}
          >
            {item.emoji}
            {/* Cooldown overlay per emoji */}
            {onCooldown && (
              <div className="absolute inset-0 rounded-xl border-2 border-yellow-500 animate-ping pointer-events-none"></div>
            )}
          </button>
        ))}
        {onCooldown && (
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap w-full text-center">⏱️ Cooldown...</span>
        )}
      </div>
    );
  }

  // POPUP MODE - Button with popup
  return (
    <div className="relative" ref={pickerRef}>
      {/* Emoji Picker Button */}
      <button
        onClick={() => !disabled && !onCooldown && setIsOpen(!isOpen)}
        disabled={disabled || onCooldown}
        className={`
          w-12 h-12 rounded-full shadow-lg transition-all transform
          ${disabled || onCooldown
            ? 'bg-gray-300 cursor-not-allowed opacity-50'
            : 'bg-amber-500 hover:bg-amber-600 hover:scale-110 active:scale-95'
          }
          flex items-center justify-center text-2xl
        `}
        title="Send Reaction"
      >
        {onCooldown ? '⏱️' : '😊'}
      </button>

      {/* Emoji Popup */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 bg-white rounded-2xl shadow-2xl border-2 border-yellow-400 p-3 z-50 animate-fadeIn">
          <div className="grid grid-cols-3 gap-2">
            {BATTLE_EMOJIS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleEmojiClick(item)}
                className="w-14 h-14 flex items-center justify-center text-3xl hover:bg-yellow-50 rounded-xl transition-all transform hover:scale-125 active:scale-95"
                title={item.label}
              >
                {item.emoji}
              </button>
            ))}
          </div>

          {/* Triangle pointer */}
          <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-r-2 border-b-2 border-yellow-400 transform rotate-45"></div>
        </div>
      )}

      {/* Cooldown Overlay */}
      {onCooldown && (
        <div className="absolute inset-0 rounded-full border-4 border-yellow-500 animate-ping pointer-events-none"></div>
      )}
    </div>
  );
};
