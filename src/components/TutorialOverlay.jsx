import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';

export default function TutorialOverlay({ steps, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetPosition, setTargetPosition] = useState(null);

  useEffect(() => {
    // Scroll to the highlighted element
    if (steps[currentStep]?.target) {
      const element = document.querySelector(steps[currentStep].target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Wait for scroll to complete, then update position
        setTimeout(() => {
          updateTargetPosition();
        }, 500);
      }
    }
  }, [currentStep, steps]);

  // Update target position on scroll and resize
  useEffect(() => {
    const updatePosition = () => {
      updateTargetPosition();
    };

    updateTargetPosition(); // Initial position
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [currentStep, steps]);

  const updateTargetPosition = () => {
    if (!steps[currentStep]?.target) {
      setTargetPosition(null);
      return;
    }
    
    const element = document.querySelector(steps[currentStep].target);
    if (!element) {
      setTargetPosition(null);
      return;
    }
    
    const rect = element.getBoundingClientRect();
    setTargetPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
      screenTop: rect.top,
      screenLeft: rect.left,
    });
  };

  if (!isVisible || !steps || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  const handleSkip = () => {
    setIsVisible(false);
    if (onSkip) onSkip();
  };

  // Calculate card position to be near but not overlapping the highlighted element
  const getCardPosition = () => {
    if (!targetPosition) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isMobile = windowWidth < 768;
    const cardWidth = isMobile ? Math.min(360, windowWidth - 40) : 420;
    const cardMaxHeight = isMobile ? Math.min(450, windowHeight - 140) : 480;
    const padding = isMobile ? 10 : 20;
    const taskbarHeight = 60;
    const minSpaceFromElement = 30;

    let top, left;
    let positioned = false;

    // Helper function to check if position would overlap with highlighted element
    const wouldOverlap = (cardTop, cardLeft) => {
      const cardRight = cardLeft + cardWidth;
      const cardBottom = cardTop + cardMaxHeight;
      const elemRight = targetPosition.screenLeft + targetPosition.width;
      const elemBottom = targetPosition.screenTop + targetPosition.height;
      
      // Check for overlap (with padding buffer)
      const buffer = 20;
      return !(
        cardRight + buffer < targetPosition.screenLeft ||
        cardLeft - buffer > elemRight ||
        cardBottom + buffer < targetPosition.screenTop ||
        cardTop - buffer > elemBottom
      );
    };

    // For mobile, place at top or bottom to avoid center overlap
    if (isMobile) {
      // Try top first
      const topPos = padding;
      if (!wouldOverlap(topPos, (windowWidth - cardWidth) / 2)) {
        top = topPos;
        left = (windowWidth - cardWidth) / 2;
        positioned = true;
      } else {
        // Place at bottom
        top = windowHeight - cardMaxHeight - taskbarHeight - padding;
        left = (windowWidth - cardWidth) / 2;
        positioned = true;
      }
    } else {
      // Try right side first (usually has more space)
      if (targetPosition.screenLeft + targetPosition.width + cardWidth + minSpaceFromElement < windowWidth) {
        const testLeft = targetPosition.screenLeft + targetPosition.width + minSpaceFromElement;
        const testTop = Math.max(padding, Math.min(windowHeight - cardMaxHeight - padding - taskbarHeight, targetPosition.screenTop));
        if (!wouldOverlap(testTop, testLeft)) {
          left = testLeft;
          top = testTop;
          positioned = true;
        }
      }
      
      // Try left side
      if (!positioned && targetPosition.screenLeft - cardWidth - minSpaceFromElement > 0) {
        const testLeft = targetPosition.screenLeft - cardWidth - minSpaceFromElement;
        const testTop = Math.max(padding, Math.min(windowHeight - cardMaxHeight - padding - taskbarHeight, targetPosition.screenTop));
        if (!wouldOverlap(testTop, testLeft)) {
          left = testLeft;
          top = testTop;
          positioned = true;
        }
      }
      
      // Try below element
      if (!positioned && targetPosition.screenTop + targetPosition.height + cardMaxHeight + minSpaceFromElement < windowHeight - taskbarHeight) {
        const testTop = targetPosition.screenTop + targetPosition.height + minSpaceFromElement;
        const testLeft = Math.max(padding, Math.min(windowWidth - cardWidth - padding, targetPosition.screenLeft));
        if (!wouldOverlap(testTop, testLeft)) {
          top = testTop;
          left = testLeft;
          positioned = true;
        }
      }
      
      // Try above element
      if (!positioned && targetPosition.screenTop - cardMaxHeight - minSpaceFromElement > padding) {
        const testTop = targetPosition.screenTop - cardMaxHeight - minSpaceFromElement;
        const testLeft = Math.max(padding, Math.min(windowWidth - cardWidth - padding, targetPosition.screenLeft));
        if (!wouldOverlap(testTop, testLeft)) {
          top = testTop;
          left = testLeft;
          positioned = true;
        }
      }
      
      // Last resort: place in top right corner
      if (!positioned) {
        top = padding;
        left = windowWidth - cardWidth - padding;
      }
    }

    return {
      top: `${Math.max(padding, top)}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
      maxHeight: `${cardMaxHeight}px`,
    };
  };

  const cardPosition = getCardPosition();

  return (
    <>
      {/* Dark overlay with cutout for highlighted element */}
      {targetPosition && (
        <>
          {/* Top overlay */}
          <div 
            className="fixed bg-black/75 z-[9998] transition-opacity"
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: `${targetPosition.screenTop - 8}px`,
            }}
          />
          
          {/* Left overlay */}
          <div 
            className="fixed bg-black/75 z-[9998] transition-opacity"
            style={{
              top: `${targetPosition.screenTop - 8}px`,
              left: 0,
              width: `${targetPosition.screenLeft - 8}px`,
              height: `${targetPosition.height + 16}px`,
            }}
          />
          
          {/* Right overlay */}
          <div 
            className="fixed bg-black/75 z-[9998] transition-opacity"
            style={{
              top: `${targetPosition.screenTop - 8}px`,
              left: `${targetPosition.screenLeft + targetPosition.width + 8}px`,
              right: 0,
              height: `${targetPosition.height + 16}px`,
            }}
          />
          
          {/* Bottom overlay */}
          <div 
            className="fixed bg-black/75 z-[9998] transition-opacity"
            style={{
              top: `${targetPosition.screenTop + targetPosition.height + 8}px`,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        </>
      )}
      
      {/* Full overlay if no target */}
      {!targetPosition && (
        <div className="fixed inset-0 bg-black/75 z-[9998] transition-opacity" />
      )}

      {/* Highlighted element border with pulsing animation */}
      {targetPosition && (
        <div
          className="fixed z-[9999] pointer-events-none transition-all duration-300 rounded-xl"
          style={{
            top: `${targetPosition.screenTop - 8}px`,
            left: `${targetPosition.screenLeft - 8}px`,
            width: `${targetPosition.width + 16}px`,
            height: `${targetPosition.height + 16}px`,
            boxShadow: '0 0 0 4px rgba(255, 193, 7, 0.8), 0 0 0 8px rgba(255, 193, 7, 0.4), 0 0 20px 12px rgba(255, 193, 7, 0.3)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Tutorial card */}
      <div
        className="fixed z-[10000] bg-white rounded-xl md:rounded-2xl shadow-2xl transition-all duration-300 animate-slideIn flex flex-col"
        style={cardPosition}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-3 sm:p-4 md:p-5 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {step.icon && (
                <div className="bg-yellow-100 p-1.5 rounded-lg flex-shrink-0">
                  <step.icon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">{step.title}</h3>
                <p className="text-xs text-gray-500">
                  Step {currentStep + 1} of {steps.length}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-3 sm:p-4 md:p-5 overflow-y-auto flex-1 min-h-0">
          <p className="text-gray-700 leading-relaxed mb-3 text-sm sm:text-base">{step.description}</p>
          
          {step.tips && step.tips.length > 0 && (
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg md:rounded-xl p-2.5 sm:p-3 md:p-4 mb-3">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                <p className="text-xs sm:text-sm font-bold text-yellow-900">Pro Tips:</p>
              </div>
              <ul className="text-xs sm:text-sm text-yellow-800 space-y-1 sm:space-y-1.5">
                {step.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-1.5 sm:gap-2">
                    <span className="text-yellow-600 mt-0.5 font-bold flex-shrink-0">•</span>
                    <span className="flex-1">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer - Navigation */}
        <div className="border-t border-gray-200 p-3 sm:p-4 md:p-5 flex-shrink-0 bg-gray-50">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-3">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-yellow-600'
                    : index < currentStep
                    ? 'w-2 bg-yellow-400'
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm ${
                isFirstStep
                  ? 'text-gray-400 cursor-not-allowed opacity-50'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <div className="flex gap-1.5 sm:gap-2">
              <button
                onClick={handleSkip}
                className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors hover:bg-gray-200 rounded-lg text-xs sm:text-sm"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg font-semibold transition-all hover:shadow-lg transform hover:scale-105 text-xs sm:text-sm"
              >
                {isLastStep ? (
                  <>
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(255, 193, 7, 0.8), 0 0 0 8px rgba(255, 193, 7, 0.4), 0 0 20px 12px rgba(255, 193, 7, 0.3);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(255, 193, 7, 1), 0 0 0 12px rgba(255, 193, 7, 0.6), 0 0 30px 16px rgba(255, 193, 7, 0.5);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
