/**
 * Adaptive Quiz Manager - Option 1: Reorder All Questions
 * Loads ALL questions upfront and adaptively reorders them based on performance
 * Student always sees: "Question 1 of 11" → "Question 11 of 11"
 */

import { ADAPTIVE_CONFIG } from './adaptiveDifficultyEngine';

/**
 * Checks if it's time to perform an adaptive check
 * @param {number} questionsAnswered - Number of questions answered
 * @returns {boolean} True if it's time to check
 */
export const shouldPerformAdaptiveCheck = (questionsAnswered) => {
  return questionsAnswered > 0 &&
         questionsAnswered % ADAPTIVE_CONFIG.CHECK_INTERVAL === 0;
};

/**
 * 🔥 OPTION 1: Initialize adaptive queue with ALL questions
 * Returns questions in optimal starting order (medium → easy → hard by default)
 * 🔧 FIXED: Better handling of edge cases
 * @param {Array} rawQuestions - All questions from quiz
 * @returns {Object} { orderedQuestions, questionPools, startingDifficulty }
 */
export const initializeAdaptiveQueue = (rawQuestions) => {
  // 🔧 EDGE CASE FIX: Validate input
  if (!rawQuestions || !Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    return {
      orderedQuestions: [],
      questionPools: { easy: [], medium: [], hard: [] },
      startingDifficulty: 'medium',
      error: 'No questions available'
    };
  }

  // Split into difficulty pools with validation
  const pools = {
    easy: [],
    medium: [],
    hard: []
  };

  rawQuestions.forEach(q => {
    if (!q) {
      return;
    }

    const difficulty = (q.difficulty || 'medium').toLowerCase().trim();
    
    if (pools[difficulty]) {
      pools[difficulty].push(q);
    } else {
      pools.medium.push(q);
    }
  });

  // 🔧 EDGE CASE FIX: All questions same difficulty
  const nonEmptyPools = Object.entries(pools).filter(([_, questions]) => questions.length > 0);
  
  if (nonEmptyPools.length === 1) {
    const [singleDifficulty, questions] = nonEmptyPools[0];
    
    return {
      orderedQuestions: questions,
      questionPools: pools,
      startingDifficulty: singleDifficulty,
      warning: `All questions are ${singleDifficulty} difficulty`,
      limitedAdaptive: true
    };
  }

  // Determine starting difficulty based on available questions
  let startingDifficulty = 'medium';
  if (pools.medium.length > 0) {
    startingDifficulty = 'medium';
  } else if (pools.easy.length > 0) {
    startingDifficulty = 'easy';
  } else if (pools.hard.length > 0) {
    startingDifficulty = 'hard';
  }

  // 🔥 Order ALL questions: medium first, then easy, then hard
  // This creates a sensible default progression
  const orderedQuestions = [
    ...pools.medium,
    ...pools.easy,
    ...pools.hard
  ];

  // 🔧 EDGE CASE FIX: Ensure we have at least some questions
  if (orderedQuestions.length === 0) {
    console.error('No valid questions found for adaptive mode');
    return {
      orderedQuestions: rawQuestions, // Fallback to raw questions
      questionPools: pools,
      startingDifficulty: 'medium',
      error: 'Could not categorize questions by difficulty'
    };
  }

  return {
    orderedQuestions,
    questionPools: pools,
    startingDifficulty,
    distribution: {
      easy: pools.easy.length,
      medium: pools.medium.length,
      hard: pools.hard.length
    }
  };
};

/**
 * 🔥 OPTION 1: Reorder remaining questions based on performance
 * Determines which question should come NEXT based on current difficulty
 * @param {Array} remainingQuestions - Questions not yet answered
 * @param {string} targetDifficulty - Desired difficulty for next question
 * @returns {Array} Reordered questions array
 */
export const reorderRemainingQuestions = (remainingQuestions, targetDifficulty) => {
  // 🔧 EDGE CASE FIX: Validate input
  if (!remainingQuestions || !Array.isArray(remainingQuestions) || remainingQuestions.length === 0) {
    return [];
  }

  // Separate remaining questions by difficulty
  const remaining = {
    easy: [],
    medium: [],
    hard: []
  };

  remainingQuestions.forEach(q => {
    // Skip invalid questions
    if (!q || !q.question) {
      return;
    }

    const diff = (q.difficulty || 'medium').toLowerCase();
    if (remaining[diff]) {
      remaining[diff].push(q);
    } else {
      remaining.medium.push(q);
    }
  });

  // 🔥 Prioritize target difficulty, then fallback
  const fallbackOrder = {
    easy: ['easy', 'medium', 'hard'],
    medium: ['medium', 'easy', 'hard'],
    hard: ['hard', 'medium', 'easy']
  };

  const priority = fallbackOrder[targetDifficulty] || ['medium', 'easy', 'hard'];

  const reordered = [];
  priority.forEach(diff => {
    if (remaining[diff].length > 0) {
      reordered.push(...remaining[diff]);
    }
  });

  return reordered;
};

