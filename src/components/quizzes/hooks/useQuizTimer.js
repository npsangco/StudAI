import { useState, useEffect, useRef } from 'react';

export function useQuizTimer(timeLimit, isPaused, onTimeUp) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const timerRef = useRef(null);

  useEffect(() => {
    setTimeLeft(timeLimit);
  }, [timeLimit]);

  useEffect(() => {
    // Skip timer setup entirely for No Limit mode (timeLimit === 0)
    // This prevents unnecessary effect re-runs and memory overhead
    if (timeLimit === 0) {
      return;
    }

    // Skip if paused
    if (isPaused) {
      return;
    }

    // Run timer countdown
    if (timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (onTimeUp) onTimeUp();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, isPaused, timeLimit, onTimeUp]);

  const resetTimer = (newTime = timeLimit) => {
    setTimeLeft(newTime);
  };

  return { timeLeft, resetTimer };
}