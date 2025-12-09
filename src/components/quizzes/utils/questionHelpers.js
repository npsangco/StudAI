import { QUESTION_TYPES } from './constants';

// Get points for difficulty level
export function getPointsForDifficulty(difficulty) {
  const difficultyMap = {
    easy: 1,
    medium: 3,    // Fixed: was 2, should be 3
    hard: 5       // Fixed: was 3, should be 5
  };
  return difficultyMap[difficulty?.toLowerCase()] || 3;  // Fixed: default was 2, should be 3
}

// Check if answer is correct (with partial credit support for matching)
export function checkAnswer(question, answer) {
  // Validate inputs
  if (!question || !question.type) {
    console.error('Invalid question object:', question);
    return false;
  }

  if (answer == null || answer === '') {
    return false;
  }

  switch (question.type) {
    case QUESTION_TYPES.MULTIPLE_CHOICE:
    case QUESTION_TYPES.TRUE_FALSE:
      if (!question.correctAnswer) {
        console.error('Missing correctAnswer for question:', question);
        return false;
      }
      return String(answer).trim() === String(question.correctAnswer).trim();

    case QUESTION_TYPES.FILL_IN_BLANKS:
      if (!question.answer) {
        console.error('Missing answer for fill-in-the-blanks question:', question);
        return false;
      }
      
      // Parse answer field - support both old string format and new JSON format
      let primaryAnswer = '';
      let alternativeAnswers = [];
      let caseSensitive = false;

      try {
        if (typeof question.answer === 'string' && (question.answer.trim().startsWith('{') || question.answer.trim().startsWith('['))) {
          const parsed = JSON.parse(question.answer);
          if (parsed && typeof parsed === 'object' && 'primary' in parsed) {
            // New JSON format: { primary: "...", alternatives: [...], caseSensitive: true/false }
            primaryAnswer = parsed.primary || '';
            alternativeAnswers = Array.isArray(parsed.alternatives) ? parsed.alternatives : [];
            caseSensitive = parsed.caseSensitive || false;
          } else {
            // Old string format
            primaryAnswer = question.answer;
          }
        } else {
          // Old string format
          primaryAnswer = question.answer;
        }
      } catch (e) {
        // If parsing fails, treat as old string format
        primaryAnswer = question.answer;
      }

      // Prepare user answer
      const userAnswer = String(answer).trim();
      
      // Filter out empty alternatives
      alternativeAnswers = alternativeAnswers.filter(alt => alt && String(alt).trim() !== '');
      
      // Create array of all valid answers (primary + alternatives)
      const allValidAnswers = [primaryAnswer.trim(), ...alternativeAnswers.map(alt => String(alt).trim())];
      
      // Check if user answer matches any valid answer
      if (caseSensitive) {
        // Case-sensitive comparison
        return allValidAnswers.some(validAnswer => userAnswer === validAnswer);
      } else {
        // Case-insensitive comparison (default - backwards compatible)
        const userAnswerLower = userAnswer.toLowerCase();
        return allValidAnswers.some(validAnswer => userAnswerLower === validAnswer.toLowerCase());
      }

    case QUESTION_TYPES.MATCHING:
      if (!Array.isArray(answer) || answer.length === 0) return false;

      if (!question.matchingPairs || !Array.isArray(question.matchingPairs) || question.matchingPairs.length === 0) {
        console.error('Missing or invalid matchingPairs for matching question:', question);
        return false;
      }

      const totalPairs = question.matchingPairs.length;
      const correctPairs = answer.filter(match =>
        question.matchingPairs.some(pair =>
          pair.left === match.left && pair.right === match.right
        )
      ).length;
      
      const accuracy = correctPairs / totalPairs;
      const allCorrect = accuracy === 1.0 && answer.length === totalPairs;
      
      // Award partial credit if >= 60% correct
      if (accuracy >= 0.6) {
        const difficultyPoints = getPointsForDifficulty(question.difficulty);
        
        // 🔥 FAIR SCORING: Proportional to accuracy, but rounded for fairness
        // 100% → Full points
        // 75% → Rounded proportional (e.g., 0.75 * 3 = 2.25 → 2 points)
        // 60% → Minimum threshold (e.g., 0.60 * 3 = 1.8 → 2 points)
        let partialPoints;
        if (allCorrect) {
          // Perfect score gets full points
          partialPoints = difficultyPoints;
        } else {
          // Partial credit: proportional but rounded, minimum 1 point
          partialPoints = Math.max(1, Math.round(accuracy * difficultyPoints));
        }
        
        return {
          isCorrect: allCorrect,
          partialCredit: partialPoints,
          accuracy: Math.round(accuracy * 100),
          correctPairs,
          totalPairs
        };
      }
      
      // Less than 60% = no credit
      return {
        isCorrect: false,
        partialCredit: 0,
        accuracy: Math.round(accuracy * 100),
        correctPairs,
        totalPairs
      };
    
    default:
      return false;
  }
}

// Format time from seconds
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Create new question based on type
export function createNewQuestion(type = QUESTION_TYPES.MULTIPLE_CHOICE, existingQuestions = []) {
  const baseQuestion = {
    id: existingQuestions.length > 0 ? Math.max(...existingQuestions.map(q => q.id)) + 1 : 1,
    question: '',
    type: type,
    difficulty: 'medium' // Default to medium difficulty
  };

  switch (type) {
    case QUESTION_TYPES.MULTIPLE_CHOICE:
      return {
        ...baseQuestion,
        choices: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correctAnswer: 'Option 1'
      };
    
    case QUESTION_TYPES.FILL_IN_BLANKS:
      return {
        ...baseQuestion,
        answer: ''
      };
    
    case QUESTION_TYPES.TRUE_FALSE:
      return {
        ...baseQuestion,
        correctAnswer: 'True'
      };
    
    case QUESTION_TYPES.MATCHING:
      return {
        ...baseQuestion,
        matchingPairs: [{ left: '', right: '' }]
      };
    
    default:
      return baseQuestion;
  }
}

// Get performance message based on percentage
export function getPerformanceMessage(percentage) {
  if (percentage >= 90) return "Outstanding! 🏆";
  if (percentage >= 80) return "Excellent work! 🌟";
  if (percentage >= 70) return "Good job! 👍";
  if (percentage >= 60) return "Not bad! 📚";
  return "Keep practicing! 💪";
}

// Get performance color based on percentage
export function getPerformanceColor(percentage) {
  if (percentage >= 80) return "text-green-600";
  if (percentage >= 60) return "text-yellow-600";
  return "text-red-600";
}