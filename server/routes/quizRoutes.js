import express from 'express';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import QuizAttempt from '../models/QuizAttempt.js';
import User from '../models/User.js';
import UserDailyStat from '../models/UserDailyStat.js';
import QuizBattle from '../models/QuizBattle.js';
import BattleParticipant from '../models/BattleParticipant.js';
import sequelize from '../db.js';

const router = express.Router();

// ============================================
// CONFIGURATION (Pet Buddy)
// ============================================

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

// ============================================
// HELPER FUNCTIONS
// ============================================

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
};

async function checkAndResetDailyCaps(userId) {
  const user = await User.findByPk(userId);
  const today = new Date().toISOString().split('T')[0];
  
  if (!user.daily_reset_date || user.daily_reset_date !== today) {
    await user.update({
      daily_notes_count: 0,
      daily_quizzes_count: 0,
      daily_tasks_count: 0,
      daily_reset_date: today
    });
  }
  
  return user;
}

async function logDailyStats(userId, activityType, points, exp) {
  const today = new Date().toISOString().split('T')[0];
  
  let dailyStat = await UserDailyStat.findOne({
    where: { user_id: userId, last_reset_date: today } // FIXED: Changed from stat_date to last_reset_date
  });
  
  if (!dailyStat) {
    dailyStat = await UserDailyStat.create({
      user_id: userId,
      last_reset_date: today, // FIXED: Changed from stat_date to last_reset_date
      notes_created_today: 0, // FIXED: Match actual column names
      quizzes_completed_today: 0,
      planner_updates_today: 0,
      points_earned_today: 0,
      exp_earned_today: 0,
      streak_active: false
    });
  }
  
  const updates = {
    points_earned_today: dailyStat.points_earned_today + points, // FIXED: Updated column name
    exp_earned_today: dailyStat.exp_earned_today + exp // FIXED: Updated column name
  };
  
  if (activityType === 'quiz') {
    updates.quizzes_completed_today = dailyStat.quizzes_completed_today + 1; // FIXED: Updated column name
  }
  
  await dailyStat.update(updates);
  return dailyStat;
}

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

async function checkAchievements(userId) {
  try {
    const { checkAndUnlockAchievements } = await import('../services/achievementService.js');
    return await checkAndUnlockAchievements(userId);
  } catch (err) {
    console.log('Achievement service not available');
    return [];
  }
}

