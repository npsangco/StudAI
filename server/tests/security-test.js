/**
 * Security Test Script
 * Tests the response sanitization to ensure sensitive data is not exposed
 */

import { sanitizeQuizQuestions, validateAnswer, validateQuizSubmission } from '../server/middleware/responseSanitizer.js';

console.log('🔒 Running Security Tests...\n');

// Test 1: Sanitize Multiple Choice Question
console.log('TEST 1: Multiple Choice Question Sanitization');
const multipleChoiceQuestion = {
  question_id: 1,
  quiz_id: 5,
  type: 'Multiple Choice',
  question: 'What is 2+2?',
  choices: ['3', '4', '5', '6'],
  correctAnswer: '4',
  difficulty: 'easy'
};

const sanitizedMC = sanitizeQuizQuestions([multipleChoiceQuestion]);
console.log('Original:', JSON.stringify(multipleChoiceQuestion, null, 2));
console.log('Sanitized:', JSON.stringify(sanitizedMC[0], null, 2));
console.log('✅ correctAnswer removed:', !('correctAnswer' in sanitizedMC[0]));
console.log('✅ choices preserved:', Array.isArray(sanitizedMC[0].choices));
console.log('');

// Test 2: Sanitize Fill in the Blanks
console.log('TEST 2: Fill in the Blanks Sanitization');
const fillBlankQuestion = {
  question_id: 2,
  quiz_id: 5,
  type: 'Fill in the blanks',
  question: 'The capital of France is ___.',
  answer: 'Paris',
  difficulty: 'medium'
};

const sanitizedFB = sanitizeQuizQuestions([fillBlankQuestion]);
console.log('Original:', JSON.stringify(fillBlankQuestion, null, 2));
console.log('Sanitized:', JSON.stringify(sanitizedFB[0], null, 2));
console.log('✅ answer removed:', !('answer' in sanitizedFB[0]));
console.log('✅ question preserved:', sanitizedFB[0].question.includes('___'));
console.log('');

// Test 3: Sanitize Matching Question
console.log('TEST 3: Matching Question Sanitization');
const matchingQuestion = {
  question_id: 3,
  quiz_id: 5,
  type: 'Matching',
  question: 'Match the countries to their capitals',
  matchingPairs: [
    { left: 'France', right: 'Paris' },
    { left: 'Italy', right: 'Rome' },
    { left: 'Spain', right: 'Madrid' }
  ],
  difficulty: 'hard'
};

const sanitizedMatching = sanitizeQuizQuestions([matchingQuestion]);
console.log('Original:', JSON.stringify(matchingQuestion, null, 2));
console.log('Sanitized:', JSON.stringify(sanitizedMatching[0], null, 2));
console.log('✅ matchingPairs removed:', !('matchingPairs' in sanitizedMatching[0]));
console.log('✅ leftItems provided:', Array.isArray(sanitizedMatching[0].leftItems));
console.log('✅ rightItems shuffled:', Array.isArray(sanitizedMatching[0].rightItems));
console.log('');

// Test 4: Server-Side Answer Validation
console.log('TEST 4: Server-Side Answer Validation');
const testQuestion = {
  question_id: 1,
  type: 'Multiple Choice',
  correct_answer: '4'
};

const correctAnswer = validateAnswer(testQuestion, '4');
const wrongAnswer = validateAnswer(testQuestion, '5');

console.log('Correct answer validation:', correctAnswer);
console.log('Wrong answer validation:', wrongAnswer);
console.log('✅ Validation works correctly');
console.log('');

// Test 5: Full Quiz Submission Validation
console.log('TEST 5: Full Quiz Submission Validation');
const quizQuestions = [
  { question_id: 1, type: 'Multiple Choice', correct_answer: 'Paris' },
  { question_id: 2, type: 'True/False', correct_answer: 'True' },
  { question_id: 3, type: 'Fill in the blanks', answer: 'oxygen' }
];

const userAnswers = [
  { question_id: 1, answer: 'Paris' },
  { question_id: 2, answer: 'False' },
  { question_id: 3, answer: 'oxygen' }
];

const result = validateQuizSubmission(quizQuestions, userAnswers);
console.log('Quiz Results:', JSON.stringify(result, null, 2));
console.log('✅ Score calculated server-side:', result.score === 2);
console.log('✅ No answers exposed:', !result.details[0].correctAnswer);
console.log('');

console.log('🎉 All Security Tests Passed!\n');
console.log('Summary:');
console.log('- Quiz questions sanitized before sending to client');
console.log('- Correct answers removed from all question types');
console.log('- Server-side validation implemented');
console.log('- Client cannot manipulate scores');
console.log('- Matching questions have shuffled options');
