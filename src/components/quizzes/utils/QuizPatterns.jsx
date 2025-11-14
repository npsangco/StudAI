import React from 'react';

// Quiz Background Patterns Component
export const QuizBackgroundPattern = ({ questionType }) => {
  if (!questionType) return null;

  console.log('🎨 Rendering pattern for:', questionType);

  switch (questionType) {
    case 'Multiple Choice':
      return (
        <div className="fixed inset-0 pointer-events-none opacity-10 z-0">
          {/* Floating circles and question marks */}
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="circles" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="8" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2"/>
                <circle cx="80" cy="60" r="12" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2"/>
                <circle cx="50" cy="80" r="6" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2"/>
                <text x="65" y="25" fontSize="24" fill="rgba(0,0,0,0.3)" fontFamily="Arial" fontWeight="bold">?</text>
                <text x="15" y="70" fontSize="20" fill="rgba(0,0,0,0.3)" fontFamily="Arial" fontWeight="bold">?</text>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#circles)" />
          </svg>
        </div>
      );

    case 'Fill in the blanks':
      return (
        <div className="fixed inset-0 pointer-events-none opacity-10 z-0">
          {/* Scattered alphabet letters */}
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="alphabet" x="0" y="0" width="150" height="120" patternUnits="userSpaceOnUse">
                <text x="20" y="30" fontSize="28" fill="rgba(0,0,0,0.3)" fontFamily="Arial" fontWeight="bold">A</text>
                <text x="90" y="25" fontSize="22" fill="rgba(0,0,0,0.3)" fontFamily="Arial" fontWeight="bold">B</text>
                <text x="130" y="50" fontSize="24" fill="rgba(0,0,0,0.3)" fontFamily="Arial" fontWeight="bold">C</text>
                <text x="50" y="70" fontSize="26" fill="rgba(0,0,0,0.3)" fontFamily="Arial" fontWeight="bold">D</text>
                <text x="10" y="95" fontSize="20" fill="rgba(0,0,0,0.3)" fontFamily="Arial" fontWeight="bold">E</text>
                <text x="110" y="100" fontSize="25" fill="rgba(0,0,0,0.3)" fontFamily="Arial" fontWeight="bold">F</text>
                <text x="75" y="45" fontSize="18" fill="rgba(0,0,0,0.3)" fontFamily="Arial" fontWeight="bold">G</text>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#alphabet)" />
          </svg>
        </div>
      );

    case 'True/False':
      return (
        <div className="fixed inset-0 pointer-events-none opacity-10 z-0">
          {/* Check marks and X marks */}
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="checks" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                {/* Check mark */}
                <path d="M 20 35 L 28 43 L 45 26" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="3" strokeLinecap="round"/>
                {/* X mark */}
                <path d="M 70 65 L 85 80 M 85 65 L 70 80" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="3" strokeLinecap="round"/>
                {/* Circle */}
                <circle cx="32" cy="35" r="15" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2"/>
                <circle cx="77" cy="72" r="15" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#checks)" />
          </svg>
        </div>
      );

    case 'Matching':
      return (
        <div className="fixed inset-0 pointer-events-none opacity-10 z-0">
          {/* Puzzle pieces pattern */}
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="puzzle" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                {/* Puzzle piece 1 - with tab */}
                <path d="M 10 20 L 40 20 L 40 10 Q 45 10 45 15 Q 45 20 40 20 L 40 50 L 10 50 Z" 
                      fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2"/>
                
                {/* Puzzle piece 2 - with slot */}
                <path d="M 70 30 L 100 30 L 100 60 L 70 60 L 70 50 Q 65 50 65 45 Q 65 40 70 40 Z" 
                      fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2"/>
                
                {/* Puzzle piece 3 - simple */}
                <path d="M 20 80 L 50 80 L 50 110 L 20 110 Z" 
                      fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2"/>
                
                {/* Small puzzle piece 4 */}
                <path d="M 90 90 L 110 90 L 110 85 Q 113 85 113 88 Q 113 91 110 91 L 110 110 L 90 110 Z" 
                      fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#puzzle)" />
          </svg>
        </div>
      );

    default:
      return null;
  }
};

// Default pattern for loading screens (generic quiz pattern)
export const DefaultQuizPattern = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <div
          key={`q-${i}`}
          className="absolute text-6xl opacity-20 animate-float"
          style={{
            left: `${(i * 15) % 100}%`,
            top: `${(i * 20) % 100}%`,
            animationDuration: `${3 + (i % 3)}s`
          }}
        >
          ?
        </div>
      ))}
      
      {[...Array(5)].map((_, i) => (
        <div
          key={`circle-${i}`}
          className="absolute rounded-full bg-white opacity-10"
          style={{
            width: `${100 + i * 50}px`,
            height: `${100 + i * 50}px`,
            left: `${20 + i * 15}%`,
            top: `${30 + i * 10}%`,
            animation: `pulse-glow ${2 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`
          }}
        />
      ))}
    </div>
  );
};
