/**
 * Response Sanitizer Middleware
 * Prevents sensitive data from being exposed in API responses
 * Removes correct answers, passwords, tokens, and other sensitive fields
 */

/**
 * List of sensitive field names that should never be sent to clients
 */
const SENSITIVE_FIELDS = [
  'password',
  'password_hash',
  'reset_token',
  'reset_token_expiry',
  'verification_token',
  'correct_answer',
  'correctAnswer',
  'answer', // For fill-in-the-blank questions
  'api_key',
  'secret',
  'private_key',
  'access_token',
  'refresh_token'
];

/**
 * Recursively remove sensitive fields from an object or array
 * @param {*} data - The data to sanitize
 * @param {Array<string>} excludeFields - Additional fields to exclude
 * @returns {*} - Sanitized data
 */
function sanitizeData(data, excludeFields = []) {
  if (!data) return data;

  const fieldsToRemove = [...SENSITIVE_FIELDS, ...excludeFields];

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, excludeFields));
  }

  // Handle objects
  if (typeof data === 'object') {
    const sanitized = {};
    
    for (const key in data) {
      // Skip sensitive fields
      if (fieldsToRemove.includes(key)) {
        continue;
      }

      // Recursively sanitize nested objects/arrays
      const value = data[key];
      if (value && typeof value === 'object') {
        sanitized[key] = sanitizeData(value, excludeFields);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // Return primitives as-is
  return data;
}

/**
 * Remove answers from quiz questions for client consumption
 * Keeps only the question structure needed for display
 * @param {Array} questions - Array of question objects
 * @returns {Array} - Sanitized questions without answers
 */
function sanitizeQuizQuestions(questions) {
  if (!Array.isArray(questions)) return questions;

  return questions.map(question => {
    const sanitized = {
      question_id: question.question_id,
      quiz_id: question.quiz_id,
      type: question.type,
      question: question.question,
      question_order: question.question_order,
      difficulty: question.difficulty || 'medium'
    };

    // Include choices for Multiple Choice (but not the correct answer)
    if (question.type === 'Multiple Choice' && question.choices) {
      sanitized.choices = question.choices;
    }

    // For True/False, include the choices but not the answer
    if (question.type === 'True/False') {
      sanitized.choices = ['True', 'False'];
    }

    // For Matching, include left and right items but not the correct pairs
    if (question.type === 'Matching' && question.matchingPairs) {
      const pairs = question.matchingPairs;
      
      // Extract unique left and right items, shuffle the right items
      const leftItems = pairs.map(p => p.left);
      const rightItems = [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5);
      
      sanitized.leftItems = leftItems;
      sanitized.rightItems = rightItems;
    }

    // For Fill in the blanks, just include the question text (with blanks)
    // Do NOT include the answer field

    return sanitized;
  });
}

/**
 * Express middleware to automatically sanitize response data
 * Wraps res.json to sanitize data before sending
 */
function responseSanitizerMiddleware(options = {}) {
  return function(req, res, next) {
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      try {
        // Check if this is a quiz endpoint that needs special handling
        const isQuizEndpoint = req.path.includes('/quiz') || req.path.includes('/question');
        
        if (isQuizEndpoint && data) {
          // Special handling for quiz questions
          if (data.questions) {
            data.questions = sanitizeQuizQuestions(data.questions);
          }
          
          // Also sanitize any other nested data
          const sanitized = sanitizeData(data, options.excludeFields);
          return originalJson(sanitized);
        }

        // For all other endpoints, do general sanitization
        const sanitized = sanitizeData(data, options.excludeFields);
        return originalJson(sanitized);
      } catch (error) {
        // If sanitization fails, log error and send original data
        console.error('Response sanitization error:', error);
        return originalJson(data);
      }
    };

    next();
  };
}

/**
 * Validate submitted answers on the server side
 * @param {Object} question - The question object with correct answer
 * @param {*} userAnswer - The user's submitted answer
 * @returns {boolean} - Whether the answer is correct
 */
function validateAnswer(question, userAnswer) {
  if (!question || userAnswer === undefined || userAnswer === null) {
    return false;
  }

  const questionType = question.type;

  switch (questionType) {
    case 'Multiple Choice':
      return String(userAnswer).trim().toLowerCase() === 
             String(question.correct_answer).trim().toLowerCase();

    case 'True/False':
      return String(userAnswer).trim().toLowerCase() === 
             String(question.correct_answer).trim().toLowerCase();

    case 'Fill in the blanks':
      // More lenient comparison - trim and lowercase
      return String(userAnswer).trim().toLowerCase() === 
             String(question.answer).trim().toLowerCase();

    case 'Matching':
      // userAnswer should be an array of pairs
      if (!Array.isArray(userAnswer) || !Array.isArray(question.matching_pairs)) {
        return false;
      }

      // Parse matching_pairs if it's a string
      let correctPairs = question.matching_pairs;
      if (typeof correctPairs === 'string') {
        try {
          correctPairs = JSON.parse(correctPairs);
        } catch {
          return false;
        }
      }

      // Check if all pairs match
      if (userAnswer.length !== correctPairs.length) {
        return false;
      }

      return userAnswer.every(userPair => {
        return correctPairs.some(correctPair => 
          String(userPair.left).trim().toLowerCase() === String(correctPair.left).trim().toLowerCase() &&
          String(userPair.right).trim().toLowerCase() === String(correctPair.right).trim().toLowerCase()
        );
      });

    default:
      return false;
  }
}

/**
 * Server-side answer validation endpoint helper
 * Validates an array of submitted answers against questions
 * @param {Array} questions - Array of question objects with correct answers
 * @param {Array} submittedAnswers - Array of user answers
 * @returns {Object} - Validation results with score and details
 */
function validateQuizSubmission(questions, submittedAnswers) {
  if (!Array.isArray(questions) || !Array.isArray(submittedAnswers)) {
    return {
      score: 0,
      total: questions?.length || 0,
      details: [],
      error: 'Invalid submission format'
    };
  }

  let correctCount = 0;
  const details = [];

  questions.forEach((question, index) => {
    const submittedAnswer = submittedAnswers.find(
      ans => ans.question_id === question.question_id
    );

    const userAnswer = submittedAnswer?.answer;
    const isCorrect = validateAnswer(question, userAnswer);

    if (isCorrect) {
      correctCount++;
    }

    details.push({
      question_id: question.question_id,
      isCorrect,
      // Don't send correct answer back to client in validation response
    });
  });

  return {
    score: correctCount,
    total: questions.length,
    details,
    percentage: questions.length > 0 ? ((correctCount / questions.length) * 100).toFixed(2) : 0
  };
}

export {
  sanitizeData,
  sanitizeQuizQuestions,
  responseSanitizerMiddleware,
  validateAnswer,
  validateQuizSubmission,
  SENSITIVE_FIELDS
};
