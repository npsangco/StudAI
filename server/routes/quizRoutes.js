import express from 'express';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import QuizAttempt from '../models/QuizAttempt.js';
import User from '../models/User.js';
import UserDailyStat from '../models/UserDailyStat.js';
import QuizBattle from '../models/QuizBattle.js';
import BattleParticipant from '../models/BattleParticipant.js';
import sequelize from '../db.js';
import { Op } from 'sequelize';
import { validateQuizRequest, validateTitle, validateNumericId } from '../middleware/validationMiddleware.js';
import { ensureQuizAvailable, recordQuizUsage, DAILY_AI_LIMITS, getUsageSnapshot } from '../services/aiUsageService.js';
import { ensureContentIsSafe, ModerationError } from '../services/moderationService.js';
import { jsonrepair } from 'jsonrepair';

const router = express.Router();

// AI quiz generation rules
const AI_QUIZ_RULES = {
  requiredQuestionCount: 15,
  batchSize: 10,
  validTypes: ['Multiple Choice', 'Fill in the blanks', 'True/False', 'Matching']
};

const QUESTION_TYPE_PROMPT_EXAMPLES = {
  'Multiple Choice': '{"type":"Multiple Choice","question":"What is the main idea of the passage?","choices":["Option A","Option B","Option C","Option D"],"correctAnswer":"Option A"}',
  'Fill in the blanks': '{"type":"Fill in the blanks","question":"The process is called ___.","answer":"photosynthesis"}',
  'True/False': '{"type":"True/False","question":"The heart pumps blood.","correctAnswer":"True"}',
  'Matching': '{"type":"Matching","question":"Match each scientist to their discovery","matchingPairs":[{"left":"Newton","right":"Gravity"},{"left":"Curie","right":"Radioactivity"}]}'
};

const EXAMPLE_QUESTION_TEXTS = {
  'Multiple Choice': 'What is the main idea of the passage?',
  'Fill in the blanks': 'The process is called ___.',
  'True/False': 'The heart pumps blood.',
  'Matching': 'Match each scientist to their discovery'
};

// Quiz completion rewards configuration
const QUIZ_CONFIG = {
  points: {
    formula: (score, total) => {
      if (total === 0) return 0;
      const percentage = (score / total) * 100;
      if (percentage >= 100) return 50;
      if (percentage >= 80) return 40;
      if (percentage >= 60) return 30;
      if (percentage >= 40) return 20;
      return 10; // Participation
    },
    dailyCap: 3,
    capMessage: "Daily quiz limit reached (3/3). Come back tomorrow for more points!"
  },
  exp: {
    formula: (score, total) => {
      if (total === 0) return 0;
      const percentage = (score / total) * 100;
      return Math.floor((percentage / 100) * 30); // Max 30 EXP
    }
  }
};

// Normalize AI-generated question format
function normalizeAiQuestion(rawQuestion, index, allowedTypes = AI_QUIZ_RULES.validTypes) {
  if (!rawQuestion || typeof rawQuestion !== 'object') {
    throw new Error(`Question ${index + 1} is not valid JSON data.`);
  }

  const questionText = typeof rawQuestion.question === 'string' ? rawQuestion.question.trim() : '';
  if (!questionText) {
    throw new Error(`Question ${index + 1} is missing the question text.`);
  }

  const validTypes = Array.isArray(allowedTypes) && allowedTypes.length
    ? allowedTypes
    : AI_QUIZ_RULES.validTypes;

  const type = validTypes.includes(rawQuestion.type) ? rawQuestion.type : null;
  if (!type) {
    throw new Error(`Question ${index + 1} has an unsupported type: ${rawQuestion.type || 'undefined'}.`);
  }

  const normalized = { type, question: questionText };

  const sampleQuestionText = EXAMPLE_QUESTION_TEXTS[type];
  if (sampleQuestionText && questionText.toLowerCase() === sampleQuestionText.toLowerCase()) {
    throw new Error(`Question ${index + 1} must not reuse provided sample questions. Create new content based on the note.`);
  }

  if (type === 'Multiple Choice') {
    const rawChoices = Array.isArray(rawQuestion.choices) ? rawQuestion.choices : [];
    const cleanedChoices = rawChoices
      .map(choice => (typeof choice === 'string' ? choice.trim() : ''))
      .filter(choice => choice.length > 0);

    if (cleanedChoices.length < 2) {
      throw new Error(`Question ${index + 1} must provide at least two choices.`);
    }

    const rawCorrectAnswer = typeof rawQuestion.correctAnswer === 'string' ? rawQuestion.correctAnswer.trim() : '';
    if (!rawCorrectAnswer) {
      throw new Error(`Question ${index + 1} must include the correct answer.`);
    }

    const resolvedAnswer = cleanedChoices.find(
      choice => choice.toLowerCase() === rawCorrectAnswer.toLowerCase()
    );

    if (!resolvedAnswer) {
      throw new Error(`Question ${index + 1} correct answer must match one of the provided choices.`);
    }

    normalized.choices = cleanedChoices;
    normalized.correctAnswer = resolvedAnswer;
  } else if (type === 'True/False') {
    const rawCorrectAnswer = typeof rawQuestion.correctAnswer === 'string' ? rawQuestion.correctAnswer.trim().toLowerCase() : '';
    if (rawCorrectAnswer !== 'true' && rawCorrectAnswer !== 'false') {
      throw new Error(`Question ${index + 1} must specify "True" or "False" as the correct answer.`);
    }
    normalized.correctAnswer = rawCorrectAnswer === 'true' ? 'True' : 'False';
  } else if (type === 'Fill in the blanks') {
    const blankMatches = questionText.match(/_{3,}/g) || [];
    if (blankMatches.length !== 1) {
      throw new Error(`Question ${index + 1} must contain exactly one blank placeholder (___).`);
    }
    const answer = typeof rawQuestion.answer === 'string' ? rawQuestion.answer.trim() : '';
    if (!answer) {
      throw new Error(`Question ${index + 1} must specify the missing word or phrase.`);
    }
    normalized.answer = answer;
  } else if (type === 'Matching') {
    const rawPairs = Array.isArray(rawQuestion.matchingPairs) ? rawQuestion.matchingPairs : [];
    const cleanedPairs = rawPairs
      .map(pair => ({
        left: typeof pair?.left === 'string' ? pair.left.trim() : '',
        right: typeof pair?.right === 'string' ? pair.right.trim() : ''
      }))
      .filter(pair => pair.left && pair.right);

    if (cleanedPairs.length === 0) {
      throw new Error(`Question ${index + 1} must include at least one valid matching pair.`);
    }

    normalized.matchingPairs = cleanedPairs;
  }

  return normalized;
}

// Extract JSON objects from AI response
function extractTopLevelJsonObjects(rawText) {
  const objects = [];
  let depth = 0;
  let startIndex = -1;
  let inString = false;
  let escaping = false;

  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      if (depth === 0) {
        startIndex = i;
      }
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && startIndex !== -1) {
        objects.push(rawText.slice(startIndex, i + 1));
        startIndex = -1;
      }
    }
  }

  return objects;
}

// Try parsing JSON with basic repairs
function tryParseWithRepair(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    try {
      return JSON.parse(jsonrepair(jsonString));
    } catch {
      return null;
    }
  }
}

// Salvage partial question arrays from AI response
function salvageQuestionArray(rawText, expectedCount) {
  const objectStrings = extractTopLevelJsonObjects(rawText);
  if (!objectStrings.length) {
    return null;
  }

  const parsedObjects = objectStrings
    .map(objText => tryParseWithRepair(objText))
    .filter(Boolean);

  if (parsedObjects.length === expectedCount) {
    return parsedObjects;
  }

  return null;
}

