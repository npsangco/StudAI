import { useState, useEffect } from 'react';

export function useTutorial(pageName = 'dashboard') {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);

        // Check if tutorial has been completed for this specific page
        const tutorialCompleted = localStorage.getItem(`tutorial_completed_${user.id}_${pageName}`);
        
        // Check if user is new (created within last 7 days or has never seen tutorial)
        const isNewUser = checkIfNewUser(user);
        
        // Show tutorial if not completed and user is new, or if tutorial was never shown for this page
        if (!tutorialCompleted && (isNewUser || !localStorage.getItem(`tutorial_shown_${user.id}_${pageName}`))) {
          // Mark that tutorial has been shown for this page
          localStorage.setItem(`tutorial_shown_${user.id}_${pageName}`, 'true');
          
          // Delay showing tutorial slightly so page can load
          setTimeout(() => {
            setShowTutorial(true);
          }, 1000);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, [pageName]);

  const checkIfNewUser = (user) => {
    if (!user.created_at && !user.createdAt) {
      // If no creation date, assume it's an existing user
      return false;
    }

    const createdAt = new Date(user.created_at || user.createdAt);
    const now = new Date();
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

    // Consider user "new" if account is less than 7 days (168 hours) old
    return hoursSinceCreation < 168;
  };

  const completeTutorial = () => {
    if (currentUser) {
      localStorage.setItem(`tutorial_completed_${currentUser.id}_${pageName}`, 'true');
    }
    setShowTutorial(false);
  };

  const skipTutorial = () => {
    if (currentUser) {
      localStorage.setItem(`tutorial_completed_${currentUser.id}_${pageName}`, 'skipped');
    }
    setShowTutorial(false);
  };

  const resetTutorial = () => {
    if (currentUser) {
      localStorage.removeItem(`tutorial_completed_${currentUser.id}_${pageName}`);
      localStorage.removeItem(`tutorial_shown_${currentUser.id}_${pageName}`);
      setShowTutorial(true);
    }
  };

  const resetAllTutorials = () => {
    if (currentUser) {
      const pages = ['dashboard', 'notes', 'quizzes', 'planner', 'sessions', 'profile'];
      pages.forEach(page => {
        localStorage.removeItem(`tutorial_completed_${currentUser.id}_${page}`);
        localStorage.removeItem(`tutorial_shown_${currentUser.id}_${page}`);
      });
    }
  };

  return {
    showTutorial,
    completeTutorial,
    skipTutorial,
    resetTutorial,
    resetAllTutorials,
  };
}
