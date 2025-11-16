export function validateQuestion(question, index) {
  const errors = [];
  const questionNumber = index + 1;

  // Parse choices if it's a JSON string
  let parsedQuestion = { ...question };
  if (typeof parsedQuestion.choices === 'string') {
    try {
      parsedQuestion.choices = JSON.parse(parsedQuestion.choices);
    } catch (e) {
      parsedQuestion.choices = [];
    }
  }
  
  // Ensure choices is always an array
  if (!Array.isArray(parsedQuestion.choices)) {
    parsedQuestion.choices = [];
  }
  
  // Parse matchingPairs if it's a JSON string
  if (typeof parsedQuestion.matchingPairs === 'string') {
    try {
      parsedQuestion.matchingPairs = JSON.parse(parsedQuestion.matchingPairs);
    } catch (e) {
      parsedQuestion.matchingPairs = [];
    }
  }
  
  // Ensure matchingPairs is always an array
  if (!Array.isArray(parsedQuestion.matchingPairs)) {
    parsedQuestion.matchingPairs = [];
  }

  // Check if question text is empty
  if (!parsedQuestion.question || !parsedQuestion.question.trim()) {
    errors.push(`Question ${questionNumber}: Question text is required`);
    return errors; // Return early if no question text
  }

  // Validate based on question type
  switch (parsedQuestion.type) {
    case 'Multiple Choice':
      // Check if choices exist and have at least 2 options
      if (!parsedQuestion.choices || parsedQuestion.choices.length < 2) {
        errors.push(`Question ${questionNumber}: Multiple choice needs at least 2 choices`);
      } else {
        // Check for empty choices
        const emptyChoices = parsedQuestion.choices.filter(c => !c || !c.trim());
        if (emptyChoices.length > 0) {
          errors.push(`Question ${questionNumber}: All choices must have text`);
        }

        // Check for duplicate choices
        const uniqueChoices = new Set(parsedQuestion.choices.map(c => c.trim().toLowerCase()));
        if (uniqueChoices.size !== parsedQuestion.choices.length) {
          errors.push(`Question ${questionNumber}: Choices must be unique`);
        }
      }

      // Check if correct answer is set
      if (!question.correctAnswer || !question.correctAnswer.trim()) {
        errors.push(`Question ${questionNumber}: Please select a correct answer`);
      } else if (parsedQuestion.choices && Array.isArray(parsedQuestion.choices) && !parsedQuestion.choices.includes(question.correctAnswer)) {
        errors.push(`Question ${questionNumber}: Correct answer must be one of the choices`);
      }
      break;

    case 'Fill in the blanks':
      // Check if answer exists
      if (!question.answer || !question.answer.trim()) {
        errors.push(`Question ${questionNumber}: Answer is required for fill-in-the-blanks`);
      }
      break;

    case 'True/False':
      // Check if correct answer is set
      if (!question.correctAnswer || (question.correctAnswer !== 'True' && question.correctAnswer !== 'False')) {
        errors.push(`Question ${questionNumber}: Please select True or False as the correct answer`);
      }
      break;

    case 'Matching':
      // Check if matching pairs exist and have at least 2 pairs
      if (!question.matchingPairs || question.matchingPairs.length < 2) {
        errors.push(`Question ${questionNumber}: Matching questions need at least 2 pairs`);
      } else {
        // Check for empty pairs
        const emptyPairs = question.matchingPairs.filter(
          p => !p.left || !p.left.trim() || !p.right || !p.right.trim()
        );
        if (emptyPairs.length > 0) {
          errors.push(`Question ${questionNumber}: All matching pairs must have both left and right values`);
        }

        // Check for duplicate left items
        const leftItems = question.matchingPairs.map(p => p.left?.trim().toLowerCase()).filter(Boolean);
        const uniqueLeft = new Set(leftItems);
        if (uniqueLeft.size !== leftItems.length) {
          errors.push(`Question ${questionNumber}: Left column items must be unique`);
        }

        // Check for duplicate right items
        const rightItems = question.matchingPairs.map(p => p.right?.trim().toLowerCase()).filter(Boolean);
        const uniqueRight = new Set(rightItems);
        if (uniqueRight.size !== rightItems.length) {
          errors.push(`Question ${questionNumber}: Right column items must be unique`);
        }
      }
      break;

    default:
      errors.push(`Question ${questionNumber}: Invalid question type`);
  }

  return errors;
}

export function validateAllQuestions(questions) {
  if (!questions || questions.length === 0) {
    return {
      isValid: false,
      errors: ['Quiz must have at least one question']
    };
  }

  const allErrors = [];

  questions.forEach((question, index) => {
    const questionErrors = validateQuestion(question, index);
    allErrors.push(...questionErrors);
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Checks if quiz meets requirements for adaptive difficulty mode
 */
export function validateAdaptiveRequirements(questions) {
  const MIN_QUESTIONS = 5;

  if (!questions || questions.length < MIN_QUESTIONS) {
    const remaining = MIN_QUESTIONS - (questions?.length || 0);
    return {
      canUseAdaptive: false,
      warning: `Classic Mode: Add ${remaining} more question${remaining > 1 ? 's' : ''} to unlock Adaptive Mode (intelligently adjusts difficulty based on student performance)`
    };
  }

  // Check if quiz has at least 2 different difficulty levels
  const difficulties = new Set(
    questions.map(q => q.difficulty?.toLowerCase() || 'medium')
  );

  if (difficulties.size < 2) {
    return {
      canUseAdaptive: false,
      warning: 'Classic Mode: Add questions from different difficulty levels to unlock Adaptive Mode (automatically personalizes learning path)'
    };
  }

  return {
    canUseAdaptive: true,
    message: `✓ Adaptive difficulty enabled (${questions.length} questions)`
  };
}