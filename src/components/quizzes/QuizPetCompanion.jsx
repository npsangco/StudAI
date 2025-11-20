// QuizPetCompanion.jsx - Pet companion for quiz motivation
import { useState, useEffect, useMemo } from 'react';
import { petApi } from '../../api/api';

const QuizPetCompanion = ({ isCorrect, showMessage, onMessageShown }) => {
  const [pet, setPet] = useState(null);
  const [currentMessage, setCurrentMessage] = useState(null);
  const [messageKey, setMessageKey] = useState(0);

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
    ]
  }), []);

  // Show message when triggered
  useEffect(() => {
    if (showMessage && isCorrect !== null) {
      const messageType = isCorrect ? 'correct' : 'incorrect';
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
  }, [showMessage, isCorrect, motivatingMessages, onMessageShown]);

  // Don't render if no pet or no message to show
  if (!pet || !currentMessage) return null;

  const petImage = pet.pet_type === "Dog" 
    ? "/dog.gif" 
    : getCatSprite(pet.level);

  const bubbleColor = isCorrect 
    ? "bg-green-50 border-green-400" 
    : "bg-orange-50 border-orange-400";

  const tailColor = isCorrect
    ? "border-t-green-400"
    : "border-t-orange-400";

  const tailFillColor = isCorrect
    ? "border-t-green-50"
    : "border-t-orange-50";

  return (
    <div 
      key={messageKey}
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end animate-bounce-in pointer-events-none"
      style={{ maxWidth: '280px' }}
    >
      {/* Speech Bubble */}
      <div className={`relative mb-2 border-2 rounded-2xl px-4 py-3 shadow-lg ${bubbleColor}`}>
        <p className="text-sm font-medium text-gray-800 text-center">
          {currentMessage}
        </p>
        {/* Speech bubble tail */}
        <div className={`absolute -bottom-2 right-8 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${tailColor}`}></div>
        <div className={`absolute -bottom-1.5 right-8 w-0 h-0 border-l-7 border-r-7 border-t-7 border-l-transparent border-r-transparent ${tailFillColor}`}></div>
      </div>

      {/* Pet Image */}
      <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-md border border-gray-200">
        <img 
          src={petImage} 
          alt={`${pet.pet_name}`}
          className="w-16 h-16 object-contain"
          loading="lazy"
        />
        <div className="text-xs">
          <p className="font-bold text-gray-700">{pet.pet_name}</p>
          <p className="text-gray-500">Lvl {pet.level}</p>
        </div>
      </div>
    </div>
  );
};

export default QuizPetCompanion;
