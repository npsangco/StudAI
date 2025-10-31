export function validateQuestion(question, index) {
  const errors = [];
  const questionNumber = index + 1;

  // Check if question text is empty
  if (!question.question || !question.question.trim()) {
    errors.push(`Question ${questionNumber}: Question text is required`);
    return errors; // Return early if no question text
  }

  // Validate based on question type
  switch (question.type) {
    case 'Multiple Choice':
      // Check if choices exist and have at least 2 options
      if (!question.choices || question.choices.length < 2) {
        errors.push(`Question ${questionNumber}: Multiple choice needs at least 2 choices`);
      } else {
        // Check for empty choices
        const emptyChoices = question.choices.filter(c => !c || !c.trim());
        if (emptyChoices.length > 0) {
          errors.push(`Question ${questionNumber}: All choices must have text`);
        }

        // Check for duplicate choices
        const uniqueChoices = new Set(question.choices.map(c => c.trim().toLowerCase()));
        if (uniqueChoices.size !== question.choices.length) {
          errors.push(`Question ${questionNumber}: Choices must be unique`);
        }
      }

      // Check if correct answer is set
      if (!question.correctAnswer || !question.correctAnswer.trim()) {
        errors.push(`Question ${questionNumber}: Please select a correct answer`);
      } else if (question.choices && !question.choices.includes(question.correctAnswer)) {
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