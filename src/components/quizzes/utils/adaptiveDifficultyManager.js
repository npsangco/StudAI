/**
 * 🎯 ADAPTIVE DIFFICULTY MANAGER
 * Handles dynamic difficulty adjustment for SOLO mode quizzes
 * Based on user performance during the quiz session
 * 
 * RULES:
 * - 3 correct in a row → Move to harder questions
 * - 2 incorrect in a row → Move to easier questions
 * - Questions sorted: Easy → Medium → Hard
 * - Points: Easy=1, Medium=2, Hard=3
 */

/**
 * Sort questions by difficulty for progressive gameplay
 * Easy → Medium → Hard
 * 
 * @param {Array} questions - Array of question objects
 * @returns {Array} - Sorted questions with difficulty tags
 */
export const sortQuestionsByDifficulty = (questions) => {
  const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
  
  return [...questions].sort((a, b) => {
    const diffA = difficultyOrder[a.difficulty?.toLowerCase()] || difficultyOrder.medium;
    const diffB = difficultyOrder[b.difficulty?.toLowerCase()] || difficultyOrder.medium;
    return diffA - diffB;
  });
};

/**
 * 🎮 ADAPTIVE DIFFICULTY ENGINE
 * Calculates next recommended difficulty based on recent performance
 * 
 * @param {Array} recentAnswers - Last 3-5 answers (boolean array)
 * @param {string} currentDifficulty - Current difficulty level
 * @returns {string} - Recommended next difficulty
 */
export const getNextRecommendedDifficulty = (recentAnswers, currentDifficulty = 'medium') => {
  if (!recentAnswers || recentAnswers.length < 2) {
    return currentDifficulty; // Not enough data
  }
  
  // Check last 3 answers
  const last3 = recentAnswers.slice(-3);
  const last2 = recentAnswers.slice(-2);
  
  // 3 correct in a row → Level up
  if (last3.length === 3 && last3.every(a => a === true)) {
    if (currentDifficulty === 'easy') return 'medium';
    if (currentDifficulty === 'medium') return 'hard';
    return 'hard'; // Already at max
  }
  
  // 2 incorrect in a row → Level down
  if (last2.every(a => a === false)) {
    if (currentDifficulty === 'hard') return 'medium';
    if (currentDifficulty === 'medium') return 'easy';
    return 'easy'; // Already at min
  }
  
  // Otherwise, maintain current level
  return currentDifficulty;
};

/**
 * Calculate points based on difficulty (ADAPTIVE SCORING)
 * 
 * @param {string} difficulty - Question difficulty ('easy', 'medium', 'hard')
 * @returns {number} - Points for correct answer
 */
export const getPointsForDifficulty = (difficulty) => {
  const pointsMap = {
    easy: 1,
    medium: 2,
    hard: 3
  };
  
  const normalizedDifficulty = difficulty?.toLowerCase() || 'medium';
  return pointsMap[normalizedDifficulty] || pointsMap.medium;
};

/**
 * Get difficulty display info (stars, colors, labels)
 * 
 * @param {string} difficulty - Question difficulty
 * @returns {Object} - Display information
 */
export const getDifficultyDisplay = (difficulty) => {
  const normalizedDifficulty = difficulty?.toLowerCase() || 'medium';
  
  const displays = {
    easy: { 
      stars: '⭐', 
      color: 'green', 
      label: 'Easy', 
      points: 1,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      textColor: 'text-green-700',
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-800'
    },
    medium: { 
      stars: '⭐⭐', 
      color: 'yellow', 
      label: 'Medium', 
      points: 2,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-700',
      badgeBg: 'bg-yellow-100',
      badgeText: 'text-yellow-800'
    },
    hard: { 
      stars: '⭐⭐⭐', 
      color: 'red', 
      label: 'Hard', 
      points: 3,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      textColor: 'text-red-700',
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-800'
    }
  };
  
  return displays[normalizedDifficulty] || displays.medium;
};

/**
 * Calculate difficulty breakdown from answers
 * Shows performance per difficulty level
 * 
 * @param {Array} questions - All questions
 * @param {Array} answers - User's answers with isCorrect field
 * @returns {Object} - Breakdown by difficulty
 */