// Generate a batch of AI questions
async function generateAiQuestionBatch({ batchCount, truncatedContent, openAiApiKey, allowedTypes }) {
  const typeWhitelist = Array.isArray(allowedTypes) && allowedTypes.length
    ? allowedTypes
    : AI_QUIZ_RULES.validTypes;

  const exampleSnippets = typeWhitelist
    .map(type => QUESTION_TYPE_PROMPT_EXAMPLES[type])
    .filter(Boolean)
    .map(snippet => `  ${snippet}`)
    .join(',\n');

  const exampleBlock = `Example format ONLY (structure reference — never copy text or answers):\n[\n${exampleSnippets}\n]`;

  const prompt = `Generate EXACTLY ${batchCount} valid JSON quiz questions. CRITICAL RULES:
1. Return ONLY JSON array in brackets [], nothing else
2. NO markdown, NO code blocks, NO text outside JSON
3. NO escaped quotes (\"), NO newlines in strings
4. ONLY use these exact keys: "type", "question", "choices", "correctAnswer", "answer", "matchingPairs"
5. NEVER use: "_blank1_", "_blank2_", "blank" fields, or underscore keys
6. Fill-in-the-blank question text MUST contain exactly one "___" placeholder (no numbered or multiple blanks)
7. For Fill blanks: ALWAYS use "answer" key with a single word or short phrase matching that blank
8. Each question must have all required fields for its type
9. You MUST use ONLY these question types (spellings must match exactly): ${typeWhitelist.join(', ')}

CRITICAL: If you generate any field with underscore or blank numbers, the entire response fails!
CRITICAL: DO NOT reuse the sample questions below. They are format guides only and copying them will be rejected.

Content: "${truncatedContent}"

Generate EXACTLY in this format - no variations:
${exampleBlock}`;

  const maxAiAttempts = 3;
  let normalizedQuestions = null;
  let lastErrorMessage = 'AI failed to generate quiz questions.';
  let retryInstruction = '';

  for (let attempt = 1; attempt <= maxAiAttempts; attempt++) {
    const attemptPrompt = retryInstruction ? `${prompt}\n${retryInstruction}` : prompt;

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator that creates well-structured quiz questions. Return only valid JSON.'
          },
          {
            role: 'user',
            content: attemptPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 1.0,
        frequency_penalty: 0.5,
        presence_penalty: 0.5
      })
    });

    if (!openAiResponse.ok) {
      const errorData = await openAiResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const aiData = await openAiResponse.json();
    const generatedText = aiData.choices[0]?.message?.content;

    if (!generatedText) {
      lastErrorMessage = 'No response from OpenAI';
      retryInstruction = `Previous response was empty. Return ONLY a JSON array with ${batchCount} quiz questions.`;
      continue;
    }

    let jsonText = generatedText.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    let questionsData;
    try {
      questionsData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Initial JSON parse error:', parseError.message);
      console.error('Position:', parseError.message.match(/position (\d+)/) ? parseError.message.match(/position (\d+)/)[1] : 'unknown');
      console.error('Attempting to fix common JSON issues...');

      let repairedSuccessfully = false;

      try {
        const repairedJson = jsonrepair(jsonText);
        questionsData = JSON.parse(repairedJson);
        repairedSuccessfully = true;
        console.log('JSON repaired via jsonrepair');
      } catch (repairError) {
        console.error('jsonrepair failed, applying manual fallbacks...');
        let fixedJson = jsonText;
        fixedJson = fixedJson.replace(/[\x00-\x1f\x7f]/g, '');
        fixedJson = fixedJson.replace(/\\"/g, '"');
        fixedJson = fixedJson.replace(/\\\"/g, '"');
        fixedJson = fixedJson.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, match => match.replace(/\n\s+/g, ' ').replace(/[\r\n]+/g, ' '));
        fixedJson = fixedJson.replace(/([{,]\s*)'([^'"\s][^'"\n]*?)'(\s*:)/g, '$1"$2"$3');
        fixedJson = fixedJson.replace(/:\s*'([^'"\n]*?)'(\s*[,}])/g, ':"$1"$2');
        fixedJson = fixedJson.replace(/\{\s*"_blank\d+_"\s*:[^}]*\}/g, '');
        fixedJson = fixedJson.replace(/,\s*\{\s*"_blank\d+_"/g, '');
        fixedJson = fixedJson.replace(/"_blank\d+_"/g, '"answer"');
        fixedJson = fixedJson.replace(/,(\s*[\]\}])/g, '$1');
        fixedJson = fixedJson.replace(/\}\s*\{/g, '},{');
        fixedJson = fixedJson.replace(/\]\s*\{/g, '],[{');
        fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z_]\w*)(\s*:)/g, '$1"$2"$3');

        const openBrackets = (fixedJson.match(/\[/g) || []).length;
        const closeBrackets = (fixedJson.match(/\]/g) || []).length;
        const openBraces = (fixedJson.match(/\{/g) || []).length;
        const closeBraces = (fixedJson.match(/\}/g) || []).length;

        if (openBrackets > closeBrackets) {
          fixedJson = fixedJson + ']'.repeat(openBrackets - closeBrackets);
        }
        if (openBraces > closeBraces) {
          fixedJson = fixedJson + '}'.repeat(openBraces - closeBraces);
        }

        try {
          questionsData = JSON.parse(fixedJson);
          repairedSuccessfully = true;
          console.log('JSON fixed and parsed successfully');
        } catch (secondError) {
          console.error('Failed to parse JSON even after fixes:', secondError.message);
          console.error('Raw response (first 1000 chars):', jsonText.substring(0, 1000));
          console.error('Fixed response (first 1000 chars):', fixedJson.substring(0, 1000));
          const salvagedQuestions = salvageQuestionArray(jsonText, batchCount) || salvageQuestionArray(fixedJson, batchCount);
          if (salvagedQuestions && salvagedQuestions.length === batchCount) {
            questionsData = salvagedQuestions;
            repairedSuccessfully = true;
            console.log('Salvaged questions via object extraction');
          } else {
            lastErrorMessage = 'AI response was not valid JSON. Please try again.';
            retryInstruction = `Return ONLY valid JSON array data with ${batchCount} quiz questions. No prose, no markdown.`;
            continue;
          }
        }
      }

      if (!repairedSuccessfully) {
        lastErrorMessage = 'Failed to repair AI JSON output. Please try again.';
        continue;
      }
    }

    if (!Array.isArray(questionsData)) {
      lastErrorMessage = 'AI response must be a JSON array of questions.';
      retryInstruction = `Respond ONLY with a JSON array containing ${batchCount} question objects.`;
      continue;
    }

    if (questionsData.length !== batchCount) {
      lastErrorMessage = `AI must return exactly ${batchCount} questions. Received ${questionsData.length}.`;
      retryInstruction = `You returned ${questionsData.length} questions. Regenerate and return EXACTLY ${batchCount} fully-valid questions.`;
      continue;
    }

    try {
      normalizedQuestions = questionsData.map((questionData, index) => normalizeAiQuestion(questionData, index, typeWhitelist));
      break;
    } catch (validationError) {
      lastErrorMessage = validationError.message;
      retryInstruction = `Validation error: ${validationError.message}. Fix all issues and return ${batchCount} valid questions.`;
    }
  }

  if (!normalizedQuestions) {
    throw new Error(lastErrorMessage);
  }

  return normalizedQuestions;
}

// Build full AI quiz with multiple batches
async function buildAiQuizQuestions({
  targetQuestionCount,
  truncatedContent,
  openAiApiKey,
  allowedTypes,
  batchSize = AI_QUIZ_RULES.batchSize
}) {
  const normalizedQuestions = [];
  const seenQuestions = new Set();
  const safeBatchSize = Math.max(1, batchSize || targetQuestionCount);
  const maxBatchIterations = Math.max(3, Math.ceil(targetQuestionCount / safeBatchSize) + 2);
  let batchIterations = 0;

  while (normalizedQuestions.length < targetQuestionCount && batchIterations < maxBatchIterations) {
    batchIterations++;
    const remainingNeeded = targetQuestionCount - normalizedQuestions.length;
    const currentBatchSize = Math.min(safeBatchSize, remainingNeeded);
    let batchQuestions;

    try {
      batchQuestions = await generateAiQuestionBatch({
        batchCount: currentBatchSize,
        truncatedContent,
        openAiApiKey,
        allowedTypes
      });
    } catch (batchError) {
      console.warn(`[AI] Batch generation attempt ${batchIterations} failed: ${batchError.message}`);
      if (batchIterations >= maxBatchIterations) {
        throw batchError;
      }
      continue;
    }

    for (const questionData of batchQuestions) {
      const questionKey = `${questionData.type}:${(questionData.question || '').trim().toLowerCase()}`;
      if (seenQuestions.has(questionKey)) {
        continue;
      }
      seenQuestions.add(questionKey);
      normalizedQuestions.push(questionData);
      if (normalizedQuestions.length === targetQuestionCount) {
        break;
      }
    }
  }

  if (normalizedQuestions.length !== targetQuestionCount) {
    throw new Error(`AI returned only ${normalizedQuestions.length} unique questions after batching. Please try again.`);
  }

  return normalizedQuestions;
}

// Auth check: session cookie or parent middleware
const requireAuth = (req, res, next) => {
  // Method 1: Check session cookie (primary)
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Method 2: Check if already authenticated by parent middleware (e.g., sessionLockCheck)
  if (req.user && req.user.userId) {
    return next();
  }
  
  // No valid authentication found
  return res.status(401).json({ 
    error: 'Authentication required. Please log in.',
    authRequired: true 
  });
};

// Log activity to daily stats
async function logDailyStats(userId, activityType, points, exp) {
  const today = new Date().toISOString().split('T')[0];
  
  // Use findOrCreate to ensure we only have one record per user per day
  const [dailyStat, created] = await UserDailyStat.findOrCreate({
    where: { 
      user_id: userId, 
      last_reset_date: today 
    },
    defaults: {
      user_id: userId,
      last_reset_date: today,
      notes_created_today: 0,
      quizzes_completed_today: 0,
      planner_updates_today: 0,
      points_earned_today: 0,
      exp_earned_today: 0
    }
  });
  
  const updates = {
    points_earned_today: dailyStat.points_earned_today + points,
    exp_earned_today: dailyStat.exp_earned_today + exp
  };
  
  if (activityType === 'quiz') {
    updates.quizzes_completed_today = dailyStat.quizzes_completed_today + 1;
  }
  
  await dailyStat.update(updates);
  await dailyStat.reload(); // Refresh to get updated values
  return dailyStat;
}

// Update user's study streak
async function updateUserStreak(userId) {
  const user = await User.findByPk(userId);
  const today = new Date().toISOString().split('T')[0];
  const lastActivity = user.last_activity_date;
  
  if (!lastActivity) {
    await user.update({
      study_streak: 1,
      last_activity_date: today,
      longest_streak: 1
    });
    return 1;
  }
  
  const lastDate = new Date(lastActivity);
  const todayDate = new Date(today);
  const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 1) {
    // Consecutive day
    const newStreak = user.study_streak + 1;
    await user.update({
      study_streak: newStreak,
      last_activity_date: today,
      longest_streak: Math.max(user.longest_streak || 0, newStreak)
    });
    return newStreak;
  } else if (daysDiff > 1) {
    // Streak broken
    await user.update({
      study_streak: 1,
      last_activity_date: today
    });
    return 1;
  }
  
  // Same day, return current streak
  return user.study_streak;
}

// Trigger achievement checks
async function checkAchievements(userId) {
  try {
    const { checkAndUnlockAchievements } = await import('../services/achievementServices.js');
    const unlockedAchievements = await checkAndUnlockAchievements(userId);
    if (unlockedAchievements && unlockedAchievements.length > 0) {
      // Achievement unlocked silently
    }
    return unlockedAchievements;
  } catch (err) {
    console.error('[Achievement] Service error:', err);
    return [];
  }
}

// Award EXP to pet companion
async function awardPetExp(userId, expAmount) {
  try {
    // Load PetCompanion model dynamically (default export)
    const PetCompanionModule = await import('../models/PetCompanion.js');
    const PetCompanion = PetCompanionModule.default;
    
    const pet = await PetCompanion.findOne({ where: { user_id: userId } });
    
    if (!pet) {
      return null; // No pet adopted
    }
    
    const currentExp = pet.experience_points || 0;
    const currentLevel = pet.level || 1;
    
    // Calculate EXP needed for next level using formula: 100 * 1.08^(level-1)
    function expForLevel(level) {
      return Math.floor(100 * Math.pow(1.08, level - 1));
    }
    
    let newExp = currentExp + expAmount;
    let newLevel = currentLevel;
    let levelsGained = 0;
    
    // Handle multiple level-ups
    while (newLevel < 50) {
      const expNeeded = expForLevel(newLevel);
      if (newExp >= expNeeded) {
        newExp -= expNeeded;
        newLevel++;
        levelsGained++;
      } else {
        break;
      }
    }
    
    // Cap at level 50
    if (newLevel > 50) {
      newLevel = 50;
      newExp = 0;
    }
    
    await pet.update({
      experience_points: newExp,
      level: newLevel
    });
    
    if (levelsGained > 0) {
      return {
        leveledUp: true,
        levelsGained,
        currentLevel: newLevel,
        expGained: expAmount
      };
    }
    
    return {
      leveledUp: false,
      levelsGained: 0,
      currentLevel: newLevel,
      expGained: expAmount
    };
  } catch (err) {
    console.error('Error awarding pet EXP:', err);
    return null;
  }
}

// Generate unique share code for quiz
const generateUniqueShareCode = async () => {
  let shareCode;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!isUnique && attempts < maxAttempts) {
    shareCode = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = await Quiz.findOne({ 
      where: { share_code: shareCode } 
    });
    if (!existing) isUnique = true;
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('Failed to generate unique share code');
  }
  
  return shareCode;
};

// ============================================
// QUIZ ROUTES
// ============================================

