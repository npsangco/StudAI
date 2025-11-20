import { useState, useEffect } from 'react';
import { Heart, Sparkles, Star } from 'lucide-react';

// Get cat sprite based on level (same as PetBuddy)
const getCatSprite = (level) => {
  if (level >= 1 && level <= 16) {
    return "/cat-kitten.gif"; // Kitten (levels 1-16)
  } else if (level >= 17 && level <= 33) {
    return "/cat-teen.gif"; // Teen/Middle (levels 17-33)
  } else {
    return "/cat-adult.gif"; // Adult (levels 34-50)
  }
};

// Get pet image based on type and level
const getPetImage = (petType, level) => {
  return petType === "Dog" 
    ? "/dog.gif" 
    : getCatSprite(level);
};

const MOTIVATIONAL_MESSAGES = {
  correct: [
    "Great job! You're doing amazing! 🌟",
    "Excellent work! Keep it up! ✨",
    "Perfect! You're on fire! 🔥",
    "Awesome! You've got this! 💪",
    "Brilliant answer! I'm proud of you! 🎉",
    "Yes! That's the way to do it! ⭐",
    "Fantastic! You're so smart! 🧠",
    "Wow! You really know your stuff! 📚",
    "Outstanding! Keep shining! ✨",
    "Amazing! You're unstoppable! 🚀"
  ],
  incorrect: [
    "Don't worry! You'll get the next one! 💪",
    "That's okay! Learning is a journey! 🌱",
    "Keep going! You're doing great! ❤️",
    "No problem! Everyone makes mistakes! 🌟",
    "Stay positive! You've got this! ✨",
    "It's alright! Keep trying! 🎯",
    "Don't give up! You're improving! 📈",
    "That's okay! Let's keep learning! 📚",
    "Shake it off! Next question awaits! 🌈",
    "Stay strong! You can do it! 💖"
  ],
  encouragement: [
    "I believe in you! 💫",
    "You're doing wonderfully! ✨",
    "Keep up the great work! 🌟",
    "I'm here cheering for you! 📣",
    "You're making progress! 🎯",
    "Stay focused! You've got this! 👀",
    "You're capable of great things! 🚀",
    "Trust yourself! 💪",
    "Almost there! Keep going! 🏃",
    "You're doing your best! That's what matters! ❤️"
  ]
};

const FloatingPetMotivator = ({ pet, onAnswer = null, showEncouragement = false }) => {
  const [message, setMessage] = useState('');
  const [animation, setAnimation] = useState('float');
  const [showHeart, setShowHeart] = useState(false);

  // Early return after hooks to avoid "Cannot access before initialization" error
  const isValidPet = pet && pet.pet_name && pet.pet_type && pet.level !== undefined;

  // Show initial encouragement message
  useEffect(() => {
    if (!isValidPet) return;
    const randomEncouragement = MOTIVATIONAL_MESSAGES.encouragement[
      Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.encouragement.length)
    ];
    setMessage(randomEncouragement);
  }, [isValidPet]);

  // Handle answer feedback
  useEffect(() => {
    if (!isValidPet || onAnswer === null) return;

    const messages = onAnswer 
      ? MOTIVATIONAL_MESSAGES.correct 
      : MOTIVATIONAL_MESSAGES.incorrect;
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setMessage(randomMessage);

    // Animate the pet
    if (onAnswer) {
      setAnimation('jump');
      setShowHeart(true);
      setTimeout(() => {
        setAnimation('float');
        setShowHeart(false);
      }, 1000);
    } else {
      setAnimation('shake');
      setTimeout(() => {
        setAnimation('float');
      }, 800);
    }

    // Clear the answer state after showing feedback
    setTimeout(() => {
      const encouragement = MOTIVATIONAL_MESSAGES.encouragement[
        Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.encouragement.length)
      ];
      setMessage(encouragement);
    }, 3000);
  }, [onAnswer, isValidPet]);

  // Show encouragement periodically
  useEffect(() => {
    if (!isValidPet || !showEncouragement) return;

    const interval = setInterval(() => {
      const randomEncouragement = MOTIVATIONAL_MESSAGES.encouragement[
        Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.encouragement.length)
      ];
      setMessage(randomEncouragement);
    }, 15000);

    return () => clearInterval(interval);
  }, [showEncouragement, isValidPet]);

  // Return null after all hooks have been called
  if (!isValidPet) return null;

  const petImage = getPetImage(pet.pet_type, pet.level || 1);

  return (
    <>
      <div className="fixed right-4 top-24 z-40 pointer-events-none">
        <div className={`relative ${animation === 'float' ? 'animate-pet-float' : ''} ${animation === 'jump' ? 'animate-pet-jump' : ''} ${animation === 'shake' ? 'animate-pet-shake' : ''}`}>
          {showHeart && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 animate-pet-float-up">
              <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            </div>
          )}

          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full shadow-lg border-4 border-white flex items-center justify-center overflow-hidden">
              <img 
                src={petImage} 
                alt={`${pet.pet_name} - Level ${pet.level}`}
                className="w-full h-full object-contain"
              />
            </div>
            
            {onAnswer === true && (
              <div className="absolute -top-2 -right-2 animate-pet-spin">
                <Sparkles className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              </div>
            )}
          </div>

          <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 w-64 pointer-events-auto">
            <div className="bg-white rounded-2xl shadow-xl p-4 relative border-2 border-purple-200">
              <div className="absolute left-0 top-1/2 transform -translate-x-2 -translate-y-1/2">
                <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-purple-200"></div>
                <div className="w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[7px] border-r-white absolute top-[1px] left-[1px]"></div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-purple-600">{pet.pet_name}</span>
                {onAnswer === true && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
              </div>

              <p className="text-sm text-gray-700 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pet-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pet-jump {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.1); }
        }
        @keyframes pet-shake {
          0%, 100% { transform: translateX(0px); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes pet-float-up {
          0% { opacity: 1; transform: translateY(0px); }
          100% { opacity: 0; transform: translateY(-30px); }
        }
        @keyframes pet-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-pet-float {
          animation: pet-float 3s ease-in-out infinite;
        }
        .animate-pet-jump {
          animation: pet-jump 0.6s ease-in-out;
        }
        .animate-pet-shake {
          animation: pet-shake 0.5s ease-in-out;
        }
        .animate-pet-float-up {
          animation: pet-float-up 1s ease-out forwards;
        }
        .animate-pet-spin {
          animation: pet-spin 2s linear infinite;
        }
      `}} />
    </>
  );
};

export default FloatingPetMotivator;
