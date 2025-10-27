import { useState, useEffect, useRef } from 'react';

export function useQuizTimer(timeLimit, isPaused, onTimeUp) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const timerRef = useRef(null);

  useEffect(() => {
    setTimeLeft(timeLimit);
  }, [timeLimit]);

  useEffect(() => {
    if (timeLeft > 0 && !isPaused) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isPaused) {
      if (onTimeUp) onTimeUp();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, isPaused, onTimeUp]);

  const resetTimer = (newTime = timeLimit) => {
    setTimeLeft(newTime);
  };

  return { timeLeft, resetTimer };
}