// Timing constants
export const COUNTDOWN_SECONDS = 5;
export const ANSWER_DISPLAY_DURATION = 2000;
export const MATCHING_REVIEW_DURATION_BATTLE = 7000;
export const QUIZ_TIME_LIMIT = 30;
export const PHYSICS_UPDATE_INTERVAL = 30;

// Player constants
export const PLAYER_RADIUS = 2.5;
export const PLAYER_WALK_SPEED = 1.2;

// Grade thresholds
export const GRADE_OUTSTANDING = 90;
export const GRADE_EXCELLENT = 80;
export const GRADE_GOOD = 70;
export const GRADE_PASSING = 60;

// View states
export const VIEWS = {
  LIST: 'list',
  EDITING: 'editing',
  LOADING: 'loading',
  LOADING_BATTLE: 'loadingBattle',
  LOBBY: 'lobby',
  SOLO: 'solo',
  BATTLE: 'battle'
};

// Question types
export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  FILL_IN_BLANKS: 'Fill in the blanks',
  TRUE_FALSE: 'True/False',
  MATCHING: 'Matching'
};

// Text length limits for quiz editor
export const TEXT_LIMITS = {
  QUESTION: {
    recommended: 300,
    maximum: 500,
    warning: 400
  },
  CHOICE: {
    recommended: 100,
    maximum: 150,
    warning: 120
  },
  FILL_ANSWER: {
    recommended: 50,
    maximum: 100,
    warning: 80
  },
  MATCHING_ITEM: {
    recommended: 80,
    maximum: 120,
    warning: 100
  }
};