// Get all quizzes (public + user's own)
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get ONLY quizzes created by this user
    const quizzes = await Quiz.findAll({
      where: {
        created_by: userId  
      },
      include: [{
        model: User,
        as: 'creator',
        attributes: ['username']
      }],
      order: [['created_at', 'DESC']]
    });

    // Enhance each quiz with difficulty distribution for adaptive mode check
    const enhancedQuizzes = await Promise.all(quizzes.map(async (quiz) => {
      const quizData = quiz.toJSON();

      const difficultyRows = await Question.findAll({
        attributes: [
          'difficulty',
          [sequelize.fn('COUNT', sequelize.col('question_id')), 'count']
        ],
        where: { quiz_id: quiz.quiz_id },
        group: ['difficulty']
      });

      const difficultyDistribution = { easy: 0, medium: 0, hard: 0 };
      difficultyRows.forEach(row => {
        const key = (row.difficulty || 'medium').toLowerCase();
        if (key === 'easy' || key === 'medium' || key === 'hard') {
          difficultyDistribution[key] = Number(row.get('count')) || 0;
        }
      });

      const totalQuestions = Object.values(difficultyDistribution).reduce((sum, value) => sum + value, 0);
      const hasAllDifficulties = Object.values(difficultyDistribution).every(count => count > 0);
      const hasVariedDifficulty = Object.values(difficultyDistribution).filter(count => count > 0).length >= 2;

      quizData.difficulty_distribution = difficultyDistribution;
      quizData.difficultyDistribution = difficultyDistribution; // legacy camelCase consumer
      quizData.has_varied_difficulty = hasVariedDifficulty;
      quizData.can_use_adaptive = hasVariedDifficulty; // Adaptive mode only requires 2+ difficulty levels
      quizData.supportsAdaptiveMode = quizData.can_use_adaptive;
      quizData.total_questions = totalQuestions;

      return quizData;
    }));

    return res.json({ quizzes: enhancedQuizzes });
  } catch (err) {
    console.error('[Quiz] Fetch quizzes error:', err);
    return res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Get single quiz with questions
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const quizId = req.params.id;

    const quiz = await Quiz.findOne({
      where: { quiz_id: quizId },
      include: [{
        model: User,
        as: 'creator',
        attributes: ['username']
      }]
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (!quiz.is_public && quiz.created_by !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this quiz' });
    }

    const questions = await Question.findAll({
      where: { quiz_id: quizId },
      order: [['question_order', 'ASC'], ['question_id', 'ASC']]
    });

    const difficultyDistribution = { easy: 0, medium: 0, hard: 0 };
    const parsedQuestions = questions.map(question => {
      const questionJson = question.toJSON();

      const difficultyKey = (questionJson.difficulty || 'medium').toLowerCase();
      if (difficultyDistribution[difficultyKey] !== undefined) {
        difficultyDistribution[difficultyKey] += 1;
      }

      let choices = questionJson.choices;
      if (typeof choices === 'string') {
        try {
          choices = JSON.parse(choices);
        } catch {
          choices = null;
        }
      }

      let matchingPairs = questionJson.matching_pairs;
      if (typeof matchingPairs === 'string') {
        try {
          matchingPairs = JSON.parse(matchingPairs);
        } catch {
          matchingPairs = null;
        }
      }
      
      // Convert matching_pairs from object format to array format if needed
      if (matchingPairs && typeof matchingPairs === 'object' && !Array.isArray(matchingPairs)) {
        matchingPairs = Object.entries(matchingPairs).map(([left, right]) => ({ left, right }));
      } else if (!matchingPairs || !Array.isArray(matchingPairs)) {
        // Ensure matchingPairs is always an array (empty if null/undefined)
        matchingPairs = [];
      }

      return {
        question_id: questionJson.question_id,
        quiz_id: questionJson.quiz_id,
        type: questionJson.type,
        question: questionJson.question,
        question_order: questionJson.question_order,
        choices,
        matchingPairs,
        difficulty: questionJson.difficulty || 'medium',
        correctAnswer: questionJson.correct_answer,
        answer: questionJson.answer
      };
    });

    const totalQuestions = parsedQuestions.length;
    const hasVariedDifficulty = Object.values(difficultyDistribution).filter(count => count > 0).length >= 2;
    const hasAllDifficulties = Object.values(difficultyDistribution).every(count => count > 0);

    const quizPayload = {
      ...quiz.toJSON(),
      total_questions: totalQuestions,
      difficulty_distribution: difficultyDistribution,
      difficultyDistribution,
      has_varied_difficulty: hasVariedDifficulty,
      can_use_adaptive: hasVariedDifficulty // Adaptive mode only requires 2+ difficulty levels
    };

    return res.json({ quiz: quizPayload, questions: parsedQuestions });
  } catch (err) {
    console.error('[Quiz] Fetch quiz error:', err);
    return res.status(500).json({ error: 'Failed to load quiz' });
  }
});

// Create new quiz
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { title, description, is_public, timer_per_question } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Default is PRIVATE, share code generated only when toggled to PUBLIC
    const isPublic = is_public !== undefined ? is_public : false;
    let shareCode = null;
    
    if (isPublic) {
      shareCode = await generateUniqueShareCode();
    }

    // Handle timer - default to 30 if not provided
    const timerValue = timer_per_question !== undefined ? timer_per_question : 30;

    const newQuiz = await Quiz.create({
      title: title.trim(),
      description: description || '',
      created_by: userId,
      is_public: isPublic,
      share_code: shareCode, // Set share code on creation
      timer_per_question: timerValue,
      total_questions: 0,
      total_attempts: 0,
      average_score: 0
    });

    console.log(`[Quiz] Created with share code: ${shareCode}`);

    res.status(201).json({ 
      quiz: newQuiz,
      share_code: shareCode 
    });
  } catch (err) {
    console.error('[Quiz] Create quiz error:', err);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// Generate quiz from notes using AI
router.post('/generate-from-notes', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { noteId, noteContent, noteTitle, quizTitle, questionCount, questionTypes } = req.body;

    const quizQuota = await ensureQuizAvailable(userId);
    if (!quizQuota.allowed) {
      const errorMessage = quizQuota.reason === 'cooldown'
        ? 'AI quiz generation is limited to once every other day.'
        : 'AI quiz generation limit reached.';
      return res.status(429).json({
        error: errorMessage,
        limits: DAILY_AI_LIMITS,
        remaining: quizQuota.remaining,
        nextAvailableOn: quizQuota.nextAvailableOn,
        cooldown: quizQuota.cooldown
      });
    }

    const requestedTypes = Array.isArray(questionTypes)
      ? questionTypes.filter(type => AI_QUIZ_RULES.validTypes.includes(type))
      : AI_QUIZ_RULES.validTypes;

    if (!requestedTypes.length) {
      return res.status(400).json({ error: 'Select at least one valid question type for AI generation.' });
    }

    // Validate inputs
    if (!quizTitle || !quizTitle.trim()) {
      return res.status(400).json({ error: 'Quiz title is required' });
    }

    if (!noteContent || noteContent.trim().length < 50) {
      return res.status(400).json({ 
        error: 'Note content must be at least 50 characters long for AI generation' 
      });
    }

    await ensureContentIsSafe(noteContent, {
      userId,
      feature: 'ai-quiz',
      maxChars: 8000,
      blockMessage: 'Unable to generate a quiz because the provided note content violates our safety policies.'
    });

    // AI-generated quizzes enforce a fixed question count for consistency
    const targetQuestionCount = AI_QUIZ_RULES.requiredQuestionCount;
    if (questionCount && questionCount !== targetQuestionCount) {
      return res.status(400).json({ error: `AI-generated quizzes must have exactly ${targetQuestionCount} questions` });
    }

    let newQuiz = null;

    // Generate questions using OpenAI
    try {
      const openAiApiKey = process.env.OPENAI_API_KEY;
      if (!openAiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Truncate note content to ~2000 chars to keep token count low
      const maxNoteLength = 2000;
      const truncatedContent = noteContent.length > maxNoteLength 
        ? noteContent.substring(0, maxNoteLength) + '...' 
        : noteContent;

      const batchSize = AI_QUIZ_RULES.batchSize || targetQuestionCount;
      const maxGenerationAttempts = 3;
      let normalizedQuestions = null;
      let lastGenerationError = null;

      for (let attempt = 1; attempt <= maxGenerationAttempts; attempt++) {
        try {
          normalizedQuestions = await buildAiQuizQuestions({
            targetQuestionCount,
            truncatedContent,
            openAiApiKey,
            allowedTypes: requestedTypes,
            batchSize
          });
          break;
        } catch (attemptError) {
          lastGenerationError = attemptError;
          console.warn(`[AI] Quiz generation attempt ${attempt} failed: ${attemptError.message}`);
          if (attempt === maxGenerationAttempts) {
            throw attemptError;
          }
        }
      }

      if (!normalizedQuestions || normalizedQuestions.length !== targetQuestionCount) {
        throw lastGenerationError || new Error('Failed to generate AI quiz questions.');
      }

      newQuiz = await Quiz.create({
        title: quizTitle.trim(),
        description: `AI-generated quiz from "${noteTitle}"`,
        created_by: userId,
        is_public: false,
        timer_per_question: 30,
        total_questions: 0,
        total_attempts: 0,
        average_score: 0
      });

      // Create questions in the quiz
      const questions = [];
      for (let i = 0; i < normalizedQuestions.length; i++) {
        const questionData = normalizedQuestions[i];
        const questionType = questionData.type;

        // Assign difficulty tiers that scale with the total question count
        const easyThreshold = Math.max(3, Math.floor(targetQuestionCount * 0.3));
        const hardThreshold = Math.max(easyThreshold + 1, targetQuestionCount - 3);
        let difficulty = 'medium';
        if (i < easyThreshold) {
          difficulty = 'easy';
        } else if (i >= hardThreshold) {
          difficulty = 'hard';
        }

        const correctAnswer = questionData.correctAnswer || null;
        const choicesData = questionData.choices ? JSON.stringify(questionData.choices) : null;
        const matchingPairsData = questionData.matchingPairs ? JSON.stringify(questionData.matchingPairs) : null;

        const questionRecord = await Question.create({
          quiz_id: newQuiz.quiz_id,
          type: questionType,
          question: questionData.question || 'Question',
          question_order: i + 1,
          choices: choicesData,
          correct_answer: correctAnswer,
          answer: questionData.answer || null,
          matching_pairs: matchingPairsData,
          points: 1,
          difficulty: difficulty
        });

        questions.push(questionRecord);
      }

      // Update quiz with question count
      await newQuiz.update({
        total_questions: questions.length
      });

      console.log(`Γ£à AI Quiz created: ${newQuiz.quiz_id} with ${questions.length} questions`);

      const recordResult = await recordQuizUsage(userId);
      if (!recordResult.allowed) {
        const errorMessage = recordResult.reason === 'cooldown'
          ? 'AI quiz generation is limited to once every other day.'
          : 'AI quiz generation limit reached.';
        return res.status(429).json({
          error: errorMessage,
          limits: DAILY_AI_LIMITS,
          remaining: recordResult.remaining,
          nextAvailableOn: recordResult.nextAvailableOn,
          cooldown: recordResult.cooldown
        });
      }

      const usageSnapshot = await getUsageSnapshot(userId);

      // Parse JSON fields in response (same as GET endpoint)
      const parsedQuestions = questions.map(q => {
        const qData = q.toJSON();
        
        // Parse choices
        if (typeof qData.choices === 'string') {
          try {
            qData.choices = JSON.parse(qData.choices);
          } catch (e) {
            qData.choices = null;
          }
        }
        
        // Parse matching_pairs
        if (typeof qData.matching_pairs === 'string') {
          try {
            qData.matching_pairs = JSON.parse(qData.matching_pairs);
          } catch (e) {
            qData.matching_pairs = null;
          }
        }
        
        // Convert matching_pairs from object format to array format if needed
        if (qData.matching_pairs && typeof qData.matching_pairs === 'object' && !Array.isArray(qData.matching_pairs)) {
          qData.matching_pairs = Object.entries(qData.matching_pairs).map(([left, right]) => ({ left, right }));
        } else if (!qData.matching_pairs || !Array.isArray(qData.matching_pairs)) {
          // Ensure matching_pairs is always an array (empty if null/undefined)
          qData.matching_pairs = [];
        }
        
        // Convert to camelCase
        qData.matchingPairs = qData.matching_pairs;
        qData.correctAnswer = qData.correct_answer;
        qData.questionOrder = qData.question_order;
        qData.quizId = qData.quiz_id;
        qData.questionId = qData.question_id;
        
        return qData;
      });

      res.status(201).json({
        quiz: newQuiz,
        questions: parsedQuestions,
        message: `Successfully generated ${parsedQuestions.length} questions`,
        usage: usageSnapshot
      });

    } catch (aiError) {
      // If AI generation fails, delete the quiz and return error
      if (newQuiz) {
        await newQuiz.destroy();
      }
      console.error('Γ¥î AI Generation error:', aiError);
      const errorMessage = aiError.message || 'Failed to generate questions using AI';
      return res.status(400).json({ 
        error: 'Failed to generate quiz with AI',
        details: errorMessage
      });
    }

  } catch (err) {
    if (err instanceof ModerationError) {
      return res.status(err.statusCode).json({
        error: err.message,
        details: err.details
      });
    }
    console.error('Γ¥î Generate from notes error:', err);
    res.status(500).json({ 
      error: 'Failed to generate quiz from notes',
      details: err.message 
    });
  }
});

