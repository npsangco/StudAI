// QuizPetCompanion.jsx - Pet companion for quiz motivation
import { useState, useEffect, useMemo, useRef } from 'react';
import { petApi } from '../../api/api';

const QuizPetCompanion = ({ isCorrect, showMessage, showEncouragement, onMessageShown, onEncouragementShown }) => {
  const [pet, setPet] = useState(null);
  const [currentMessage, setCurrentMessage] = useState(null);
  const [messageKey, setMessageKey] = useState(0);
  const [messageType, setMessageType] = useState(null);
  const hasShownRef = useRef(false); // Track if we already showed message for current answer

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
      "Amazing! You got it right!",
      "Perfect! Keep it up!",
      "Brilliant! You're on fire!",
      "Yes! That's correct!",
      "Fantastic work!",
      "You're crushing it!",
      "Excellent! Keep going!",
      "Nailed it!",
      "Superb answer!",
      "You're a star!",
    ],
    incorrect: [
      "Don't worry! Keep trying!",
      "You'll get the next one!",
      "Keep going! You're learning!",
      "It's okay! Stay focused!",
      "Every mistake is a lesson!",
      "You've got this! Keep pushing!",
      "Stay positive! Next one's yours!",
      "Learning is a journey!",
      "Shake it off! You can do it!",
      "Stay determined!",
    ],
    encouragement: [
      "I believe in you!",
      "You're doing great!",
      "Keep up the good work!",
      "I'm here with you!",
      "You've got this!",
      "Stay focused!",
      "You're amazing!",
      "Trust yourself!",
      "Keep going!",
      "You can do it!",
    ]
  }), []);

  // Show message when triggered - only once per answer, for both correct and incorrect
  useEffect(() => {
    if (showMessage && isCorrect !== null && !hasShownRef.current) {
      hasShownRef.current = true; // Mark as shown
      
      // Show messages based on correct/incorrect
      const msgType = isCorrect ? 'correct' : 'incorrect';
      const messages = motivatingMessages[msgType];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      setMessageType(msgType);
      setCurrentMessage(randomMessage);
      setMessageKey(prev => prev + 1); // Force animation reset
      
      // Clear message after display duration
      const timeout = setTimeout(() => {
        setCurrentMessage(null);
        setMessageType(null);
        if (onMessageShown) {
          onMessageShown();
        }
      }, 2500); // Show for 2.5 seconds
      
      return () => clearTimeout(timeout);
    }
  }, [showMessage, isCorrect, motivatingMessages, onMessageShown]);
  
  // Show encouragement message when user is taking too long
  useEffect(() => {
    if (showEncouragement) {
      const messages = motivatingMessages.encouragement;
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      setMessageType('encouragement');
      setCurrentMessage(randomMessage);
      setMessageKey(prev => prev + 1);
      
      // Auto-dismiss after 1 second
      const timeout = setTimeout(() => {
        setCurrentMessage(null);
        setMessageType(null);
        if (onEncouragementShown) {
          onEncouragementShown();
        }
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [showEncouragement, motivatingMessages, onEncouragementShown]);
  
  // Reset tracking and clear message when moving to new question
  useEffect(() => {
    if (!showMessage && !showEncouragement) {
      hasShownRef.current = false;
      setCurrentMessage(null);
      setMessageType(null);
    }
  }, [showMessage, showEncouragement]);

  // Don't render if no pet
  if (!pet) return null;

  const petImage = pet.pet_type === "Dog" 
    ? "/dog.gif" 
    : getCatSprite(pet.level);

  const getBubbleColors = () => {
    if (messageType === 'correct') return 'bg-green-50 border-green-400';
    if (messageType === 'incorrect') return 'bg-orange-50 border-orange-400';
    return 'bg-blue-50 border-blue-400'; // encouragement
  };
  
  const getTailColors = () => {
    if (messageType === 'correct') return { outer: 'border-t-green-400', inner: 'border-t-green-50' };
    if (messageType === 'incorrect') return { outer: 'border-t-orange-400', inner: 'border-t-orange-50' };
    return { outer: 'border-t-blue-400', inner: 'border-t-blue-50' }; // encouragement
  };

  return (
    <div 
      className="fixed md:bottom-8 md:right-8 bottom-4 right-4 z-40 flex flex-col items-end pointer-events-none"
      style={{ maxWidth: '280px' }}
    >
      {/* Speech Bubble */}
      {currentMessage && (
        <div 
          key={messageKey}
          className={`relative mb-3 border-2 rounded-2xl px-4 py-2.5 shadow-lg animate-bounce-in ${getBubbleColors()}`}
        >
          <p className="text-sm font-medium text-gray-800 text-center">
            {currentMessage}
          </p>
          {/* Speech bubble tail */}
          <div className={`absolute -bottom-2 right-8 w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent ${getTailColors().outer}`}></div>
          <div className={`absolute -bottom-1.5 right-8 w-0 h-0 border-l-5 border-r-5 border-t-5 border-l-transparent border-r-transparent ${getTailColors().inner}`}></div>
        </div>
      )}

      {/* Pet Image - Always visible */}
      <div className="flex items-center gap-2">
        <img 
          src={petImage} 
          alt={`${pet.pet_name}`}
          className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain drop-shadow-lg"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default QuizPetCompanion;
