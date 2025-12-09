// QuizPetCompanion.jsx - Pet companion for quiz motivation
import { useState, useEffect, useMemo, useRef } from 'react';
import { petApi } from '../../api/api';

const QuizPetCompanion = ({ isCorrect, showMessage, showEncouragement, onMessageShown, onEncouragementShown }) => {
  const [pet, setPet] = useState(null);
  const [currentMessage, setCurrentMessage] = useState(null);
  const [messageKey, setMessageKey] = useState(0);
  const [messageType, setMessageType] = useState(null);
  const hasShownRef = useRef(false);

  useEffect(() => {
    const loadPet = async () => {
      try {
        const res = await petApi.getPet();
        if (!res.data.choosePet && res.data) {
          setPet(res.data);
        }
      } catch (err) {

      }
    };
    loadPet();
  }, []);

  const getCatSprite = (level) => {
    if (level >= 1 && level <= 16) {
      return "/cat-kitten.gif";
    } else if (level >= 17 && level <= 33) {
      return "/cat-teen.gif";
    } else {
      return "/cat-adult.gif";
    }
  };

  const getDogSprite = (level) => {
    if (level >= 1 && level <= 16) {
      return "/dog-puppy.gif";
    } else if (level >= 17 && level <= 33) {
      return "/dog-teen.gif";
    } else {
      return "/dog-adult.gif";
    }
  };

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

  useEffect(() => {
    if (showMessage && isCorrect !== null && !hasShownRef.current) {
      hasShownRef.current = true;
      
      const msgType = isCorrect ? 'correct' : 'incorrect';
      const messages = motivatingMessages[msgType];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      setMessageType(msgType);
      setCurrentMessage(randomMessage);
      setMessageKey(prev => prev + 1);
      
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
  
  useEffect(() => {
    if (!showMessage && !showEncouragement) {
      hasShownRef.current = false;
      setCurrentMessage(null);
      setMessageType(null);
    }
  }, [showMessage, showEncouragement]);

  if (!pet) return null;

  const petImage = pet.pet_type === "Dog" 
    ? getDogSprite(pet.level)
    : getCatSprite(pet.level);

  const getBubbleColors = () => {
    if (messageType === 'correct') return 'bg-green-50 border-green-400';
    if (messageType === 'incorrect') return 'bg-orange-50 border-orange-400';
    return 'bg-blue-50 border-blue-400';
  };
  
  const getTailColors = () => {
    if (messageType === 'correct') return { outer: 'border-t-green-400', inner: 'border-t-green-50' };
    if (messageType === 'incorrect') return { outer: 'border-t-orange-400', inner: 'border-t-orange-50' };
    return { outer: 'border-t-blue-400', inner: 'border-t-blue-50' };
  };

  const getPetSize = (level) => {
    if (level >= 1 && level <= 16) {
      return "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24";
    } else if (level >= 17 && level <= 33) {
      return "w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32";
    } else {
      return "w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36";
    }
  };

  return (
    <div 
      className="fixed md:bottom-8 md:right-8 bottom-4 right-4 z-40 flex flex-col items-end pointer-events-none"
      style={{ maxWidth: '280px' }}
    >
      {currentMessage && (
        <div 
          key={messageKey}
          className={`relative mb-3 border-2 rounded-2xl px-4 py-2.5 shadow-lg animate-bounce-in ${getBubbleColors()}`}
        >
          <p className="text-sm font-medium text-gray-800 text-center">
            {currentMessage}
          </p>
          <div className={`absolute -bottom-2 right-8 w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent ${getTailColors().outer}`}></div>
          <div className={`absolute -bottom-1.5 right-8 w-0 h-0 border-l-5 border-r-5 border-t-5 border-l-transparent border-r-transparent ${getTailColors().inner}`}></div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <img 
          src={petImage} 
          alt={`${pet.pet_name}`}
          className={`${getPetSize(pet.level)} object-contain drop-shadow-lg transition-all duration-500`}
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default QuizPetCompanion;