async function awardPetExp(userId, expAmount) {
  try {
    // Load PetCompanion model dynamically
    const { PetCompanion } = await import('../models/PetCompanion.js');
    
    const pet = await PetCompanion.findOne({ where: { user_id: userId } });
    
    if (!pet) {
      return null; // No pet adopted
    }
    
    const currentExp = pet.experience || 0;
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
      experience: newExp,
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

// ============================================
// HELPER: Generate unique share code
// ============================================
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

    res.json({ quizzes });
  } catch (err) {
    console.error('❌ Get quizzes error:', err);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Get single quiz with questions
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const quizId = req.params.id;

    const quiz = await Quiz.findByPk(quizId, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['username']
      }]
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // ACCESS CHECK
    const userId = req.session.userId;
    const isOwner = quiz.created_by === userId;
    const isPublic = quiz.is_public;
    
    // Check if user is in an active battle with this quiz
    const activeBattle = await BattleParticipant.findOne({
      include: [{
        model: QuizBattle,
        as: 'battle',
        where: {
          quiz_id: quizId,
          status: ['waiting', 'in_progress'] // Active battles only
        }
      }],
      where: { user_id: userId }
    });
    
    const isInBattle = !!activeBattle;
    
    // Allow access if: owner OR public OR in active battle
    if (!isOwner && !isPublic && !isInBattle) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const questions = await Question.findAll({
      where: { quiz_id: quizId },
      order: [['question_order', 'ASC']]
    });

    // PARSE JSON FIELDS BEFORE SENDING
    const parsedQuestions = questions.map(q => {
      const questionData = q.toJSON();
      
      // Parse choices if it's a string
      if (typeof questionData.choices === 'string') {
        try {
          questionData.choices = JSON.parse(questionData.choices);
        } catch (e) {
          questionData.choices = null;
        }
      }

      // Parse matching_pairs if it's a string
      if (typeof questionData.matching_pairs === 'string') {
        try {
          questionData.matching_pairs = JSON.parse(questionData.matching_pairs);
        } catch (e) {
          questionData.matching_pairs = null;
        }
      }

      return questionData;
    });

    res.json({
      quiz,
      questions: parsedQuestions // always returns arrays
    });
  } catch (err) {
    console.error('❌ Get quiz error:', err);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

// Create new quiz
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { title, description, is_public } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // ✅ FIX: Default is PRIVATE, share code generated only when toggled to PUBLIC
    const isPublic = is_public !== undefined ? is_public : false;
    let shareCode = null;
    
    if (isPublic) {
      shareCode = await generateUniqueShareCode();
    }

    const newQuiz = await Quiz.create({
      title: title.trim(),
      description: description || '',
      created_by: userId,
      is_public: isPublic,
      share_code: shareCode, // ✅ Set share code on creation
      total_questions: 0,
      total_attempts: 0,
      average_score: 0
    });

    console.log(`✅ Quiz created with share code: ${shareCode}`);

    res.status(201).json({ 
      quiz: newQuiz,
      share_code: shareCode 
    });
  } catch (err) {
    console.error('❌ Create quiz error:', err);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// Update quiz
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const quizId = req.params.id;
    const { title, description, is_public } = req.body;

    const quiz = await Quiz.findByPk(quizId);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.created_by !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this quiz' });
    }

    // ✅ Only update is_public if explicitly provided
    const updateData = {
      title: title || quiz.title,
      description: description !== undefined ? description : quiz.description,
      updated_at: new Date()
    };
    
    // Only update is_public if it's explicitly passed in the request
    if (is_public !== undefined) {
      updateData.is_public = is_public;
    }
    
    await quiz.update(updateData);

    res.json({ quiz });
  } catch (err) {
    console.error('❌ Update quiz error:', err);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// Delete quiz
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
    
    console.log(`✅ Quiz ${quizId} deleted successfully`);
    res.json({ message: 'Quiz deleted successfully' });
    
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Delete quiz error:', err);
    res.status(500).json({ 
      error: 'Failed to delete quiz',
      details: err.message // Include error details for debugging
    });
  }
});

// ============================================
// QUESTION ROUTES
// ============================================

