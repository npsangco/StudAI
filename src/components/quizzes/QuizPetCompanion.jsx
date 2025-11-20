// QuizPetCompanion.jsx - Pet companion for quiz motivation
import { useState, useEffect, useMemo } from 'react';
import { petApi } from '../../api/api';

const QuizPetCompanion = ({ isCorrect, showMessage, onMessageShown }) => {
  const [pet, setPet] = useState(null);
  const [currentMessage, setCurrentMessage] = useState(null);
  const [messageKey, setMessageKey] = useState(0);
  const [lastShownKey, setLastShownKey] = useState(null); // Track if we already showed message

  // Load pet data once on mount
  useEffect(() => {
    const loadPet = async () => {
      try {
        const res = await petApi.getPet();
        if (!res.data.choosePet && res.data) {
          setPet(res.data);
        }
      } catch (err) {
        console.error('Failed to load pet for quiz:', err);
      }
    };
    loadPet();
  }, []);

  // Get cat sprite based on level
  const getCatSprite = (level) => {
    if (level >= 1 && level <= 16) {
      return "/cat-kitten.gif";
    } else if (level >= 17 && level <= 33) {
      return "/cat-teen.gif";
    } else {
      return "/cat-adult.gif";
    }
  };

  // Motivating messages for quiz
  const motivatingMessages = useMemo(() => ({
    correct: [
      "Amazing! You got it right! 🌟",
      "Perfect! Keep it up! ⭐",
      "Brilliant! You're on fire! 🔥",
      "Yes! That's correct! 💯",
      "Fantastic work! 🎉",
      "You're crushing it! 💪",
      "Excellent! Keep going! ✨",
      "Nailed it! 🎯",
      "Superb answer! 🏆",
      "You're a star! ⭐",
    ],
    incorrect: [
      "Don't worry! Keep trying! 💪",
      "You'll get the next one! 🌟",
      "Keep going! You're learning! 📚",
      "It's okay! Stay focused! ✨",
      "Every mistake is a lesson! 💡",
      "You've got this! Keep pushing! 🔥",
      "Stay positive! Next one's yours! 🎯",
      "Learning is a journey! 🚀",
      "Shake it off! You can do it! 💪",
      "Stay determined! 🌈",
    ],
    encouragement: [
      "I believe in you! 💫",
      "You're doing great! ✨",
      "Keep up the good work! 🌟",
      "I'm here with you! 📣",
      "You've got this! 🎯",
      "Stay focused! 👀",
      "You're amazing! 🚀",
      "Trust yourself! 💪",
      "Keep going! 🏃",
      "You can do it! ❤️",
    ]
  }), []);

  // Show message when triggered
  useEffect(() => {
    // Create a unique key for this answer
    const currentKey = `${isCorrect}-${showMessage}`;
    
    // Only show if we haven't shown this exact message yet
    if (showMessage && isCorrect !== null && lastShownKey !== currentKey) {
      setLastShownKey(currentKey); // Mark as shown
      
      // Randomly choose from correct/incorrect OR encouragement
      const useEncouragement = Math.random() < 0.15; // 15% chance for encouragement
      
      let messageType;
      if (useEncouragement) {
        messageType = 'encouragement';
      } else {
        messageType = isCorrect ? 'correct' : 'incorrect';
      }
      
      const messages = motivatingMessages[messageType];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      setCurrentMessage(randomMessage);
      setMessageKey(prev => prev + 1); // Force animation reset
      
      // Clear message after display duration
      const timeout = setTimeout(() => {
        setCurrentMessage(null);
        if (onMessageShown) {
          onMessageShown();
        }
      }, 2500); // Show for 2.5 seconds
      
      return () => clearTimeout(timeout);
    }
  }, [showMessage, isCorrect, motivatingMessages, onMessageShown, lastShownKey]);

  // Don't render if no pet
  if (!pet) return null;

  const petImage = pet.pet_type === "Dog" 
    ? "/dog.gif" 
    : getCatSprite(pet.level);

  const bubbleColor = isCorrect === null 
    ? "bg-blue-50 border-blue-400"
    : isCorrect 
      ? "bg-green-50 border-green-400" 
      : "bg-orange-50 border-orange-400";

  const tailColor = isCorrect === null
    ? "border-t-blue-400"
    : isCorrect
      ? "border-t-green-400"
      : "border-t-orange-400";

  const tailFillColor = isCorrect === null
    ? "border-t-blue-50"
    : isCorrect
      ? "border-t-green-50"
      : "border-t-orange-50";

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none"
      style={{ maxWidth: '320px' }}
    >
      {/* Speech Bubble - Only show when there's a message */}
      {currentMessage && (
        <div 
          key={messageKey}
          className={`relative mb-3 border-2 rounded-2xl px-4 py-3 shadow-lg animate-bounce-in ${bubbleColor}`}
        >
          <p className="text-sm font-medium text-gray-800 text-center">
            {currentMessage}
          </p>
          {/* Speech bubble tail */}
          <div className={`absolute -bottom-2 right-12 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${tailColor}`}></div>
          <div className={`absolute -bottom-1.5 right-12 w-0 h-0 border-l-7 border-r-7 border-t-7 border-l-transparent border-r-transparent ${tailFillColor}`}></div>
        </div>
      )}

      {/* Pet Image - Always visible */}
      <div className="flex items-center gap-2">
        <img 
          src={petImage} 
          alt={`${pet.pet_name}`}
          className="w-32 h-32 object-contain drop-shadow-lg"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default QuizPetCompanion;