// Update quiz metadata
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const quizId = req.params.id;
    const { title, description, is_public, timer_per_question } = req.body;

    const quiz = await Quiz.findByPk(quizId);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.created_by !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this quiz' });
    }

    // Only update is_public if explicitly provided
    const updateData = {
      title: title || quiz.title,
      description: description !== undefined ? description : quiz.description,
      updated_at: new Date()
    };
    
    // Only update is_public if it's explicitly passed in the request
    if (is_public !== undefined) {
      updateData.is_public = is_public;
    }
    
    // Update timer if provided
    if (timer_per_question !== undefined) {
      updateData.timer_per_question = timer_per_question;
    }

    await quiz.update(updateData);

    res.json({ quiz });
  } catch (err) {
    console.error('Γ¥î Update quiz error:', err);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// Delete quiz and all questions
router.delete('/:id', requireAuth, async (req, res) => {
  const transaction = await sequelize.transaction(); // Add transaction
  
  try {
    const userId = req.session.userId;
    const quizId = req.params.id;

    const quiz = await Quiz.findByPk(quizId);

    if (!quiz) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.created_by !== userId) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Not authorized to delete this quiz' });
    }

    // Delete in proper order to avoid foreign key issues
    
    // 1. Delete all quiz attempts first
    await QuizAttempt.destroy({ 
      where: { quiz_id: quizId },
      transaction 
    });
    
    // 2. Delete battle participants
    const battles = await QuizBattle.findAll({ 
      where: { quiz_id: quizId },
      transaction 
    });
    
    for (const battle of battles) {
      await BattleParticipant.destroy({ 
        where: { battle_id: battle.battle_id },
        transaction 
      });
    }
    
    // 3. Delete battles
    await QuizBattle.destroy({ 
      where: { quiz_id: quizId },
      transaction 
    });
    
    // 4. Delete questions
    await Question.destroy({ 
      where: { quiz_id: quizId },
      transaction 
    });
    
    // 5. Finally delete quiz
    await quiz.destroy({ transaction });

    await transaction.commit();
    
    console.log(`Γ£à Quiz ${quizId} deleted successfully`);
    res.json({ message: 'Quiz deleted successfully' });
    
  } catch (err) {
    await transaction.rollback();
    console.error('Γ¥î Delete quiz error:', err);
    res.status(500).json({ 
      error: 'Failed to delete quiz',
      details: err.message // Include error details for debugging
    });
  }
});

