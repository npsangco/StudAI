/**
 * Adaptive Difficulty Engine
 * Dynamically adjusts quiz difficulty based on real-time performance
 * Only active for quizzes with 2+ difficulty levels in solo mode
 */

// Configuration
export const ADAPTIVE_CONFIG = {
  MIN_QUESTIONS_FOR_ADAPTIVE: 2,  // Minimum questions to enable adaptive mode (just need 2 for the check interval)
  CHECK_INTERVAL: 2,               // Check accuracy every N questions
  ACCURACY_THRESHOLDS: {
    PERFECT: 100,    // 100% (2/2 correct) = Perfect! Level up
    STRUGGLING: 0    // 0% (0/2 correct) = Struggling, level down
    // 50% (1/2 correct) = Learning... Stay at current level!
    // This empathetic approach gives learners time to adapt
  }
};

// Feedback messages for difficulty changes
export const LEVEL_UP_MESSAGES = {
  easy_to_medium: [
    "🔥 You're crushing it! Moving to Medium difficulty!",
    "🚀 Nice work! Let's step it up a notch!",
    "⭐ Impressive! Ready for a bigger challenge?"
  ],
  medium_to_hard: [
    "🔥 On fire! Time for Hard mode!",
    "💪 Beast mode activated! Hard questions incoming!",
    "🏆 You're a natural! Let's see what you're made of!"
  ],
  staying_hard: [
    "👑 Maintaining excellence! Keep it up!",
    "🔥 Peak performance! You're unstoppable!",
    "⚡ Maximum difficulty conquered!"
  ]
};

export const LEVEL_DOWN_MESSAGES = {
  hard_to_medium: [
    "👍 Let's review some fundamentals!",
    "📚 Building a stronger foundation!",
    "🎯 Adjusting for better learning!"
  ],
  medium_to_easy: [
    "💡 Back to basics - you've got this!",
    "🌱 Let's master the fundamentals first!",
    "✨ Taking it step by step!"
  ],
  staying_easy: [
    "🌟 Practice makes perfect!",
    "💪 Keep learning at your pace!",
    "📖 Mastering the basics!"
  ]
};

export const MAINTAIN_MESSAGES = {
  easy: [
    "👌 Solid progress! Keep going!",
    "📈 You're getting the hang of it!"
  ],
  medium: [
    "💯 Right on track! Doing great!",
    "🎯 Perfect balance! Keep it up!"
  ],
  hard: [
    "🔥 Handling the challenge well!",
    "⚔️ Conquering the hard ones!"
  ],
  maintain_steady: [
    "You're doing great! Keep going!",
    "Nice effort! Stay focused!",
    "Good progress! You've got this!",
    "Keep it up! You're learning!",
    "Steady wins the race!",
    "Stay consistent! You're improving!",
    "One step at a time! Great job!",
    "You're on the right track!"
  ]
};

/**
 * Checks if adaptive mode should be enabled for a quiz
 * 🔧 FIXED: Better handling of edge cases
 */
export const canUseAdaptiveMode = (questions) => {
  // Edge case: No questions
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return { enabled: false, reason: 'No questions available' };
  }

  // Edge case: Not enough questions
  if (questions.length < ADAPTIVE_CONFIG.MIN_QUESTIONS_FOR_ADAPTIVE) {
    return { 
      enabled: false, 
      reason: `Not enough questions (minimum ${ADAPTIVE_CONFIG.MIN_QUESTIONS_FOR_ADAPTIVE}, found ${questions.length})` 
    };
  }

  // Check if quiz has questions from at least 2 difficulty levels
  const difficulties = new Set(
    questions
      .map(q => (q.difficulty?.toLowerCase() || 'medium').trim())
      .filter(d => ['easy', 'medium', 'hard'].includes(d)) // Only valid difficulties
  );

  // 🔧 EDGE CASE FIX: All questions same difficulty
  if (difficulties.size < 2) {
    const singleDifficulty = Array.from(difficulties)[0] || 'medium';
    return { 
      enabled: false, 
      reason: `All questions are ${singleDifficulty} difficulty. Need at least 2 difficulty levels.`,
      fallbackMode: 'classic',
      singleDifficulty
    };
  }

  // 🔧 EDGE CASE FIX: Check if difficulty distribution is reasonable
  const pools = splitQuestionsByDifficulty(questions);
  const minQuestionsPerLevel = 2;
  const hasEnoughVariety = Object.values(pools).filter(pool => pool.length >= minQuestionsPerLevel).length >= 2;

  return { 
    enabled: true,
    distribution: {
      easy: pools.easy.length,
      medium: pools.medium.length,
      hard: pools.hard.length
    }
  };
};

