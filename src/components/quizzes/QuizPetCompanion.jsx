// QuizPetCompanion.jsx - Pet companion for quiz motivation
import { useState, useEffect, useMemo, useRef } from 'react';
import { petApi } from '../../api/api';

const QuizPetCompanion = ({ isCorrect, showMessage, onMessageShown }) => {
  const [pet, setPet] = useState(null);
  const [currentMessage, setCurrentMessage] = useState(null);
  const [messageKey, setMessageKey] = useState(0);
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

  // Show message when triggered - only once per answer, only for correct answers
  useEffect(() => {
    if (showMessage && isCorrect === true && !hasShownRef.current) {
      hasShownRef.current = true; // Mark as shown
      
      // Only show messages for correct answers
      const messages = motivatingMessages.correct;
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
  
  // Reset tracking and clear message when moving to new question
  useEffect(() => {
    if (!showMessage) {
      hasShownRef.current = false;
      setCurrentMessage(null); // Clear message immediately on new question
    }
  }, [showMessage]);

  // Don't render if no pet
  if (!pet) return null;

  const petImage = pet.pet_type === "Dog" 
    ? "/dog.gif" 
    : getCatSprite(pet.level);

  return (
    <div 
      className="fixed md:bottom-6 md:right-6 bottom-2 left-1/2 md:left-auto -translate-x-1/2 md:translate-x-0 z-40 flex flex-col items-center md:items-end pointer-events-none"
      style={{ maxWidth: '320px' }}
    >
      {/* Speech Bubble - Only show for correct answers */}
      {currentMessage && (
        <div 
          key={messageKey}
          className="relative mb-2 border-2 rounded-2xl px-3 py-2 shadow-lg animate-bounce-in bg-green-50 border-green-400"
        >
          <p className="text-xs font-medium text-gray-800 text-center">
            {currentMessage}
          </p>
          {/* Speech bubble tail */}
          <div className="absolute -bottom-2 left-1/2 md:left-auto md:right-6 -translate-x-1/2 md:translate-x-0 w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent border-t-green-400"></div>
          <div className="absolute -bottom-1.5 left-1/2 md:left-auto md:right-6 -translate-x-1/2 md:translate-x-0 w-0 h-0 border-l-5 border-r-5 border-t-5 border-l-transparent border-r-transparent border-t-green-50"></div>
        </div>
      )}

      {/* Pet Image - Always visible */}
      <div className="flex items-center gap-2">
        <img 
          src={petImage} 
          alt={`${pet.pet_name}`}
          className="w-[54px] h-[54px] object-contain drop-shadow-lg"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default QuizPetCompanion;
