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
        break;
      }
      
      // Parse answer field - support both old string format and new JSON format
      try {
        let primaryAnswer = question.answer;
        let alternatives = [];
        let caseSensitive = false;

        if (typeof question.answer === 'string' && (question.answer.trim().startsWith('{') || question.answer.trim().startsWith('['))) {
          const parsed = JSON.parse(question.answer);
          if (parsed && typeof parsed === 'object' && 'primary' in parsed) {
            primaryAnswer = parsed.primary || '';
            alternatives = Array.isArray(parsed.alternatives) ? parsed.alternatives : [];
            caseSensitive = parsed.caseSensitive || false;
          }
        }

        // Validate primary answer
        if (!primaryAnswer || !primaryAnswer.trim()) {
          errors.push(`Question ${questionNumber}: Primary answer is required for fill-in-the-blanks`);
        }
        
        // Validate alternative answers if they exist
        if (alternatives.length > 0) {
          const emptyAlternatives = alternatives.filter(alt => !alt || !String(alt).trim());
          if (emptyAlternatives.length > 0) {
            errors.push(`Question ${questionNumber}: Alternative answers cannot be empty. Please remove empty alternatives or fill them in.`);
          }
          
          // Check for duplicate answers (including primary)
          if (primaryAnswer && primaryAnswer.trim()) {
            const allAnswers = [primaryAnswer.trim(), ...alternatives.filter(alt => alt && String(alt).trim())];
            
            // Create normalized set for duplicate checking
            const normalizedAnswers = caseSensitive 
              ? allAnswers 
              : allAnswers.map(ans => String(ans).toLowerCase());
            
            const uniqueAnswers = new Set(normalizedAnswers);
            if (uniqueAnswers.size < allAnswers.length) {
              errors.push(`Question ${questionNumber}: Duplicate answers detected. ${caseSensitive ? 'Remove duplicate answers.' : 'Remove duplicate answers (case-insensitive check).'}`);
            }
          }
        }
      } catch (e) {
        // If parsing fails, it's old format - already validated above
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
  // Allow empty quizzes (can be saved but not played)
  if (!questions || questions.length === 0) {
    return {
      isValid: true,
      errors: [],
      isEmpty: true
    };
  }

  const allErrors = [];

  questions.forEach((question, index) => {
    const questionErrors = validateQuestion(question, index);
    allErrors.push(...questionErrors);
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    isEmpty: false
  };
}

/**
 * Checks if quiz meets requirements for adaptive difficulty mode
 * Requirements: Just 2+ different difficulty levels (no minimum question count)
 */
export function validateAdaptiveRequirements(questions) {
  if (!questions || questions.length === 0) {
    return {
      canUseAdaptive: false,
      warning: 'Classic Mode: Add questions to unlock Adaptive Mode (intelligently adjusts difficulty based on student performance)'
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