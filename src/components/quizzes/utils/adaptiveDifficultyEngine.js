/**
 * Adaptive Difficulty Engine
 * Dynamically adjusts quiz difficulty based on real-time performance
 * Only active for quizzes with 5+ questions in solo mode
 */

// Configuration
export const ADAPTIVE_CONFIG = {
  MIN_QUESTIONS_FOR_ADAPTIVE: 5,  // Minimum questions to enable adaptive mode
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
  ]
};

/**
 * Checks if adaptive mode should be enabled for a quiz
 */
export const canUseAdaptiveMode = (questions) => {
  if (!questions || questions.length < ADAPTIVE_CONFIG.MIN_QUESTIONS_FOR_ADAPTIVE) {
    return { enabled: false, reason: 'Not enough questions (minimum 5)' };
  }

  // Check if quiz has questions from at least 2 difficulty levels
  const difficulties = new Set(questions.map(q => q.difficulty?.toLowerCase() || 'medium'));
  if (difficulties.size < 2) {
    return { enabled: false, reason: 'Quiz must have at least 2 different difficulty levels' };
  }

  return { enabled: true };
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
 */
export const calculateRunningAccuracy = (answersHistory, lookbackCount = ADAPTIVE_CONFIG.CHECK_INTERVAL) => {
  if (!answersHistory || answersHistory.length === 0) return 0;

  const recentAnswers = answersHistory.slice(-lookbackCount);
  const correctCount = recentAnswers.filter(a => a.isCorrect).length;

  return (correctCount / recentAnswers.length) * 100;
};

/**
 * Determines if difficulty should change based on accuracy
 */
export const determineDifficultyAdjustment = (accuracy, currentDifficulty) => {
  const { LEVEL_UP, LEVEL_DOWN } = ADAPTIVE_CONFIG.ACCURACY_THRESHOLDS;

  // High performance - level up
  if (accuracy >= LEVEL_UP) {
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
  if (accuracy < LEVEL_DOWN) {
    if (currentDifficulty === 'hard') {
      return {
        newDifficulty: 'medium',
        action: 'LEVEL_DOWN',
        messageKey: 'hard_to_medium'
      };
    }
    if (currentDifficulty === 'medium') {
      return {
        newDifficulty: 'easy',
        action: 'LEVEL_DOWN',
        messageKey: 'medium_to_easy'
      };
    }
    if (currentDifficulty === 'easy') {
      return {
        newDifficulty: 'easy',
        action: 'MAINTAIN',
        messageKey: 'staying_easy'
      };
    }
  }

  // Middle ground - maintain
  return {
    newDifficulty: currentDifficulty,
    action: 'MAINTAIN',
    messageKey: null
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
  } else {
    // Maintain messages
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
 */
export const buildAdaptiveJourney = (difficultyHistory, answersHistory) => {
  const changes = difficultyHistory
    .filter(h => h.action !== 'INITIAL')
    .map(h => ({
      afterQuestion: h.afterQuestion,
      fromDifficulty: h.fromDifficulty,
      toDifficulty: h.toDifficulty,
      accuracy: Math.round(h.accuracy),
      action: h.action
    }));

  // Determine peak and final difficulty
  const difficultyRank = { easy: 1, medium: 2, hard: 3 };
  const allDifficulties = difficultyHistory.map(h => h.toDifficulty || h.difficulty);
  const peakDifficulty = allDifficulties.reduce((peak, current) => {
    return difficultyRank[current] > difficultyRank[peak] ? current : peak;
  }, 'easy');

  const finalDifficulty = allDifficulties[allDifficulties.length - 1];

  return {
    changes,
    finalDifficulty,
    peakDifficulty,
    totalAdjustments: changes.length
  };
};

/**
 * Checks if it's time to perform an adaptive check
 */
export const shouldPerformAdaptiveCheck = (questionsAnswered) => {
  return questionsAnswered > 0 &&
         questionsAnswered % ADAPTIVE_CONFIG.CHECK_INTERVAL === 0;
};