/**
 * Splits questions into difficulty pools
 */
export const splitQuestionsByDifficulty = (questions) => {
  const pools = {
    easy: [],
    medium: [],
    hard: []
  };

  questions.forEach(question => {
    const difficulty = question.difficulty?.toLowerCase() || 'medium';
    if (pools[difficulty]) {
      pools[difficulty].push(question);
    } else {
      pools.medium.push(question); // Default to medium if invalid
    }
  });

  return pools;
};

/**
 * Initializes adaptive mode with question pools
 */
export const initializeAdaptiveMode = (questions) => {
  const pools = splitQuestionsByDifficulty(questions);

  // Start with medium difficulty
  const startingDifficulty = 'medium';
  const checkInterval = ADAPTIVE_CONFIG.CHECK_INTERVAL;

  // Get initial questions from medium pool (or fallback)
  const initialQuestions = getQuestionsFromPool(pools, startingDifficulty, checkInterval);

  return {
    pools,
    currentDifficulty: startingDifficulty,
    questionQueue: initialQuestions,
    answeredQuestions: [],
    difficultyHistory: [{
      afterQuestion: 0,
      difficulty: startingDifficulty,
      action: 'INITIAL'
    }],
    totalQuestionsPlanned: questions.length
  };
};

/**
 * Gets questions from a specific difficulty pool with fallback logic
 */
export const getQuestionsFromPool = (pools, targetDifficulty, count) => {
  const selected = [];

  // Fallback order based on target difficulty
  const fallbackOrder = {
    easy: ['easy', 'medium', 'hard'],
    medium: ['medium', 'easy', 'hard'],
    hard: ['hard', 'medium', 'easy']
  };

  const priorityOrder = fallbackOrder[targetDifficulty] || ['medium', 'easy', 'hard'];

  for (let difficulty of priorityOrder) {
    const available = pools[difficulty].filter(q => !q._used);
    const needed = count - selected.length;

    if (available.length > 0 && needed > 0) {
      const take = Math.min(available.length, needed);
      const questions = available.slice(0, take);

      // Mark as used
      questions.forEach(q => q._used = true);
      selected.push(...questions);

      if (selected.length >= count) break;
    }
  }

  return selected;
};

/**
 * Calculates running accuracy from recent answers
 * 🔧 FIXED: Better handling of edge cases and inconsistent patterns
 */
export const calculateRunningAccuracy = (answersHistory, lookbackCount = ADAPTIVE_CONFIG.CHECK_INTERVAL) => {
  // 🔧 EDGE CASE FIX: No answers yet
  if (!answersHistory || !Array.isArray(answersHistory) || answersHistory.length === 0) {
    return null; // Return null instead of 0 to indicate "no data"
  }

  const recentAnswers = answersHistory.slice(-lookbackCount);
  
  // 🔧 EDGE CASE FIX: Empty slice
  if (recentAnswers.length === 0) {
    return null;
  }

  // Filter out invalid answers (just in case)
  const validAnswers = recentAnswers.filter(a => a && typeof a.isCorrect === 'boolean');
  
  if (validAnswers.length === 0) {
    return null;
  }

  const correctCount = validAnswers.filter(a => a.isCorrect).length;
  const accuracy = (correctCount / validAnswers.length) * 100;

  // 🔧 EDGE CASE FIX: 50/50 pattern detection (random guessing)
  // If user has alternating pattern, add confidence score
  if (validAnswers.length >= 4) {
    let alternations = 0;
    for (let i = 1; i < validAnswers.length; i++) {
      if (validAnswers[i].isCorrect !== validAnswers[i - 1].isCorrect) {
        alternations++;
      }
    }
    const alternationRate = alternations / (validAnswers.length - 1);
    
    // If user alternates >70%, they might be guessing randomly
    if (alternationRate > 0.7 && accuracy >= 40 && accuracy <= 60) {
      // Don't change difficulty if suspected random guessing
      return { accuracy, confidence: 'low', pattern: 'alternating' };
    }
  }

  return { accuracy, confidence: 'normal', pattern: 'consistent' };
};

