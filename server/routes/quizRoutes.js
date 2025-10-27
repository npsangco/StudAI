import express from 'express';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import QuizAttempt from '../models/QuizAttempt.js';
import User from '../models/User.js';
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
  try {
    const userId = req.session.userId;
    const quizId = req.params.id;

    const quiz = await Quiz.findByPk(quizId);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.created_by !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this quiz' });
    }

    // Delete associated questions first (cascade)
    await Question.destroy({ where: { quiz_id: quizId } });
    
    // Delete quiz
    await quiz.destroy();

    res.json({ message: 'Quiz deleted successfully' });
  } catch (err) {
    console.error('❌ Delete quiz error:', err);
    res.status(500).json({ error: 'Failed to delete quiz' });
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

export default router;