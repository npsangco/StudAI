export const initialQuizzes = [
  {
    id: 1,
    title: 'Data Algorithms',
    questionCount: 50,
    created: 'Created today',
    isPublic: true
  },
  {
    id: 2,
    title: 'Database',
    questionCount: 15,
    created: 'Created 9d ago',
    isPublic: false
  },
  {
    id: 3,
    title: 'Web Development',
    questionCount: 20,
    created: 'Created 10d ago',
    isPublic: false
  },
  {
    id: 4,
    title: 'Data Structures',
    questionCount: 25,
    created: 'Created 12d ago',
    isPublic: false
  }
];

export const initialQuestions = [
  {
    id: 1,
    type: 'Multiple Choice',
    question: 'Which sorting algorithm has the most consistent time complexity performance regardless of input data arrangement?',
    choices: ['Quick Sort', 'Bubble Sort', 'Merge Sort', 'Insertion Sort'],
    correctAnswer: 'Merge Sort'
  },
  {
    id: 2,
    type: 'Fill in the blanks',
    question: 'The _______ complexity of binary search is O(log n), which makes it significantly more efficient than linear search\'s O(n) complexity when searching through sorted datasets.',
    answer: 'time'
  },
  {
    id: 3,
    type: 'Matching',
    question: 'Match the programming concepts with their definitions:',
    matchingPairs: [
      { left: 'Variable', right: 'A named storage location' },
      { left: 'Function', right: 'A reusable block of code' },
      { left: 'Loop', right: 'A control structure for repetition' }
    ]
  }
];

export const simulatedPlayerNames = [
  { name: 'Denise', initial: 'D' },
  { name: 'Den', initial: 'D' },
  { name: 'Nimrod', initial: 'N' },
  { name: 'Bins', initial: 'B' }
];