// Add question to quiz
router.post('/:id/questions', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const quizId = req.params.id;
    const { type, question, question_order, choices, correct_answer, answer, matching_pairs, points } = req.body;

    const quiz = await Quiz.findByPk(quizId);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.created_by !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
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
      points: points || 1
    });

    // Update quiz total_questions count
    await quiz.update({
      total_questions: quiz.total_questions + 1,
      updated_at: new Date()
    });

    res.status(201).json({ question: newQuestion });
  } catch (err) {
    console.error('❌ Add question error:', err);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

// Update question
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
    console.error('❌ Update question error:', err);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Delete question
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

    // Update quiz total_questions count
    await quiz.update({
      total_questions: Math.max(0, quiz.total_questions - 1),
      updated_at: new Date()
    });

    res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    console.error('❌ Delete question error:', err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// ============================================
// QUIZ ATTEMPT ROUTES (WITH DAILY CAPS)
// ============================================

router.post('/:id/attempt', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const quizId = req.params.id;
    const { score, total_questions, time_spent, answers } = req.body;

    if (score === undefined || total_questions === undefined) {
      return res.status(400).json({ error: 'Score and total_questions are required' });
    }

    // Check and reset daily caps
    const user = await checkAndResetDailyCaps(userId);

    // Check if user has reached daily quiz cap
    if (user.daily_quizzes_count >= QUIZ_CONFIG.points.dailyCap) {
      // Still allow quiz attempt and award EXP (no points though)
      const percentage = total_questions > 0 ? (score / total_questions * 100).toFixed(2) : 0;
      const exp_earned = QUIZ_CONFIG.exp.formula(score, total_questions);
      
      const attempt = await QuizAttempt.create({
        quiz_id: quizId,
        user_id: userId,
        score,
        total_questions,
        percentage,
        time_spent: time_spent || '0:00',
        answers: answers || null,
        points_earned: 0,
        exp_earned: exp_earned
      });

      // Award EXP to pet (even though points cap reached)
      const petLevelUp = await awardPetExp(userId, exp_earned);

      // Update quiz stats
      const quiz = await Quiz.findByPk(quizId);
      if (quiz) {
        const newTotalAttempts = quiz.total_attempts + 1;
        const newAverageScore = (
          (quiz.average_score * quiz.total_attempts + parseFloat(percentage)) / newTotalAttempts
        ).toFixed(2);

        await quiz.update({
          total_attempts: newTotalAttempts,
          average_score: newAverageScore
        });
      }

      return res.status(200).json({
        attempt,
        points_earned: 0,
        exp_earned: exp_earned,
        petLevelUp,
        dailyCapReached: true,
        message: `${QUIZ_CONFIG.points.capMessage} (Still earned ${exp_earned} EXP!)`,
        study_streak: user.study_streak
      });
    }

    // Calculate points and EXP with new formulas
    const percentage = total_questions > 0 ? (score / total_questions * 100).toFixed(2) : 0;
    const points_earned = QUIZ_CONFIG.points.formula(score, total_questions);
    const exp_earned = QUIZ_CONFIG.exp.formula(score, total_questions);

    const attempt = await QuizAttempt.create({
      quiz_id: quizId,
      user_id: userId,
      score,
      total_questions,
      percentage,
      time_spent: time_spent || '0:00',
      answers: answers || null,
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

    // Increment daily quiz count
    await user.increment('daily_quizzes_count');

    // Log daily stats - FIXED: Now uses correct column names
    await logDailyStats(userId, 'quiz', points_earned, exp_earned);

    // Update quiz statistics
    const quiz = await Quiz.findByPk(quizId);
    if (quiz) {
      const newTotalAttempts = quiz.total_attempts + 1;
      const newAverageScore = (
        (quiz.average_score * quiz.total_attempts + parseFloat(percentage)) / newTotalAttempts
      ).toFixed(2);

      await quiz.update({
        total_attempts: newTotalAttempts,
        average_score: newAverageScore
      });
    }

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
      remainingQuizzes: QUIZ_CONFIG.points.dailyCap - user.daily_quizzes_count - 1,
      message: `Quiz completed! Earned ${points_earned} points and ${exp_earned} EXP!`
    });
  } catch (err) {
    console.error('❌ Submit attempt error:', err);
    res.status(500).json({ error: 'Failed to submit quiz attempt' });
  }
});

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
    console.error('❌ Get attempts error:', err);
    res.status(500).json({ error: 'Failed to fetch attempts' });
  }
});

router.get('/:id/leaderboard', requireAuth, async (req, res) => {
  try {
    const quizId = req.params.id;

    const leaderboard = await QuizAttempt.findAll({
      where: { quiz_id: quizId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'profile_picture']
      }],
      order: [
        ['score', 'DESC'],
        ['time_spent', 'ASC']
      ],
      limit: 10
    });

    res.json({ leaderboard });
  } catch (err) {
    console.error('❌ Get leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ============================================
// QUIZ BATTLE ROUTES
// ============================================

// 1. Create new battle (HOST)
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
      max_players: 5, 
      current_players: 1
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
    
    res.json({ 
      battle: {
        battle_id: battle.battle_id,
        quiz_id: battle.quiz_id,
        game_pin: battle.game_pin,
        status: battle.status,
        max_players: battle.max_players,
        current_players: battle.current_players
      },
      gamePin 
    });
  } catch (err) {
    console.error('❌ Create battle error:', err);
    res.status(500).json({ error: 'Failed to create battle' });
  }
});

// 2. Join battle (PLAYER)
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
        attributes: ['quiz_id', 'title', 'total_questions']
      }]
    });
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found or already started' });
    }
    
    if (battle.current_players >= battle.max_players) {
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
    
    // Update player count
    await battle.update({
      current_players: battle.current_players + 1
    });
    
    res.json({ 
      battle: {
        battle_id: battle.battle_id,
        quiz_id: battle.quiz_id,
        game_pin: battle.game_pin,
        quiz_title: battle.quiz.title,
        total_questions: battle.quiz.total_questions,
        status: battle.status,
        current_players: battle.current_players,
        max_players: battle.max_players
      },
      participant: {
        participant_id: participant.participant_id,
        player_name: participant.player_name,
        is_ready: participant.is_ready
      }
    });
  } catch (err) {
    console.error('❌ Join battle error:', err);
    res.status(500).json({ error: 'Failed to join battle' });
  }
});