/**
 * Determines if difficulty should change based on accuracy
 * 🔧 FIXED: Handle null accuracy and low-confidence patterns
 */
export const determineDifficultyAdjustment = (accuracyData, currentDifficulty) => {
  // 🔧 EDGE CASE FIX: No accuracy data available
  if (accuracyData === null || accuracyData === undefined) {
    return {
      newDifficulty: currentDifficulty,
      action: 'MAINTAIN',
      messageKey: null,
      reason: 'Insufficient data'
    };
  }

  // Handle both old format (number) and new format (object with confidence)
  const accuracy = typeof accuracyData === 'object' ? accuracyData.accuracy : accuracyData;
  const confidence = typeof accuracyData === 'object' ? accuracyData.confidence : 'normal';
  const pattern = typeof accuracyData === 'object' ? accuracyData.pattern : 'consistent';

  // 🔧 EDGE CASE FIX: Low confidence (random guessing) - maintain difficulty
  if (confidence === 'low' && pattern === 'alternating') {
    return {
      newDifficulty: currentDifficulty,
      action: 'MAINTAIN',
      messageKey: null,
      reason: 'Pattern inconsistent (possible guessing)'
    };
  }

  const { PERFECT, STRUGGLING } = ADAPTIVE_CONFIG.ACCURACY_THRESHOLDS;

  // High performance - level up
  if (accuracy >= PERFECT) {
    if (currentDifficulty === 'easy') {
      return {
        newDifficulty: 'medium',
        action: 'LEVEL_UP',
        messageKey: 'easy_to_medium'
      };
    }
    if (currentDifficulty === 'medium') {
      return {
        newDifficulty: 'hard',
        action: 'LEVEL_UP',
        messageKey: 'medium_to_hard'
      };
    }
    if (currentDifficulty === 'hard') {
      return {
        newDifficulty: 'hard',
        action: 'MAINTAIN',
        messageKey: 'staying_hard'
      };
    }
  }

  // Struggling - level down
  if (accuracy <= STRUGGLING) {
    if (currentDifficulty === 'hard') {
      return {
        newDifficulty: 'medium',
        action: 'LEVEL_DOWN',
        messageKey: 'hard_to_medium',
        reason: 'Low accuracy'
      };
    }
    if (currentDifficulty === 'medium') {
      return {
        newDifficulty: 'easy',
        action: 'LEVEL_DOWN',
        messageKey: 'medium_to_easy',
        reason: 'Low accuracy'
      };
    }
    if (currentDifficulty === 'easy') {
      return {
        newDifficulty: 'easy',
        action: 'MAINTAIN',
        messageKey: 'staying_easy',
        reason: 'Already at easiest level'
      };
    }
  }

  // Middle ground (50%) - maintain (learning phase)
  return {
    newDifficulty: currentDifficulty,
    action: 'MAINTAIN',
    messageKey: null,
    reason: 'Balanced performance'
  };
};

/**
 * Gets a random message for difficulty change
 */
export const getAdaptiveMessage = (messageKey) => {
  if (!messageKey) return null;

  let messages = [];

  if (LEVEL_UP_MESSAGES[messageKey]) {
    messages = LEVEL_UP_MESSAGES[messageKey];
  } else if (LEVEL_DOWN_MESSAGES[messageKey]) {
    messages = LEVEL_DOWN_MESSAGES[messageKey];
  } else if (messageKey.startsWith('staying_')) {
    const difficulty = messageKey.replace('staying_', '');
    messages = MAINTAIN_MESSAGES[difficulty] || [];
  } else if (MAINTAIN_MESSAGES[messageKey]) {
    // Handle maintain_steady and other maintain messages
    messages = MAINTAIN_MESSAGES[messageKey];
  } else {
    // Fallback to maintain messages by difficulty
    messages = MAINTAIN_MESSAGES[messageKey] || [];
  }

  return messages.length > 0
    ? messages[Math.floor(Math.random() * messages.length)]
    : null;
};

/**
 * Performs adaptive check and returns next questions
 */
