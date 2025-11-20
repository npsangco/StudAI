import { useState, useEffect } from 'react';
import { Heart, Sparkles, Star } from 'lucide-react';

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

const QuizPetCompanion = ({ petType = 'Dog', petName = 'Buddy', onAnswer = null, showEncouragement = false }) => {
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [animation, setAnimation] = useState('float');
  const [showHeart, setShowHeart] = useState(false);

  // Show initial encouragement message
  useEffect(() => {
    const randomEncouragement = MOTIVATIONAL_MESSAGES.encouragement[
      Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.encouragement.length)
    ];
    setMessage(randomEncouragement);
  }, []);

  // Handle answer feedback
  useEffect(() => {
    if (onAnswer === null) return;

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
  }, [onAnswer]);

  // Show encouragement periodically
  useEffect(() => {
    if (!showEncouragement) return;

    const interval = setInterval(() => {
      const randomEncouragement = MOTIVATIONAL_MESSAGES.encouragement[
        Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.encouragement.length)
      ];
      setMessage(randomEncouragement);
    }, 15000); // Every 15 seconds

    return () => clearInterval(interval);
  }, [showEncouragement]);

  if (!isVisible) return null;

  // Pet emoji based on type
  const petEmoji = petType === 'Dog' ? '🐕' : '🐱';

  return (
    <div className="fixed right-4 top-24 z-40 pointer-events-none">
      {/* Pet Container */}
      <div className={`relative ${animation === 'float' ? 'animate-float' : ''} ${animation === 'jump' ? 'animate-jump' : ''} ${animation === 'shake' ? 'animate-shake' : ''}`}>
        {/* Floating Hearts */}
        {showHeart && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 animate-float-up">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          </div>
        )}

        {/* Pet Avatar */}
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full shadow-lg border-4 border-white flex items-center justify-center">
            <span className="text-5xl">{petEmoji}</span>
          </div>
          
          {/* Sparkle effect for correct answers */}
          {onAnswer === true && (
            <div className="absolute -top-2 -right-2 animate-spin-slow">
              <Sparkles className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            </div>
          )}
        </div>

        {/* Speech Bubble */}
        <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 w-64 pointer-events-auto">
          <div className="bg-white rounded-2xl shadow-xl p-4 relative border-2 border-purple-200">
            {/* Speech bubble tail */}
            <div className="absolute left-0 top-1/2 transform -translate-x-2 -translate-y-1/2">
              <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-purple-200"></div>
              <div className="w-0 h-0 border-t-7 border-t-transparent border-b-7 border-b-transparent border-r-7 border-r-white absolute top-0.5 left-0.5"></div>
            </div>

            {/* Pet Name */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-purple-600">{petName}</span>
              {onAnswer === true && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
            </div>

            {/* Message */}
            <p className="text-sm text-gray-700 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes jump {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0px); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes float-up {
          0% { opacity: 1; transform: translateY(0px); }
          100% { opacity: 0; transform: translateY(-30px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-jump {
          animation: jump 0.6s ease-in-out;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animate-float-up {
          animation: float-up 1s ease-out forwards;
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default QuizPetCompanion;