// 3. Get battle lobby info
router.get('/battle/:gamePin', requireAuth, async (req, res) => {
  try {
    const gamePin = req.params.gamePin;
    
    const battle = await QuizBattle.findOne({
      where: { game_pin: gamePin },
      include: [
        {
          model: Quiz,
          as: 'quiz',
          attributes: ['quiz_id', 'title', 'total_questions']
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
        as: 'user',
        attributes: ['user_id', 'username', 'profile_picture']
      }],
      order: [['joined_at', 'ASC']]
    });
    
    res.json({ 
      battle: {
        battle_id: battle.battle_id,
        quiz_id: battle.quiz_id,
        game_pin: battle.game_pin,
        quiz_title: battle.quiz.title,
        total_questions: battle.quiz.total_questions,
        host_id: battle.host_id,
        host_username: battle.host.username,
        status: battle.status,
        current_players: battle.current_players,
        max_players: battle.max_players
      },
      participants: participants.map(p => ({
        participant_id: p.participant_id,
        user_id: p.user_id,
        player_name: p.player_name,
        player_initial: p.player_initial,
        is_ready: p.is_ready,
        profile_picture: p.user?.profile_picture
      }))
    });
  } catch (err) {
    console.error('❌ Get battle error:', err);
    res.status(500).json({ error: 'Failed to get battle info' });
  }
});

// 4. Mark player as ready
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
    console.error('❌ Ready error:', err);
    res.status(500).json({ error: 'Failed to mark ready' });
  }
});

// 5. Start battle (HOST only)
router.post('/battle/:gamePin/start', requireAuth, async (req, res) => {
  try {
    const gamePin = req.params.gamePin;
    const userId = req.session.userId;
    
    const battle = await QuizBattle.findOne({
      where: { game_pin: gamePin }
    });
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    
    if (battle.host_id !== userId) {
      return res.status(403).json({ error: 'Only host can start battle' });
    }
    
    await battle.update({
      status: 'in_progress',
      started_at: new Date()
    });
    
    res.json({ message: 'Battle started' });
  } catch (err) {
    console.error('❌ Start battle error:', err);
    res.status(500).json({ error: 'Failed to start battle' });
  }
});

// 6. Submit battle score
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
    console.error('❌ Submit score error:', err);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

// 7. Get battle results
router.get('/battle/:gamePin/results', requireAuth, async (req, res) => {
  try {
    const gamePin = req.params.gamePin;
    
    const battle = await QuizBattle.findOne({
      where: { game_pin: gamePin },
      include: [{
        model: Quiz,
        as: 'quiz',
        attributes: ['title']
      }]
    });
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    
    const participants = await BattleParticipant.findAll({
      where: { battle_id: battle.battle_id },
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'profile_picture']
      }],
      order: [['score', 'DESC']]
    });
    
    res.json({
      battle: {
        quiz_title: battle.quiz.title,
        status: battle.status
      },
      results: participants.map((p, index) => ({
        rank: index + 1,
        player_name: p.player_name,
        username: p.user.username,
        profile_picture: p.user.profile_picture,
        score: p.score,
        is_winner: index === 0,
        points_earned: p.points_earned,
        exp_earned: p.exp_earned
      }))
    });
  } catch (err) {
    console.error('❌ Get results error:', err);
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
    console.error('❌ End battle error:', err);
    res.status(500).json({ error: 'Failed to end battle' });
  }
});

// ============================================
// SYNC BATTLE RESULTS FROM FIREBASE TO MYSQL
// ============================================