/**
 * Determines new difficulty based on accuracy
 * 🔧 FIXED: Better handling of 50/50 patterns and edge cases
 * @param {number} accuracy - Accuracy percentage (0-100)
 * @param {string} currentDifficulty - Current difficulty level
 * @param {Array} recentAnswers - Recent answer history for pattern detection
 * @returns {Object} { newDifficulty, action, messageKey }
 */
export const determineDifficultyAdjustment = (accuracy, currentDifficulty, recentAnswers = []) => {
  // 🔧 EDGE CASE FIX: Validate inputs
  if (typeof accuracy !== 'number' || isNaN(accuracy)) {
    return {
      newDifficulty: currentDifficulty,
      action: 'MAINTAIN',
      messageKey: null,
      reason: 'Invalid accuracy data'
    };
  }

  if (!['easy', 'medium', 'hard'].includes(currentDifficulty)) {
    currentDifficulty = 'medium'; // Fallback
  }

  let newDifficulty = currentDifficulty;
  let action = 'MAINTAIN';
  let messageKey = null;

  // 🔧 EDGE CASE FIX: Detect alternating pattern (random guessing)
  if (recentAnswers.length >= 4) {
    let alternations = 0;
    for (let i = 1; i < recentAnswers.length; i++) {
      if (recentAnswers[i].isCorrect !== recentAnswers[i - 1].isCorrect) {
        alternations++;
      }
    }
    const alternationRate = alternations / (recentAnswers.length - 1);
    
    // If user alternates >70% and accuracy is around 50%, likely guessing
    if (alternationRate > 0.7 && accuracy >= 40 && accuracy <= 60) {
      return {
        newDifficulty: currentDifficulty,
        action: 'MAINTAIN',
        messageKey: null,
        reason: 'Inconsistent pattern detected'
      };
    }
  }

  // 🔥 Empathetic thresholds
  if (accuracy === 100) {
    // Perfect score - level up!
    if (currentDifficulty === 'easy') {
      newDifficulty = 'medium';
      action = 'LEVEL_UP';
      messageKey = 'easy_to_medium';
    } else if (currentDifficulty === 'medium') {
      newDifficulty = 'hard';
      action = 'LEVEL_UP';
      messageKey = 'medium_to_hard';
    } else {
      // Already at hard, stay there
      action = 'MAINTAIN';
      messageKey = 'staying_hard';
    }
  } else if (accuracy === 0) {
    // Both wrong - level down
    if (currentDifficulty === 'hard') {
      newDifficulty = 'medium';
      action = 'LEVEL_DOWN';
      messageKey = 'hard_to_medium';
    } else if (currentDifficulty === 'medium') {
      newDifficulty = 'easy';
      action = 'LEVEL_DOWN';
      messageKey = 'medium_to_easy';
    } else {
      // Already at easy, stay there
      action = 'MAINTAIN';
      messageKey = 'staying_easy';
    }
  } else {
    // 50% (1/2) - Mixed results, MAINTAIN current level
    // Show encouraging message to keep engagement
    action = 'MAINTAIN';
    messageKey = 'maintain_steady'; // Add encouraging message for mixed results
  }

  return { newDifficulty, action, messageKey };
};

/**
 * 🔥 OPTION 1: Main adaptive check function - handles difficulty adjustment and reordering
 * @param {Object} params - All parameters
 * @returns {Object} Result with reordered questions, new difficulty, feedback
 */
export const performAdaptiveCheck = ({
  questionsAnswered,
  allQuestions,
  answersHistory,
  currentDifficulty
}) => {
  const result = {
    shouldReorder: false,
    reorderedQuestions: allQuestions,
    newDifficulty: currentDifficulty,
    action: 'MAINTAIN',
    messageKey: null
  };

  // 🔥 ADAPTIVE CHECK: Should we adjust difficulty?
  if (shouldPerformAdaptiveCheck(questionsAnswered)) {
    // Calculate accuracy from recent answers
    const recentAnswers = answersHistory.slice(-2);
    const correctCount = recentAnswers.filter(a => a.isCorrect).length;
    const accuracy = (correctCount / recentAnswers.length) * 100;

    // Determine difficulty adjustment
    const adjustment = determineDifficultyAdjustment(accuracy, currentDifficulty);
    result.newDifficulty = adjustment.newDifficulty;
    result.action = adjustment.action;
    result.messageKey = adjustment.messageKey;

    // 🔥 REORDER remaining questions if difficulty changed
    if (adjustment.newDifficulty !== currentDifficulty) {
      result.shouldReorder = true;

      // Split questions into answered and remaining
      const answeredQuestions = allQuestions.slice(0, questionsAnswered);
      const remainingQuestions = allQuestions.slice(questionsAnswered);

      // Reorder remaining questions based on new difficulty
      const reordered = reorderRemainingQuestions(remainingQuestions, adjustment.newDifficulty);

      // Reconstruct full questions array: answered + reordered remaining
      result.reorderedQuestions = [...answeredQuestions, ...reordered];
    }
  }

  return result;
};