export const performAdaptiveCheck = (adaptiveState, answersHistory, questionsAnswered) => {
  const { pools, currentDifficulty, difficultyHistory, totalQuestionsPlanned } = adaptiveState;

  // Calculate accuracy from recent answers
  const accuracy = calculateRunningAccuracy(answersHistory);

  // Determine if difficulty should change
  const adjustment = determineDifficultyAdjustment(accuracy, currentDifficulty);

  // Get message if difficulty changed
  const message = adjustment.action !== 'MAINTAIN' || adjustment.messageKey
    ? getAdaptiveMessage(adjustment.messageKey)
    : null;

  // Calculate how many questions remain
  const questionsRemaining = totalQuestionsPlanned - questionsAnswered;
  const nextBatchSize = Math.min(ADAPTIVE_CONFIG.CHECK_INTERVAL, questionsRemaining);

  // Get next questions from the pool
  const nextQuestions = getQuestionsFromPool(pools, adjustment.newDifficulty, nextBatchSize);

  // Update difficulty history
  const newHistory = [
    ...difficultyHistory,
    {
      afterQuestion: questionsAnswered,
      fromDifficulty: currentDifficulty,
      toDifficulty: adjustment.newDifficulty,
      accuracy: accuracy,
      action: adjustment.action
    }
  ];

  return {
    nextQuestions,
    newDifficulty: adjustment.newDifficulty,
    adjustment,
    message,
    accuracy,
    difficultyHistory: newHistory
  };
};

/**
 * Builds adaptive journey summary for quiz results
 * 🔧 FIXED: Comprehensive validation and error handling
 */
export const buildAdaptiveJourney = (difficultyHistory, answersHistory) => {
  // 🔧 EDGE CASE FIX: Validate inputs
  if (!difficultyHistory || !Array.isArray(difficultyHistory)) {
    return {
      changes: [],
      finalDifficulty: 'medium',
      peakDifficulty: 'medium',
      totalAdjustments: 0,
      error: 'Invalid difficulty history',
      corrupted: true
    };
  }

  if (difficultyHistory.length === 0) {
    return {
      changes: [],
      finalDifficulty: 'medium',
      peakDifficulty: 'medium',
      totalAdjustments: 0,
      warning: 'No difficulty changes recorded'
    };
  }

  // Filter and validate changes
  const validChanges = difficultyHistory
    .filter(h => h && h.action !== 'INITIAL')
    .map(h => {
      // Validate each field
      const afterQuestion = typeof h.afterQuestion === 'number' ? h.afterQuestion : 0;
      const fromDifficulty = ['easy', 'medium', 'hard'].includes(h.fromDifficulty) ? h.fromDifficulty : 'medium';
      const toDifficulty = ['easy', 'medium', 'hard'].includes(h.toDifficulty) ? h.toDifficulty : 'medium';
      const accuracy = typeof h.accuracy === 'number' ? Math.round(h.accuracy) : 0;
      const action = h.action || 'MAINTAIN';

      return {
        afterQuestion,
        fromDifficulty,
        toDifficulty,
        accuracy,
        action
      };
    });

  // Determine peak and final difficulty
  const difficultyRank = { easy: 1, medium: 2, hard: 3 };
  
  const allDifficulties = difficultyHistory
    .map(h => h.toDifficulty || h.difficulty)
    .filter(d => d && ['easy', 'medium', 'hard'].includes(d));

  // 🔧 EDGE CASE FIX: Handle empty difficulties array
  if (allDifficulties.length === 0) {
    return {
      changes: validChanges,
      finalDifficulty: 'medium',
      peakDifficulty: 'medium',
      totalAdjustments: validChanges.length,
      warning: 'Could not determine difficulty progression'
    };
  }

  const peakDifficulty = allDifficulties.reduce((peak, current) => {
    return (difficultyRank[current] || 0) > (difficultyRank[peak] || 0) ? current : peak;
  }, 'easy');

  const finalDifficulty = allDifficulties[allDifficulties.length - 1] || 'medium';

  // Calculate additional stats
  const totalCorrect = answersHistory?.filter(a => a?.isCorrect).length || 0;
  const totalQuestions = answersHistory?.length || 0;
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return {
    changes: validChanges,
    finalDifficulty,
    peakDifficulty,
    totalAdjustments: validChanges.length,
    statistics: {
      overallAccuracy,
      totalQuestions,
      correctAnswers: totalCorrect
    },
    validated: true
  };
};

/**
 * Checks if it's time to perform an adaptive check
 */
export const shouldPerformAdaptiveCheck = (questionsAnswered) => {
  return questionsAnswered > 0 &&
         questionsAnswered % ADAPTIVE_CONFIG.CHECK_INTERVAL === 0;
};