// Add question to quiz
router.post('/:id/questions', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const quizId = req.params.id;
    const { type, question, question_order, choices, correct_answer, answer, matching_pairs, points, difficulty } = req.body;

    console.log('≡ƒôÑ ADD QUESTION - Received data:', {
      quizId,
      type,
      difficulty,
      question: question?.substring(0, 50)
    });

    const quiz = await Quiz.findByPk(quizId);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.created_by !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if quiz has reached maximum questions limit (150)
    const currentQuestionCount = await Question.count({ where: { quiz_id: quizId } });
    if (currentQuestionCount >= 150) {
      return res.status(400).json({ error: 'Quiz has reached maximum limit of 150 questions' });
    }

    const newQuestion = await Question.create({
      quiz_id: quizId,
      type,
      question,
      question_order: question_order || 1,
      choices: choices || null,
      correct_answer: correct_answer || null,
      answer: answer || null,
      matching_pairs: matching_pairs || null,
      points: points || 1,
      difficulty: difficulty || 'medium' 
    });

    console.log('Γ£à Question created in DB:', {
      id: newQuestion.question_id,
      difficulty: newQuestion.difficulty
    });

    // Update quiz timestamp AND total_questions count
    const questionCount = await Question.count({ where: { quiz_id: quizId } });
    await quiz.update({
      updated_at: new Date(),
      total_questions: questionCount
    });

    res.status(201).json({ question: newQuestion });
  } catch (err) {
    console.error('Γ¥î Add question error:', err);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

// Update existing question
router.put('/:quizId/questions/:questionId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { quizId, questionId } = req.params;

    const quiz = await Quiz.findByPk(quizId);
    if (!quiz || quiz.created_by !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const question = await Question.findOne({
      where: { question_id: questionId, quiz_id: quizId }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.update(req.body);

    // Update quiz updated_at
    await quiz.update({ updated_at: new Date() });

    res.json({ question });
  } catch (err) {
    console.error('Γ¥î Update question error:', err);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Delete question from quiz
router.delete('/:quizId/questions/:questionId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { quizId, questionId } = req.params;

    const quiz = await Quiz.findByPk(quizId);
    if (!quiz || quiz.created_by !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const question = await Question.findOne({
      where: { question_id: questionId, quiz_id: quizId }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.destroy();

    // Update quiz timestamp AND total_questions count
    const questionCount = await Question.count({ where: { quiz_id: quizId } });
    await quiz.update({
      updated_at: new Date(),
      total_questions: questionCount
    });

    res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    console.error('Γ¥î Delete question error:', err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Submit quiz attempt and calculate score
router.post('/:id/attempt', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const quizId = req.params.id;
    const { answers: submittedAnswers, time_spent, adaptiveJourney } = req.body;

    if (!submittedAnswers || !Array.isArray(submittedAnswers)) {
      return res.status(400).json({ error: 'Answers array is required' });
    }

    // Fetch questions with correct answers
    const questions = await Question.findAll({
      where: { quiz_id: quizId },
      order: [['question_order', 'ASC'], ['question_id', 'ASC']]
    });

    if (!questions || questions.length === 0) {
      return res.status(404).json({ error: 'Quiz questions not found' });
    }

    // Calculate score from submitted answers
    const { score, total_questions } = req.body;
    if (typeof score !== 'number' || typeof total_questions !== 'number') {
      return res.status(400).json({ error: 'Score and total_questions are required' });
    }

    // Get quiz to check for original_quiz_id (for shared quiz leaderboard tracking)
    const quiz = await Quiz.findOne({
      where: { quiz_id: quizId },
      attributes: ['quiz_id', 'original_quiz_id']
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const originalQuizId = quiz.original_quiz_id || null;

    // Prepare answers data with adaptive journey if provided
    const answersData = {
      answers: submittedAnswers,
      adaptiveJourney: adaptiveJourney || null
    };

    // Get or create daily stats
    const today = new Date().toISOString().split('T')[0];
    let dailyStats = await UserDailyStat.findOne({
      where: { user_id: userId, last_reset_date: today }
    });

    if (!dailyStats) {
      dailyStats = await UserDailyStat.create({
        user_id: userId,
        notes_created_today: 0,
        quizzes_completed_today: 0,
        planner_updates_today: 0,
        points_earned_today: 0,
        exp_earned_today: 0,
        last_reset_date: today
      });
    }

    // Check if user has reached daily quiz cap
    if (dailyStats.quizzes_completed_today >= QUIZ_CONFIG.points.dailyCap) {
      // Still allow quiz attempt and award EXP (no points though)
      const percentage = total_questions > 0 ? (score / total_questions * 100).toFixed(2) : 0;
      const exp_earned = QUIZ_CONFIG.exp.formula(score, total_questions);
      
      const attempt = await QuizAttempt.create({
        quiz_id: quizId,
        original_quiz_id: originalQuizId,
        user_id: userId,
        score,
        total_questions,
        percentage,
        time_spent: time_spent || '0:00',
        answers: answersData,
        points_earned: 0,
        exp_earned: exp_earned
      });

      // Award EXP to pet (even though points cap reached)
      const petLevelUp = await awardPetExp(userId, exp_earned);

      // Log EXP to daily stats (even though no points)
      await logDailyStats(userId, 'quiz', 0, exp_earned);

      // Get user data for streak
      const user = await User.findByPk(userId, { attributes: ['study_streak'] });
      
      return res.status(200).json({
        attempt,
        points_earned: 0,
        exp_earned: exp_earned,
        petLevelUp,
        dailyCapReached: true,
        message: `${QUIZ_CONFIG.points.capMessage} (Still earned ${exp_earned} EXP!)`,
        study_streak: user?.study_streak || 0
      });
    }

    // Calculate points and EXP with new formulas
    const percentage = total_questions > 0 ? (score / total_questions * 100).toFixed(2) : 0;
    const points_earned = QUIZ_CONFIG.points.formula(score, total_questions);
    const exp_earned = QUIZ_CONFIG.exp.formula(score, total_questions);

    const attempt = await QuizAttempt.create({
      quiz_id: quizId,
      original_quiz_id: originalQuizId,
      user_id: userId,
      score,
      total_questions,
      percentage,
      time_spent: time_spent || '0:00',
      answers: answersData,
      points_earned,
      exp_earned
    });

    // Update streak
    const streak = await updateUserStreak(userId);

    // Award points
    await User.increment('points', {
      by: points_earned,
      where: { user_id: userId }
    });

    // Log daily stats - FIXED: Now uses correct column names
    const updatedStats = await logDailyStats(userId, 'quiz', points_earned, exp_earned);

    // Check achievements
    await checkAchievements(userId);

    // Award EXP to pet
    const petLevelUp = await awardPetExp(userId, exp_earned);

    res.status(201).json({
      attempt,
      points_earned,
      exp_earned,
      petLevelUp,
      study_streak: streak,
      dailyCapReached: false,
      remainingQuizzes: QUIZ_CONFIG.points.dailyCap - updatedStats.quizzes_completed_today,
      message: `Quiz completed! Earned ${points_earned} points and ${exp_earned} EXP!`
    });
  } catch (err) {
    console.error('Γ¥î Submit attempt error:', err);
    res.status(500).json({ error: 'Failed to submit quiz attempt' });
  }
});

// Get user's attempts for a quiz
router.get('/:id/attempts', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const quizId = req.params.id;

    const attempts = await QuizAttempt.findAll({
      where: { quiz_id: quizId, user_id: userId },
      order: [['completed_at', 'DESC']]
    });

    res.json({ attempts });
  } catch (err) {
    console.error('Γ¥î Get attempts error:', err);
    res.status(500).json({ error: 'Failed to fetch attempts' });
  }
});

// Get quiz leaderboard
router.get('/:id/leaderboard', requireAuth, async (req, res) => {
  try {
    const quizId = parseInt(req.params.id);

    // Get ALL attempts for this quiz, sorted by score and time
    const leaderboard = await QuizAttempt.findAll({
      where: { 
        quiz_id: quizId
      },
      include: [{
        model: User,
        as: 'student',
        attributes: ['user_id', 'username', 'profile_picture']
      }],
      order: [
        ['score', 'DESC'],
        ['time_spent', 'ASC'],
        ['completed_at', 'ASC']
      ]
    });

    // Group by user and keep only their best attempt
    const userBestAttempts = new Map();
    leaderboard.forEach(attempt => {
      const userId = attempt.user_id;
      const existing = userBestAttempts.get(userId);
      
      if (!existing) {
        userBestAttempts.set(userId, attempt);
      } else {
        // Compare: higher score wins, or same score with lower time
        const timeExisting = parseInt(existing.time_spent) || 999999;
        const timeCurrent = parseInt(attempt.time_spent) || 999999;
        
        if (attempt.score > existing.score || 
            (attempt.score === existing.score && timeCurrent < timeExisting)) {
          userBestAttempts.set(userId, attempt);
        }
      }
    });

    // Convert to array and sort again
    const uniqueLeaderboard = Array.from(userBestAttempts.values())
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const timeA = parseInt(a.time_spent) || 999999;
        const timeB = parseInt(b.time_spent) || 999999;
        return timeA - timeB;
      })
      .slice(0, 10);

    res.json({ leaderboard: uniqueLeaderboard });
  } catch (err) {
    console.error('Γ¥î Get leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Create new quiz battle (host)
router.post('/:id/battle/create', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const quizId = req.params.id;
    
    // Verify quiz exists and user has access
    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Check if user owns the quiz or if it's public
    if (!quiz.is_public && quiz.created_by !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Generate unique 6-digit PIN
    let gamePin;
    let isUnique = false;
    while (!isUnique) {
      gamePin = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await QuizBattle.findOne({ 
        where: { game_pin: gamePin, status: 'waiting' } 
      });
      if (!existing) isUnique = true;
    }
    
    // Create battle
    const battle = await QuizBattle.create({
      quiz_id: quizId,
      game_pin: gamePin,
      host_id: userId,
      status: 'waiting',
      max_players: 5
    });
    
    // Add host as participant
    const user = await User.findByPk(userId);
    await BattleParticipant.create({
      battle_id: battle.battle_id,
      user_id: userId,
      player_name: user.username,
      player_initial: user.username.charAt(0).toUpperCase(),
      is_ready: false
    });
    
    // Get current player count
    const currentPlayers = await BattleParticipant.count({
      where: { battle_id: battle.battle_id }
    });
    
    res.json({ 
      battle: {
        battle_id: battle.battle_id,
        quiz_id: battle.quiz_id,
        game_pin: battle.game_pin,
        status: battle.status,
        max_players: battle.max_players,
        current_players: currentPlayers
      },
      gamePin 
    });
  } catch (err) {
    console.error('Γ¥î Create battle error:', err);
    res.status(500).json({ error: 'Failed to create battle' });
  }
});

// Join existing battle (player)
router.post('/battle/join', requireAuth, async (req, res) => {
  try {
    const { gamePin } = req.body;
    const userId = req.session.userId;
    
    // Get user info
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find battle
    const battle = await QuizBattle.findOne({
      where: { game_pin: gamePin, status: 'waiting' },
      include: [{
        model: Quiz,
        as: 'quiz',
        attributes: ['quiz_id', 'title', 'total_questions', 'timer_per_question']
      }]
    });
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found or already started' });
    }
    
    // Get current player count
    const currentPlayers = await BattleParticipant.count({
      where: { battle_id: battle.battle_id }
    });
    
    if (currentPlayers >= battle.max_players) {
      return res.status(400).json({ error: 'Battle is full' });
    }
    
    // Check if user already joined
    const existing = await BattleParticipant.findOne({
      where: { 
        battle_id: battle.battle_id, 
        user_id: userId 
      }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'You already joined this battle' });
    }
    
    // Add participant
    const participant = await BattleParticipant.create({
      battle_id: battle.battle_id,
      user_id: userId,
      player_name: user.username,
      player_initial: user.username.charAt(0).toUpperCase(),
      is_ready: false
    });
    
    // Get updated player count
    const updatedPlayerCount = await BattleParticipant.count({
      where: { battle_id: battle.battle_id }
    });
    
    // Get question count dynamically
    const questionCount = await Question.count({ where: { quiz_id: battle.quiz_id } });
    
    res.json({
      battle: {
        battle_id: battle.battle_id,
        quiz_id: battle.quiz_id,
        game_pin: battle.game_pin,
        quiz_title: battle.quiz.title,
        total_questions: questionCount,
        timer_per_question: battle.quiz.timer_per_question,
        status: battle.status,
        current_players: updatedPlayerCount,
        max_players: battle.max_players
      },
      participant: {
        participant_id: participant.participant_id,
        player_name: participant.player_name,
        is_ready: participant.is_ready
      }
    });
  } catch (err) {
    console.error('Γ¥î Join battle error:', err);
    res.status(500).json({ error: 'Failed to join battle' });
  }
});

// Get battle lobby info
router.get('/battle/:gamePin', requireAuth, async (req, res) => {
  try {
    const gamePin = req.params.gamePin;
    
    const battle = await QuizBattle.findOne({
      where: { game_pin: gamePin },
      include: [
        {
          model: Quiz,
          as: 'quiz',
          attributes: ['quiz_id', 'title', 'total_questions', 'timer_per_question']
        },
        {
          model: User,
          as: 'host',
          attributes: ['user_id', 'username']
        }
      ]
    });
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    
    const participants = await BattleParticipant.findAll({
      where: { battle_id: battle.battle_id },
      include: [{
        model: User,
        as: 'player',
        attributes: ['user_id', 'username', 'profile_picture']
      }],
      order: [['joined_at', 'ASC']]
    });
    
    // Get question count dynamically
    const questionCount = await Question.count({ where: { quiz_id: battle.quiz_id } });
    
    // Get current player count
    const currentPlayers = participants.length;
    
    res.json({
      battle: {
        battle_id: battle.battle_id,
        quiz_id: battle.quiz_id,
        game_pin: battle.game_pin,
        quiz_title: battle.quiz.title,
        total_questions: questionCount,
        timer_per_question: battle.quiz.timer_per_question,
        host_id: battle.host_id,
        host_username: battle.host.username,
        status: battle.status,
        current_players: currentPlayers,
        max_players: battle.max_players
      },
      participants: participants.map(p => ({
        participant_id: p.participant_id,
        user_id: p.user_id,
        player_name: p.player_name,
        player_initial: p.player_initial,
        is_ready: p.is_ready,
        profile_picture: p.player?.profile_picture
      }))
    });
  } catch (err) {
    console.error('Γ¥î Get battle error:', err);
    res.status(500).json({ error: 'Failed to get battle info' });
  }
});

// Mark player as ready
router.post('/battle/:gamePin/ready', requireAuth, async (req, res) => {
  try {
    const gamePin = req.params.gamePin;
    const userId = req.session.userId;
    
    const battle = await QuizBattle.findOne({
      where: { game_pin: gamePin }
    });
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    
    const participant = await BattleParticipant.findOne({
      where: { battle_id: battle.battle_id, user_id: userId }
    });
    
    if (!participant) {
      return res.status(404).json({ error: 'You are not in this battle' });
    }
    
    await participant.update({ is_ready: true });
    
    res.json({ message: 'Marked as ready' });
  } catch (err) {
    console.error('Γ¥î Ready error:', err);
    res.status(500).json({ error: 'Failed to mark ready' });
  }
});

// Mark player as unready
router.post('/battle/:gamePin/unready', requireAuth, async (req, res) => {
  try {
    const gamePin = req.params.gamePin;
    const userId = req.session.userId;
    
    const battle = await QuizBattle.findOne({
      where: { game_pin: gamePin }
    });
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    
    const participant = await BattleParticipant.findOne({
      where: { battle_id: battle.battle_id, user_id: userId }
    });
    
    if (!participant) {
      return res.status(404).json({ error: 'You are not in this battle' });
    }
    
    await participant.update({ is_ready: false });
    
    res.json({ message: 'Marked as unready' });
  } catch (err) {
    console.error('❌ Unready error:', err);
    res.status(500).json({ error: 'Failed to mark unready' });
  }
});

// Start battle (host only, with validations)
router.post('/battle/:gamePin/start', requireAuth, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const gamePin = req.params.gamePin;
    const userId = req.session.userId;
    
    console.log(`≡ƒÄ« Start battle request: PIN=${gamePin}, Host=${userId}`);
    
    // ============================================
    // VALIDATION 1: Battle exists
    // ============================================
    const battle = await QuizBattle.findOne({
      where: { game_pin: gamePin },
      include: [{
        model: Quiz,
        as: 'quiz'
      }],
      lock: transaction.LOCK.UPDATE, // Lock row to prevent race conditions
      transaction
    });
    
    if (!battle) {
      await transaction.rollback();
      return res.status(404).json({ 
        error: 'Battle not found',
        errorCode: 'BATTLE_NOT_FOUND'
      });
    }
    
    // ============================================
    // VALIDATION 2: User is the host
    // ============================================
    if (battle.host_id !== userId) {
      await transaction.rollback();
      return res.status(403).json({ 
        error: 'Only the host can start this battle',
        errorCode: 'NOT_HOST',
        hostId: battle.host_id
      });
    }
    
    // ============================================
    // VALIDATION 3: Battle is in waiting status (with idempotency)
    // Handle duplicate start requests gracefully
    // ============================================
    if (battle.status === 'in_progress') {
      // Idempotency: Battle already started, return success
      await transaction.rollback();
      console.log(`ΓÅ¡∩╕Å IDEMPOTENT: Battle ${gamePin} already started`);
      
      const questionCount = await Question.count({ where: { quiz_id: battle.quiz_id } });
      const currentPlayers = await BattleParticipant.count({ where: { battle_id: battle.battle_id } });
      
      return res.status(200).json({ 
        success: true,
        message: 'Battle already started',
        alreadyStarted: true,
        battle: {
          gamePin: battle.game_pin,
          quizTitle: battle.quiz?.title,
          totalQuestions: questionCount,
          playerCount: currentPlayers,
          allPlayersReady: true
        }
      });
    }
    
    if (battle.status !== 'waiting') {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Battle already ${battle.status}`,
        errorCode: 'INVALID_STATUS',
        currentStatus: battle.status
      });
    }
    
    // ============================================
    // VALIDATION 4: Quiz still exists
    // ============================================
    if (!battle.quiz) {
      await transaction.rollback();
      console.error(`Γ¥î Quiz ${battle.quiz_id} was deleted`);
      
      // Mark battle as invalid and cleanup
      await QuizBattle.update(
        { status: 'completed' },
        { where: { battle_id: battle.battle_id } }
      );
      
      return res.status(404).json({ 
        error: 'Quiz no longer exists. Battle cancelled.',
        errorCode: 'QUIZ_DELETED',
        shouldCleanup: true
      });
    }
    
    // ============================================
    // VALIDATION 5: Quiz has questions
    // ============================================
    const questionCount = await Question.count({
      where: { quiz_id: battle.quiz_id },
      transaction
    });
    
    if (questionCount === 0) {
      await transaction.rollback();
      console.error(`Γ¥î Quiz ${battle.quiz_id} has no questions`);
      
      return res.status(400).json({ 
        error: 'Cannot start battle. Quiz has no questions.',
        errorCode: 'NO_QUESTIONS',
        currentCount: 0,
        minimumRequired: 1
      });
    }
    
    console.log(`Γ£à Quiz has ${questionCount} questions`);
    
    // ============================================
    // VALIDATION 6: Minimum player count
    // ============================================
    const currentPlayers = await BattleParticipant.count({
      where: { battle_id: battle.battle_id },
      transaction
    });
    
    const MIN_PLAYERS = 2;
    
    if (currentPlayers < MIN_PLAYERS) {
      await transaction.rollback();
      console.error(`Γ¥î Not enough players: ${currentPlayers}/${MIN_PLAYERS}`);
      
      return res.status(400).json({ 
        error: `Need at least ${MIN_PLAYERS} players to start`,
        errorCode: 'NOT_ENOUGH_PLAYERS',
        currentPlayers,
        minimumRequired: MIN_PLAYERS
      });
    }
    
    console.log(`Γ£à ${currentPlayers} players ready`);
    
    // ============================================
    // VALIDATION 7: Player count doesn't exceed max
    // ============================================
    if (currentPlayers > battle.max_players) {
      await transaction.rollback();
      console.error(`Γ¥î Too many players: ${currentPlayers}/${battle.max_players}`);
      
      return res.status(400).json({ 
        error: 'Player count exceeds maximum',
        errorCode: 'TOO_MANY_PLAYERS',
        currentPlayers,
        maxPlayers: battle.max_players
      });
    }
    
    // ============================================
    // VALIDATION 8: Check player readiness (optional warning)
    // ============================================
    const readyPlayers = await BattleParticipant.count({
      where: { 
        battle_id: battle.battle_id,
        is_ready: true
      },
      transaction
    });
    
    const allReady = readyPlayers === currentPlayers;
    
    if (!allReady) {
      console.warn(`ΓÜá∩╕Å Not all players ready: ${readyPlayers}/${currentPlayers}`);
      // Don't block - just warn
    } else {
      console.log(`Γ£à All ${currentPlayers} players ready`);
    }
    
    // ============================================
    // ALL VALIDATIONS PASSED - START BATTLE
    // ============================================
    await battle.update({
      status: 'in_progress',
      started_at: new Date()
    }, { transaction });
    
    await transaction.commit();
    
    console.log(`≡ƒÄ« Battle ${gamePin} started successfully`);
    console.log(`   Quiz: ${battle.quiz.title}`);
    console.log(`   Players: ${currentPlayers}/${battle.max_players}`);
    console.log(`   Questions: ${questionCount}`);
    
    res.json({ 
      success: true,
      message: 'Battle started successfully',
      battle: {
        gamePin: battle.game_pin,
        quizTitle: battle.quiz.title,
        totalQuestions: questionCount,
        playerCount: currentPlayers,
        allPlayersReady: allReady
      }
    });
    
  } catch (err) {
    await transaction.rollback();
    console.error('Γ¥î Start battle error:', err);
    res.status(500).json({ 
      error: 'Failed to start battle',
      errorCode: 'SERVER_ERROR',
      details: err.message
    });
  }
});

// Diagnostic endpoint: check battle readiness
router.get('/battle/:gamePin/diagnostic', async (req, res) => {
  try {
    const gamePin = req.params.gamePin;
    const userId = req.session?.userId || null; // Optional auth
    
    const battle = await QuizBattle.findOne({
      where: { game_pin: gamePin },
      include: [{
        model: Quiz,
        as: 'quiz'
      }]
    });
    
    if (!battle) {
      return res.json({
        success: false,
        error: 'Battle not found',
        gamePin,
        timestamp: new Date().toISOString()
      });
    }
    
    const questionCount = await Question.count({
      where: { quiz_id: battle.quiz_id }
    });
    
    const currentPlayers = await BattleParticipant.count({
      where: { battle_id: battle.battle_id }
    });
    
    const readyPlayers = await BattleParticipant.count({
      where: { 
        battle_id: battle.battle_id,
        is_ready: true
      }
    });
    
    const participants = await BattleParticipant.findAll({
      where: { battle_id: battle.battle_id },
      include: [{
        model: User,
        as: 'player',
        attributes: ['user_id', 'username']
      }]
    });
    
    const diagnostic = {
      success: true,
      timestamp: new Date().toISOString(),
      userLoggedIn: !!userId,
      currentUserId: userId || null,
      battle: {
        gamePin: battle.game_pin,
        status: battle.status,
        hostId: battle.host_id,
        isUserHost: userId ? (battle.host_id === userId) : null,
        quizId: battle.quiz_id,
        quizExists: !!battle.quiz,
        quizTitle: battle.quiz?.title || 'N/A',
        maxPlayers: battle.max_players
      },
      validation: {
        hasQuiz: !!battle.quiz,
        questionCount: questionCount,
        hasQuestions: questionCount > 0,
        currentPlayers: currentPlayers,
        readyPlayers: readyPlayers,
        allPlayersReady: currentPlayers > 0 && readyPlayers === currentPlayers,
        meetsMinimumPlayers: currentPlayers >= 2,
        isWaitingStatus: battle.status === 'waiting',
        canStart: (
          !!battle.quiz &&
          questionCount > 0 &&
          currentPlayers >= 2 &&
          currentPlayers <= battle.max_players &&
          battle.status === 'waiting' &&
          battle.host_id === userId
        )
      },
      players: participants.map(p => ({
        userId: p.user_id,
        username: p.player?.username || 'Unknown',
        isReady: p.is_ready,
        isHost: p.user_id === battle.host_id
      })),
      recommendations: []
    };
    
    // Add recommendations
    if (!userId) {
      diagnostic.recommendations.push('⚠️ You are not logged in - log in to see full diagnostic');
    }
    if (!diagnostic.battle.quizExists) {
      diagnostic.recommendations.push('❌ Quiz was deleted - battle cannot start');
    }
    if (diagnostic.validation.questionCount === 0) {
      diagnostic.recommendations.push('❌ Quiz has no questions - add questions first');
    }
    if (diagnostic.validation.currentPlayers < 2) {
      diagnostic.recommendations.push(`⚠️ Need at least 2 players (currently ${diagnostic.validation.currentPlayers})`);
    }
    if (!diagnostic.validation.isWaitingStatus) {
      diagnostic.recommendations.push(`⚠️ Battle is already ${battle.status}`);
    }
    if (userId && !diagnostic.battle.isUserHost) {
      diagnostic.recommendations.push('⚠️ Only the host can start this battle');
    }
    if (diagnostic.validation.canStart && userId) {
      diagnostic.recommendations.push('✅ Battle is ready to start!');
    }
    
    return res.json(diagnostic);
    
  } catch (err) {
    console.error('❌ Diagnostic error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to run diagnostic',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Submit battle score
router.post('/battle/:gamePin/submit', requireAuth, async (req, res) => {
  try {
    const gamePin = req.params.gamePin;
    const userId = req.session.userId;
    const { score, timeSpent } = req.body;
    
    const battle = await QuizBattle.findOne({
      where: { game_pin: gamePin }
    });
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }

    const streak = await updateUserStreak(userId);
    
    // Update participant score
    const participant = await BattleParticipant.findOne({
      where: { battle_id: battle.battle_id, user_id: userId }
    });
    
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    
    await participant.update({ score });
    
    res.json({ 
      message: 'Score submitted',
      study_streak: streak
   });
  } catch (err) {
    console.error('Γ¥î Submit score error:', err);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

// Get battle results
router.get('/battle/:gamePin/results', requireAuth, async (req, res) => {
  try {
    const gamePin = req.params.gamePin;
    
    console.log('📊 Getting battle results for PIN:', gamePin);
    
    const battle = await QuizBattle.findOne({
      where: { game_pin: gamePin },
      include: [{
        model: Quiz,
        as: 'quiz',
        attributes: ['title']
      }]
    });
    
    if (!battle) {
      console.error('❌ Battle not found:', gamePin);
      return res.status(404).json({ error: 'Battle not found' });
    }
    
    console.log('✅ Battle found:', {
      battle_id: battle.battle_id,
      status: battle.status,
      is_tied: battle.is_tied
    });
    
    // Get participants - rely ONLY on battle_participants table data
    // Don't depend on User join to avoid null data issues
    const participants = await BattleParticipant.findAll({
      where: { battle_id: battle.battle_id },
      include: [{
        model: User,
        as: 'player',
        attributes: ['user_id', 'username', 'profile_picture'],
        required: false // LEFT JOIN - don't filter out rows if User doesn't exist
      }],
      order: [['score', 'DESC'], ['participant_id', 'ASC']]
    });
    
    console.log('📋 Participants found:', participants.length);
    console.log('📊 Participant details:', participants.map(p => ({
      user_id: p.user_id,
      player_name: p.player_name,
      score: p.score,
      is_winner: p.is_winner,
      has_user_join: !!p.player
    })));
    
    // Use battle_participants data as primary source
    // Only use User join data for profile picture
    const results = participants.map((p, index) => {
      const playerName = p.player_name || `Player ${p.user_id}`;
      const initial = p.player_initial || playerName.charAt(0).toUpperCase();
      
      return {
        rank: index + 1,
        user_id: p.user_id,
        player_name: playerName,
        player_initial: initial,
        username: playerName, // Use player_name as username for display
        profile_picture: p.player ? p.player.profile_picture : null,
        score: p.score || 0,
        is_winner: p.is_winner || false,
        points_earned: p.points_earned || 0,
        exp_earned: p.exp_earned || 0
      };
    });
    
    console.log('✅ Formatted results:', results.map(r => ({
      player_name: r.player_name,
      score: r.score,
      is_winner: r.is_winner
    })));
    
    res.json({
      battle: {
        quiz_title: battle.quiz?.title || 'Quiz Battle',
        status: battle.status,
        is_tied: battle.is_tied || false,
        winner_ids: battle.winner_ids || (battle.winner_id ? [battle.winner_id] : [])
      },
      results: results
    });
  } catch (err) {
    console.error('❌ Get results error:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

// 8. End battle and determine winner (HOST only)
router.post('/battle/:gamePin/end', requireAuth, async (req, res) => {
  try {
    const gamePin = req.params.gamePin;
    const userId = req.session.userId;
    
    const battle = await QuizBattle.findOne({
      where: { game_pin: gamePin }
    });
    
    if (!battle || battle.host_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Find winner (highest score)
    const winner = await BattleParticipant.findOne({
      where: { battle_id: battle.battle_id },
      order: [['score', 'DESC']]
    });
    
    if (!winner) {
      return res.status(404).json({ error: 'No participants found' });
    }
    
    // Calculate points and EXP
    const pointsEarned = 50;
    const expEarned = 100;
    
    // Update battle
    await battle.update({
      status: 'completed',
      winner_id: winner.user_id,
      completed_at: new Date()
    });
    
    // Mark winner
    await winner.update({
      is_winner: true,
      points_earned: pointsEarned,
      exp_earned: expEarned
    });
    
    // Award points/exp to winner
    await User.increment(
      { points: pointsEarned },
      { where: { user_id: winner.user_id } }
    );
    
    res.json({ 
      message: 'Battle ended',
      winner: {
        user_id: winner.user_id,
        player_name: winner.player_name,
        score: winner.score,
        points_earned: pointsEarned,
        exp_earned: expEarned
      }
    });
  } catch (err) {
    console.error('Γ¥î End battle error:', err);
    res.status(500).json({ error: 'Failed to end battle' });
  }
});

// ============================================
// SYNC BATTLE RESULTS FROM FIREBASE TO MYSQL
// ============================================

router.post('/battle/:gamePin/sync-results', requireAuth, async (req, res) => {
  // ΓÜá∩╕Å CRITICAL: Use transaction with explicit rollback
  let transaction;
  
  try {
    const { gamePin } = req.params;
    const { players, winnerId, completedAt } = req.body;
    const userId = req.session.userId;
    
    console.log('≡ƒöä MySQL Sync Request - PIN:', gamePin);
    console.log('≡ƒôè Players:', JSON.stringify(players, null, 2));
    console.log('≡ƒÅå Winner:', winnerId);
    console.log('≡ƒæñ Requester:', userId);
    console.log('≡ƒôà CompletedAt:', completedAt);
    
    // ============================================
    // VALIDATION
    // ============================================
    
    if (!players || !Array.isArray(players) || players.length === 0) {
      console.error('Γ¥î Invalid players data:', players);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid players data' 
      });
    }
    
    // ============================================
    // FIND TIED WINNERS (highest score)
    // ============================================
    
    const maxScore = Math.max(...players.map(p => p.score));
    const winners = players.filter(p => p.score === maxScore);
    const winnerIds = winners.map(w => w.userId);
    
    console.log('≡ƒöì Max score:', maxScore);
    console.log('≡ƒÅå Winners (tied or single):', winnerIds);
    console.log(`≡ƒÄ» ${winners.length} winner(s) with ${maxScore} points`);
    
    // ============================================
    // Handle all-forfeit scenario
    // ============================================
    const allForfeited = maxScore === 0;
    if (allForfeited) {
      console.log('ΓÜá∩╕Å All players forfeited (score = 0), no winner will be declared');
    }
    
    // ============================================
    // START TRANSACTION
    // ============================================
    
    transaction = await sequelize.transaction();
    
    console.log('≡ƒöÆ Transaction started');
    
    // ============================================
    // 1. FIND & LOCK BATTLE ROW
    // ============================================
    
    const battle = await QuizBattle.findOne({ 
      where: { game_pin: gamePin },
      lock: transaction.LOCK.UPDATE, // Row-level lock
      transaction 
    });
    
    if (!battle) {
      await transaction.rollback();
      console.error('Γ¥î Battle not found:', gamePin);
      return res.status(404).json({ 
        success: false,
        error: 'Battle not found in database' 
      });
    }
    
    console.log('Γ£à Battle found and locked:', battle.battle_id);
    
    // ============================================
    // 2. IDEMPOTENCY: CHECK IF ALREADY SYNCED (IMMEDIATELY AFTER LOCK)
    // Check status IMMEDIATELY after acquiring lock
    // This prevents race condition where multiple hosts spam "View Results"
    // ============================================
    
    if (battle.status === 'completed') {
      // Battle already synced - return success (idempotent)
      await transaction.rollback();
      console.log('ΓÅ¡∩╕Å IDEMPOTENT: Battle already synced:', gamePin);
      
      const totalPlayers = await BattleParticipant.count({
        where: { battle_id: battle.battle_id }
      });
      
      return res.status(200).json({ 
        success: true,
        message: 'Battle already synced',
        alreadySynced: true,
        battleId: battle.battle_id,
        winnerId: battle.winner_id,
        winnerIds: battle.winner_ids || [battle.winner_id],
        isTied: battle.is_tied || false,
        totalPlayers: totalPlayers
      });
    }
    
    // ============================================
    // 3. SECURITY: VERIFY REQUESTER IS HOST
    // ============================================
    
    if (battle.host_id !== userId) {
      await transaction.rollback();
      console.error('Γ¥î Non-host sync attempt. Host:', battle.host_id, 'Requester:', userId);
      return res.status(403).json({ 
        success: false,
        error: 'Only host can sync results' 
      });
    }
    
    // ============================================
    // 4. UPDATE BATTLE STATUS WITH TIE SUPPORT
    // Handle all-forfeit edge case
    // ============================================
    
    // Handle all-forfeit scenario
    if (allForfeited) {
      await battle.update({
        status: 'completed',
        winner_id: null,
        winner_ids: [],
        is_tied: false,
        completed_at: completedAt || new Date()
      }, { transaction });
      
      console.log('ΓÜá∩╕Å Battle ended with no winner (all forfeited)');
      
      // Update all participants without awarding winner status
      for (const player of players) {
        await BattleParticipant.update(
          { 
            score: 0,
            points_earned: 0,
            exp_earned: 0,
            is_winner: false
          },
          { 
            where: { 
              battle_id: battle.battle_id, 
              user_id: player.userId 
            },
            transaction 
          }
        );
      }
      
      await transaction.commit();
      
      return res.json({
        success: true,
        message: 'Battle completed with no winner (all forfeited)',
        noWinner: true,
        battleId: battle.battle_id
      });
    }
    
    // Determine if there's a tie
    const isTied = winnerIds.length > 1;
    const primaryWinnerId = winnerIds[0]; // Primary winner for legacy compatibility
    
    // Store ALL winner IDs for proper tie handling
    await battle.update({
      status: 'completed',
      winner_id: primaryWinnerId, // Legacy field - stores first winner
      winner_ids: winnerIds, // NEW: Store all tied winner IDs
      is_tied: isTied, // NEW: Flag for tied battles
      completed_at: completedAt || new Date()
    }, { transaction });
    
    if (isTied) {
      console.log(`≡ƒñ¥ TIE DETECTED: ${winnerIds.length} winners with ${maxScore} points each`);
      console.log(`   Winner IDs: ${winnerIds.join(', ')}`);
    } else {
      console.log(`Γ£à Battle completed with single winner: ${primaryWinnerId}`);
    }
    
    // ============================================
    // 5. UPDATE PARTICIPANTS & AWARD POINTS
    // ============================================
    
    let updatedCount = 0;
    const updateErrors = [];
    
    for (const player of players) {
      try {
        const pointsEarned = player.score * 10;
        const expEarned = player.score * 5;
        const isWinner = winnerIds.includes(player.userId);
        
        console.log(`≡ƒô¥ Updating player ${player.userId}: score=${player.score}, points=${pointsEarned}, isWinner=${isWinner}`);
        console.log(`   Player data from Firebase:`, JSON.stringify(player));
        
        // DEBUG: Check what participants exist in database
        const existingParticipants = await BattleParticipant.findAll({
          where: { battle_id: battle.battle_id },
          attributes: ['user_id', 'player_name'],
          transaction
        });
        console.log(`   Existing participants in DB:`, existingParticipants.map(p => ({ user_id: p.user_id, user_id_type: typeof p.user_id, name: p.player_name })));
        
        // Ensure userId is a number
        const numericUserId = parseInt(player.userId, 10);
        console.log(`   Converting userId: ${player.userId} (${typeof player.userId}) -> ${numericUserId} (${typeof numericUserId})`);
        
        // First, check if participant exists
        const participantExists = await BattleParticipant.findOne({
          where: { 
            battle_id: battle.battle_id, 
            user_id: numericUserId 
          },
          transaction
        });
        
        console.log(`   🔍 Participant exists check:`, participantExists ? 
          `Yes (participant_id: ${participantExists.participant_id}, score: ${participantExists.score})` : 
          'NO - PARTICIPANT NOT FOUND!');
        
        if (!participantExists) {
          console.error('❌ CRITICAL: Participant does not exist in database!');
          console.error('   battle_id:', battle.battle_id, 'user_id:', numericUserId);
          updateErrors.push(`Player ${numericUserId} does not exist in battle ${battle.battle_id}`);
          continue;
        }
        
        // Update participant record
        const [updateCount] = await BattleParticipant.update(
          { 
            score: player.score,
            points_earned: pointsEarned,
            exp_earned: expEarned,
            is_winner: isWinner // All tied winners get is_winner=true
          },
          { 
            where: { 
              battle_id: battle.battle_id, 
              user_id: numericUserId 
            },
            transaction 
          }
        );
        
        if (updateCount === 0) {
          // If update returns 0, check if values are the same (normal for score=0)
          if (participantExists.score === player.score && 
              participantExists.points_earned === pointsEarned &&
              participantExists.is_winner === isWinner) {
            console.log(`ℹ️ Player ${numericUserId} values unchanged (score=${player.score}, already up to date)`);
          } else {
            console.warn('⚠️❌ Update returned 0 rows for user:', numericUserId);
            console.warn('   But findOne found participant! This should not happen.');
            updateErrors.push(`Player ${player.userId} update failed mysteriously`);
            continue;
          }
        }
        
        updatedCount++;
        
        // Award points to user account
        await User.increment('points', {
          by: pointsEarned,
          where: { user_id: numericUserId },
          transaction
        });
        
        // Award achievements for ALL tied winners
        if (isWinner) {
          console.log(`🏆 Player ${numericUserId} is a winner (tied: ${isTied})`);
        }
        
        console.log(`✅ Updated player ${numericUserId}`);
        
      } catch (playerError) {
        console.error(`❌ Error updating player ${player.userId}:`, playerError);
        updateErrors.push(`Failed to update player ${player.userId}: ${playerError.message}`);
        
        // If any player fails, rollback entire transaction
        throw playerError;
      }
    }
    
    // ============================================
    // 6. VERIFY ALL PLAYERS UPDATED
    // ============================================
    
    if (updatedCount !== players.length) {
      await transaction.rollback();
      console.error(`Γ¥î Player update mismatch: ${updatedCount}/${players.length}`);
      return res.status(500).json({
        success: false,
        error: `Only ${updatedCount}/${players.length} players updated`,
        details: updateErrors
      });
    }
    
    // ============================================
    // 7. COMMIT TRANSACTION
    // ============================================
    
    await transaction.commit();
    console.log('Γ£à Transaction committed successfully');
    console.log(`≡ƒÄ» Final summary: ${winnerIds.length} winner(s), ${updatedCount} players updated`);
    
    // ============================================
    // 8. CHECK ACHIEVEMENTS FOR ALL PARTICIPANTS
    // ============================================
    
    // Check achievements for all participants (points + battles_won)
    // All tied winners should get "battles_won" achievements
    for (const player of players) {
      try {
        const numericUserId = parseInt(player.userId, 10);
        await checkAchievements(numericUserId);
        
        const isWinner = winnerIds.includes(player.userId);
        if (isWinner) {
          // Checking achievements for winner
        }
      } catch (achievementError) {
        console.error(`Error checking achievements for user ${player.userId}:`, achievementError);
        // Don't fail the request if achievement check fails
      }
    }
    
    // ============================================
    // 9. SUCCESS RESPONSE
    // ============================================
    
    return res.json({ 
      success: true,
      message: isTied 
        ? `Battle completed with ${winnerIds.length}-way tie!` 
        : 'Battle results synced successfully',
      battleId: battle.battle_id,
      winnerId: primaryWinnerId, // Legacy field
      winnerIds: winnerIds, // All tied winners
      totalPlayers: players.length,
      updatedPlayers: updatedCount,
      isTied: isTied,
      maxScore: maxScore,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    // ============================================
    // ROLLBACK ON ANY ERROR
    // ============================================
    
    if (transaction) {
      try {
        await transaction.rollback();
        console.log('≡ƒöÖ Transaction rolled back');
      } catch (rollbackError) {
        console.error('Γ¥î Rollback failed:', rollbackError);
        console.error('Γ¥î Rollback error stack:', rollbackError.stack);
      }
    }
    
    console.error('Γ¥î Sync error:', error);
    console.error('Γ¥î Sync error message:', error.message);
    console.error('Γ¥î Sync error stack:', error.stack);
    console.error('Γ¥î Sync error name:', error.name);
    
    return res.status(500).json({ 
      success: false,
      error: 'Failed to sync battle results',
      details: error.message,
      errorType: error.name 
    });
  }
});

// ============================================
// VERIFY SYNC STATUS (for debugging)
// ============================================

router.get('/battle/:gamePin/verify-sync', requireAuth, async (req, res) => {
  try {
    const { gamePin } = req.params;
    
    const battle = await QuizBattle.findOne({
      where: { game_pin: gamePin },
      include: [
        {
          model: BattleParticipant,
          as: 'participants',
          include: [{
            model: User,
            as: 'player',
            attributes: ['username']
          }]
        }
      ]
    });
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    
    res.json({
      battleId: battle.battle_id,
      status: battle.status,
      winnerId: battle.winner_id,
      completedAt: battle.completed_at,
      participants: battle.participants.map(p => ({
        userId: p.user_id,
        username: p.player.username,
        score: p.score,
        pointsEarned: p.points_earned,
        isWinner: p.is_winner
      }))
    });
  } catch (error) {
    console.error('Γ¥î Verify sync error:', error);
    res.status(500).json({ error: 'Failed to verify sync' });
  }
});


// ============================================
// QUIZ SHARING ROUTES
// ============================================

// Toggle quiz public/private status WITHOUT regenerating share code
router.post('/:id/toggle-public', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const quizId = req.params.id;
    const { is_public } = req.body;

    const quiz = await Quiz.findByPk(quizId);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.created_by !== userId) {
      return res.status(403).json({ error: 'Not authorized to modify this quiz' });
    }

    // Only generate share code if:
    // 1. Making public AND
    // 2. No share code exists yet
    let shareCode = quiz.share_code;
    
    if (is_public && !shareCode) {
      console.log('≡ƒöæ Generating NEW share code for quiz:', quizId);
      shareCode = await generateUniqueShareCode();
    } else if (is_public && shareCode) {
      console.log('ΓÖ╗∩╕Å Reusing existing share code:', shareCode);
    } else {
      console.log('≡ƒöÆ Making quiz private, keeping share code:', shareCode);
    }

    // Update quiz
    await quiz.update({
      is_public,
      share_code: shareCode, // Always save the share code (new or existing)
      updated_at: new Date()
    });

    console.log(`Γ£à Quiz ${quizId} updated: public=${is_public}, code=${shareCode}`);

    res.json({ 
      quiz,
      share_code: is_public ? shareCode : null // Only return code if public
    });
  } catch (err) {
    console.error('Γ¥î Toggle public error:', err);
    res.status(500).json({ error: 'Failed to update quiz sharing status' });
  }
});

// Import quiz via share code
router.post('/import', requireAuth, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.session.userId;
    const { share_code } = req.body;

    if (!share_code || share_code.length !== 6) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid share code. Please enter a 6-digit code.' });
    }

    console.log('≡ƒöì Looking for quiz with share code:', share_code);

    // Find the quiz with this share code
    const originalQuiz = await Quiz.findOne({
      where: { 
        share_code: share_code.trim(),
        is_public: true 
      },
      include: [{
        model: User,
        as: 'creator',
        attributes: ['username']
      }],
      transaction
    });

    if (!originalQuiz) {
      await transaction.rollback();
      console.log('Γ¥î Quiz not found for code:', share_code);
      return res.status(404).json({ 
        error: 'Quiz not found. Make sure the code is correct and the quiz is public.' 
      });
    }

    console.log('Γ£à Found quiz:', originalQuiz.title, 'by', originalQuiz.creator.username);

    // Don't allow importing your own quiz
    if (originalQuiz.created_by === userId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'You cannot import your own quiz' });
    }

    // Check if user already imported this quiz
    const existingImport = await Quiz.findOne({
      where: {
        created_by: userId,
        original_quiz_id: originalQuiz.quiz_id
      },
      transaction
    });

    if (existingImport) {
      await transaction.rollback();
      return res.status(400).json({ error: 'You already imported this quiz' });
    }

    console.log('≡ƒôª Creating imported quiz copy...');

    // Create a copy of the quiz for this user
    const importedQuiz = await Quiz.create({
      title: originalQuiz.title,
      description: originalQuiz.description,
      created_by: userId,
      is_public: false, // Imported quizzes start as private
      share_code: null, // Don't copy the share code
      original_quiz_id: originalQuiz.quiz_id,
      shared_by_username: originalQuiz.creator.username,
      total_questions: 0,
      total_attempts: 0,
      average_score: 0
    }, { transaction });

    // Copy all questions from original quiz
    const originalQuestions = await Question.findAll({
      where: { quiz_id: originalQuiz.quiz_id },
      order: [['question_order', 'ASC']],
      transaction
    });

    console.log(`≡ƒô¥ Copying ${originalQuestions.length} questions...`);

    for (const originalQuestion of originalQuestions) {
      await Question.create({
        quiz_id: importedQuiz.quiz_id,
        type: originalQuestion.type,
        question: originalQuestion.question,
        question_order: originalQuestion.question_order,
        choices: originalQuestion.choices,
        correct_answer: originalQuestion.correct_answer,
        answer: originalQuestion.answer,
        matching_pairs: originalQuestion.matching_pairs,
        points: originalQuestion.points,
        difficulty: originalQuestion.difficulty
      }, { transaction });
    }

    // Update total_questions count
    await importedQuiz.update({
      total_questions: originalQuestions.length
    }, { transaction });

    await transaction.commit();

    console.log(`Γ£à Quiz "${originalQuiz.title}" imported successfully by user ${userId}`);
    
    res.json({ 
      message: 'Quiz imported successfully',
      quiz: importedQuiz
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Γ¥î Import quiz error:', err);
    res.status(500).json({ error: 'Failed to import quiz' });
  }
});

// Backfill share codes for existing public quizzes
router.post('/admin/backfill-share-codes', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Only allow for development/admin - you can add admin check here
    
    // Find all public quizzes without share codes
    const quizzes = await Quiz.findAll({
      where: {
        is_public: true,
        share_code: null
      }
    });
    
    console.log(`≡ƒöº Found ${quizzes.length} public quizzes without share codes`);
    
    let updated = 0;
    for (const quiz of quizzes) {
      try {
        const shareCode = await generateUniqueShareCode();
        await quiz.update({ share_code: shareCode });
        console.log(`Γ£à Added share code ${shareCode} to quiz ${quiz.quiz_id}`);
        updated++;
      } catch (err) {
        console.error(`Γ¥î Failed to update quiz ${quiz.quiz_id}:`, err);
      }
    }
    
    res.json({
      message: 'Share codes backfilled',
      total: quizzes.length,
      updated: updated
    });
  } catch (err) {
    console.error('Γ¥î Backfill error:', err);
    res.status(500).json({ error: 'Failed to backfill share codes' });
  }
});

export default router;
