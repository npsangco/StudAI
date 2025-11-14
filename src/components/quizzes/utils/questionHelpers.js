import { QUESTION_TYPES } from './constants';

// Check if answer is correct
export function checkAnswer(question, answer) {
  switch (question.type) {
    case QUESTION_TYPES.MULTIPLE_CHOICE:
    case QUESTION_TYPES.TRUE_FALSE:
      return answer === question.correctAnswer;
    
    case QUESTION_TYPES.FILL_IN_BLANKS:
      return answer.toLowerCase().trim() === question.answer.toLowerCase().trim();
    
    case QUESTION_TYPES.MATCHING:
      if (!Array.isArray(answer) || answer.length === 0) return false;
      return answer.every(match =>
        question.matchingPairs.some(pair =>
          pair.left === match.left && pair.right === match.right
        )
      ) && answer.length === question.matchingPairs.length;
    
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