router.post('/battle/:gamePin/sync-results', requireAuth, async (req, res) => {
  // ⚠️ CRITICAL: Use transaction with explicit rollback
  let transaction;
  
  try {
    const { gamePin } = req.params;
    const { players, winnerId, completedAt } = req.body;
    const userId = req.session.userId;
    
    console.log('🔄 MySQL Sync Request - PIN:', gamePin);
    console.log('📊 Players:', JSON.stringify(players, null, 2));
    console.log('🏆 Winner:', winnerId);
    console.log('👤 Requester:', userId);
    console.log('📅 CompletedAt:', completedAt);
    
    // ============================================
    // VALIDATION
    // ============================================
    
    if (!players || !Array.isArray(players) || players.length === 0) {
      console.error('❌ Invalid players data:', players);
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
    
    console.log('🔍 Max score:', maxScore);
    console.log('🏆 Winners (tied or single):', winnerIds);
    console.log(`🎯 ${winners.length} winner(s) with ${maxScore} points`);
    
    // ============================================
    // START TRANSACTION
    // ============================================
    
    transaction = await sequelize.transaction();
    
    console.log('🔒 Transaction started');
    
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
      console.error('❌ Battle not found:', gamePin);
      return res.status(404).json({ 
        success: false,
        error: 'Battle not found in database' 
      });
    }
    
    console.log('✅ Battle found and locked:', battle.battle_id);
    
    // ============================================
    // 2. SECURITY: VERIFY REQUESTER IS HOST
    // ============================================
    
    if (battle.host_id !== userId) {
      await transaction.rollback();
      console.error('❌ Non-host sync attempt. Host:', battle.host_id, 'Requester:', userId);
      return res.status(403).json({ 
        success: false,
        error: 'Only host can sync results' 
      });
    }
    
    // ============================================
    // 3. IDEMPOTENCY: CHECK IF ALREADY SYNCED
    // ============================================
    
    if (battle.status === 'completed' && battle.winner_id) {
      await transaction.rollback();
      console.log('⏭️ Battle already synced:', gamePin);
      return res.status(200).json({ 
        success: true,
        message: 'Battle already synced',
        alreadySynced: true,
        battleId: battle.battle_id,
        winnerId: battle.winner_id,
        winnerIds: winnerIds,
        totalPlayers: battle.current_players
      });
    }
    
    // ============================================
    // 4. UPDATE BATTLE STATUS
    // ============================================
    
    // For single winner: use winnerId
    // For tied winners: use first winner's ID (just for DB constraint)
    const primaryWinnerId = winnerIds[0];
    
    await battle.update({
      status: 'completed',
      winner_id: primaryWinnerId, // Store primary winner (for single or first of tied)
      completed_at: completedAt || new Date()
    }, { transaction });
    
    console.log(`✅ Battle marked as completed with winner ${primaryWinnerId}`);
    if (winnerIds.length > 1) {
      console.log(`🤝 ${winnerIds.length} tied winners detected`);
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
        
        console.log(`📝 Updating player ${player.userId}: score=${player.score}, points=${pointsEarned}`);
        
        // Update participant record
        const [updateCount] = await BattleParticipant.update(
          { 
            score: player.score,
            points_earned: pointsEarned,
            exp_earned: expEarned,
            is_winner: isWinner
          },
          { 
            where: { 
              battle_id: battle.battle_id, 
              user_id: player.userId 
            },
            transaction 
          }
        );
        
        if (updateCount === 0) {
          console.warn('⚠️ Participant not found for user:', player.userId);
          updateErrors.push(`Player ${player.userId} not found in battle`);
          continue;
        }
        
        updatedCount++;
        
        // Award points to user account
        await User.increment('points', {
          by: pointsEarned,
          where: { user_id: player.userId },
          transaction
        });
        
        console.log(`✅ Updated player ${player.userId}`);
        
      } catch (playerError) {
        console.error(`❌ Error updating player ${player.userId}:`, playerError);
        updateErrors.push(`Failed to update player ${player.userId}: ${playerError.message}`);
        
        // CRITICAL: If any player fails, rollback entire transaction
        throw playerError;
      }
    }
    
    // ============================================
    // 6. VERIFY ALL PLAYERS UPDATED
    // ============================================
    
    if (updatedCount !== players.length) {
      await transaction.rollback();
      console.error(`❌ Player update mismatch: ${updatedCount}/${players.length}`);
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
    console.log('✅ Transaction committed successfully');
    console.log(`🎯 Final summary: ${winnerIds.length} winner(s), ${updatedCount} players updated`);
    
    // ============================================
    // 8. SUCCESS RESPONSE
    // ============================================
    
    return res.json({ 
      success: true,
      message: 'Battle results synced successfully',
      battleId: battle.battle_id,
      winnerId: primaryWinnerId,
      winnerIds: winnerIds, // All tied winners
      totalPlayers: players.length,
      updatedPlayers: updatedCount,
      isTied: winnerIds.length > 1,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    // ============================================
    // ROLLBACK ON ANY ERROR
    // ============================================
    
    if (transaction) {
      try {
        await transaction.rollback();
        console.log('🔙 Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
        console.error('❌ Rollback error stack:', rollbackError.stack);
      }
    }
    
    console.error('❌ Sync error:', error);
    console.error('❌ Sync error message:', error.message);
    console.error('❌ Sync error stack:', error.stack);
    console.error('❌ Sync error name:', error.name);
    
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
            as: 'user',
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
        username: p.user.username,
        score: p.score,
        pointsEarned: p.points_earned,
        isWinner: p.is_winner
      }))
    });
  } catch (error) {
    console.error('❌ Verify sync error:', error);
    res.status(500).json({ error: 'Failed to verify sync' });
  }
});


