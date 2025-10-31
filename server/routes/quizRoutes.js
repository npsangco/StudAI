import express from 'express';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import QuizAttempt from '../models/QuizAttempt.js';
import User from '../models/User.js';
import QuizBattle from '../models/QuizBattle.js';
import BattleParticipant from '../models/BattleParticipant.js';
import sequelize from '../db.js';

const router = express.Router();

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
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

    // Check if user has access (public or owner)
    if (!quiz.is_public && quiz.created_by !== req.session.userId) {
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

    const newQuiz = await Quiz.create({
      title: title.trim(),
      description: description || '',
      created_by: userId,
      is_public: is_public !== undefined ? is_public : true,
      total_questions: 0,
      total_attempts: 0,
      average_score: 0
    });

    res.status(201).json({ quiz: newQuiz });
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

    await quiz.update({
      title: title || quiz.title,
      description: description !== undefined ? description : quiz.description,
      is_public: is_public !== undefined ? is_public : quiz.is_public,
      updated_at: new Date()
    });

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
// QUIZ ATTEMPT ROUTES
// ============================================

// Submit quiz attempt
router.post('/:id/attempt', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const quizId = req.params.id;
    const { score, total_questions, time_spent, answers } = req.body;

    if (score === undefined || total_questions === undefined) {
      return res.status(400).json({ error: 'Score and total_questions are required' });
    }

    const percentage = total_questions > 0 ? (score / total_questions * 100).toFixed(2) : 0;
    const points_earned = score * 10; // 10 points per correct answer
    const exp_earned = score * 5; // 5 EXP per correct answer

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

    // Update user points
    await User.increment('points', {
      by: points_earned,
      where: { user_id: userId }
    });

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

    res.status(201).json({
      attempt,
      points_earned,
      exp_earned,
      message: 'Quiz attempt submitted successfully'
    });
  } catch (err) {
    console.error('❌ Submit attempt error:', err);
    res.status(500).json({ error: 'Failed to submit quiz attempt' });
  }
});

// Get user's quiz attempts
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

// Get quiz leaderboard
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
      max_players: 8,
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
    
    // Update participant score
    const participant = await BattleParticipant.findOne({
      where: { battle_id: battle.battle_id, user_id: userId }
    });
    
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    
    await participant.update({ score });
    
    res.json({ message: 'Score submitted' });
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



export default router;