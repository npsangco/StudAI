import { useState, useEffect, useRef } from 'react';

export function useCountdown(initialSeconds, onComplete) {
  const [countdown, setCountdown] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef(null);

  const start = () => {
    setCountdown(initialSeconds);
    setIsActive(true);
  };

  const stop = () => {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const reset = () => {
    stop();
    setCountdown(initialSeconds);
  };

  useEffect(() => {
    if (!isActive) return;

    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsActive(false);
          if (onComplete) onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, onComplete]);

  return { countdown, start, stop, reset, isActive };
}