// ============================================
// QUIZ SHARING ROUTES
// ============================================

// ✅ FIX: Toggle quiz public/private status WITHOUT regenerating share code
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

    // ✅ FIX: Only generate share code if:
    // 1. Making public AND
    // 2. No share code exists yet
    let shareCode = quiz.share_code;
    
    if (is_public && !shareCode) {
      console.log('🔑 Generating NEW share code for quiz:', quizId);
      shareCode = await generateUniqueShareCode();
    } else if (is_public && shareCode) {
      console.log('♻️ Reusing existing share code:', shareCode);
    } else {
      console.log('🔒 Making quiz private, keeping share code:', shareCode);
    }

    // Update quiz
    await quiz.update({
      is_public,
      share_code: shareCode, // Always save the share code (new or existing)
      updated_at: new Date()
    });

    console.log(`✅ Quiz ${quizId} updated: public=${is_public}, code=${shareCode}`);

    res.json({ 
      quiz,
      share_code: is_public ? shareCode : null // Only return code if public
    });
  } catch (err) {
    console.error('❌ Toggle public error:', err);
    res.status(500).json({ error: 'Failed to update quiz sharing status' });
  }
});

// ✅ WORKING: Import quiz via share code
router.post('/import', requireAuth, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.session.userId;
    const { share_code } = req.body;

    if (!share_code || share_code.length !== 6) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid share code. Please enter a 6-digit code.' });
    }

    console.log('🔍 Looking for quiz with share code:', share_code);

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
      console.log('❌ Quiz not found for code:', share_code);
      return res.status(404).json({ 
        error: 'Quiz not found. Make sure the code is correct and the quiz is public.' 
      });
    }

    console.log('✅ Found quiz:', originalQuiz.title, 'by', originalQuiz.creator.username);

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

    console.log('📦 Creating imported quiz copy...');

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

    console.log(`📝 Copying ${originalQuestions.length} questions...`);

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
        points: originalQuestion.points
      }, { transaction });
    }

    // Update total_questions count
    await importedQuiz.update({
      total_questions: originalQuestions.length
    }, { transaction });

    await transaction.commit();

    console.log(`✅ Quiz "${originalQuiz.title}" imported successfully by user ${userId}`);
    
    res.json({ 
      message: 'Quiz imported successfully',
      quiz: importedQuiz
    });
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Import quiz error:', err);
    res.status(500).json({ error: 'Failed to import quiz' });
  }
});

// ✅ NEW: Backfill share codes for existing public quizzes
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
    
    console.log(`🔧 Found ${quizzes.length} public quizzes without share codes`);
    
    let updated = 0;
    for (const quiz of quizzes) {
      try {
        const shareCode = await generateUniqueShareCode();
        await quiz.update({ share_code: shareCode });
        console.log(`✅ Added share code ${shareCode} to quiz ${quiz.quiz_id}`);
        updated++;
      } catch (err) {
        console.error(`❌ Failed to update quiz ${quiz.quiz_id}:`, err);
      }
    }
    
    res.json({
      message: 'Share codes backfilled',
      total: quizzes.length,
      updated: updated
    });
  } catch (err) {
    console.error('❌ Backfill error:', err);
    res.status(500).json({ error: 'Failed to backfill share codes' });
  }
});

export default router;