export const calculateDifficultyBreakdown = (questions, answers) => {
  const breakdown = {
    easy: { correct: 0, total: 0, points: 0 },
    medium: { correct: 0, total: 0, points: 0 },
    hard: { correct: 0, total: 0, points: 0 }
  };
  
  questions.forEach((question, index) => {
    const difficulty = question.difficulty?.toLowerCase() || 'medium';
    const answer = answers[index];
    
    breakdown[difficulty].total++;
    
    if (answer?.isCorrect) {
      breakdown[difficulty].correct++;
      breakdown[difficulty].points += getPointsForDifficulty(difficulty);
    }
  });
  
  return breakdown;
};

/**
 * Calculate total score with difficulty multipliers
 * 
 * @param {Array} questions - All questions
 * @param {Array} answers - User's answers
 * @returns {number} - Total weighted score
 */
export const calculateTotalScore = (questions, answers) => {
  let totalScore = 0;
  
  questions.forEach((question, index) => {
    const answer = answers[index];
    if (answer?.isCorrect) {
      const difficulty = question.difficulty?.toLowerCase() || 'medium';
      totalScore += getPointsForDifficulty(difficulty);
    }
  });
  
  return totalScore;
};

/**
 * Get max possible score for a set of questions
 * 
 * @param {Array} questions - All questions
 * @returns {number} - Maximum possible weighted score
 */
export const getMaxScore = (questions) => {
  return questions.reduce((total, question) => {
    const difficulty = question.difficulty?.toLowerCase() || 'medium';
    return total + getPointsForDifficulty(difficulty);
  }, 0);
};

/**
 * 🎯 Generate difficulty progression feedback
 * Tells user how they progressed through difficulties
 * 
 * @param {Object} breakdown - Difficulty breakdown object
 * @returns {string} - Feedback message
 */
export const getDifficultyProgressionFeedback = (breakdown) => {
  const messages = [];
  
  if (breakdown.hard.correct > 0) {
    messages.push(`💪 Conquered ${breakdown.hard.correct} hard questions!`);
  }
  
  if (breakdown.medium.correct === breakdown.medium.total && breakdown.medium.total > 0) {
    messages.push(`🌟 Perfect on all medium questions!`);
  }
  
  if (breakdown.easy.total === 0 && breakdown.hard.total > 0) {
    messages.push(`🚀 Started strong - jumped straight to harder challenges!`);
  }
  
  return messages.length > 0 ? messages.join(' ') : 'Keep practicing to master all difficulty levels!';
};

/**
 * 🔥 Check if user should get difficulty level-up notification
 * 
 * @param {Array} recentAnswers - Last few answers
 * @returns {boolean} - True if should show level-up notification
 */
export const shouldShowLevelUpNotification = (recentAnswers) => {
  if (!recentAnswers || recentAnswers.length < 3) return false;
  
  const last3 = recentAnswers.slice(-3);
  return last3.every(a => a === true);
};

/**
 * 📊 Calculate overall difficulty performance rating
 * 
 * @param {Object} breakdown - Difficulty breakdown
 * @returns {string} - Performance rating
 */
export const getOverallDifficultyRating = (breakdown) => {
  const hardAccuracy = breakdown.hard.total > 0 
    ? (breakdown.hard.correct / breakdown.hard.total) * 100 
    : 0;
  
  const mediumAccuracy = breakdown.medium.total > 0 
    ? (breakdown.medium.correct / breakdown.medium.total) * 100 
    : 0;
  
  const easyAccuracy = breakdown.easy.total > 0 
    ? (breakdown.easy.correct / breakdown.easy.total) * 100 
    : 0;
  
  if (hardAccuracy >= 70 && breakdown.hard.total >= 3) {
    return 'Expert Level 🏆';
  } else if (mediumAccuracy >= 80 && breakdown.medium.total >= 3) {
    return 'Advanced 🌟';
  } else if (easyAccuracy >= 90) {
    return 'Building Foundation 📚';
  } else {
    return 'Keep Practicing 💪';
  }
};
