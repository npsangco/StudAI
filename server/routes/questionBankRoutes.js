import express from 'express';
import { Op } from 'sequelize';
import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';
import User from '../models/User.js';

const router = express.Router();

// Get all questions from user's quizzes (with filters)
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      type,
      difficulty,
      sourceQuizId,
      search,
      page = 1,
      limit = 50
    } = req.query;

    // Build question filter conditions
    const questionWhere = {};

    // IMPORTANT: Only show original questions (not copies) in question bank
    questionWhere.is_copy = 0;

    if (type) {
      questionWhere.type = type;
    }

    if (difficulty) {
      questionWhere.difficulty = difficulty;
    }

    // sourceQuizId is not used for filtering - question bank shows all user's questions

    if (search) {
      questionWhere.question = {
        [Op.like]: `%${search}%`
      };
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Fetch questions from user's quizzes
    const { count, rows: questions } = await Question.findAndCountAll({
      where: questionWhere,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Quiz,
          as: 'quiz',
          attributes: ['quiz_id', 'title', 'created_by'],
          where: { created_by: userId },
          required: true
        }
      ]
    });

    res.json({
      questions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching question bank:', error);
    res.status(500).json({ error: 'Failed to fetch question bank' });
  }
});

// Copy questions from bank to a quiz
router.post('/insert', async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { quizId, questionIds } = req.body;

    if (!quizId || !questionIds || !Array.isArray(questionIds)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    // Verify user owns the target quiz
    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    if (parseInt(quiz.created_by) !== parseInt(userId)) {
      return res.status(403).json({ error: 'Unauthorized to modify this quiz' });
    }

    // Get questions and verify user owns them
    const sourceQuestions = await Question.findAll({
      where: {
        question_id: { [Op.in]: questionIds }
      },
      include: [
        {
          model: Quiz,
          as: 'quiz',
          attributes: ['created_by'],
          where: { created_by: userId },
          required: true
        }
      ]
    });

    if (sourceQuestions.length === 0) {
      return res.status(404).json({ error: 'No valid questions found' });
    }

    // Get current max question_order
    const maxOrder = await Question.max('question_order', {
      where: { quiz_id: quizId }
    }) || 0;

    // Copy questions into target quiz
    const insertedQuestions = [];
    let currentOrder = maxOrder;

    for (const sourceQuestion of sourceQuestions) {
      currentOrder++;

      // Properly copy the data fields from source question
      const choicesData = sourceQuestion.choices;
      const matchingPairsData = sourceQuestion.matching_pairs;

      const newQuestion = await Question.create({
        quiz_id: quizId,
        type: sourceQuestion.type,
        question: sourceQuestion.question,
        question_order: currentOrder,
        choices: choicesData,
        correct_answer: sourceQuestion.correct_answer,
        answer: sourceQuestion.answer,
        matching_pairs: matchingPairsData,
        points: sourceQuestion.points,
        difficulty: sourceQuestion.difficulty,
        is_copy: 1  // Mark as copy so it won't appear in question bank
      });

      insertedQuestions.push(newQuestion);
    }

    // Update quiz total_questions
    quiz.total_questions = currentOrder;
    quiz.updated_at = new Date();
    await quiz.save();

    res.json({
      success: true,
      inserted: insertedQuestions.length,
      questions: insertedQuestions
    });
  } catch (error) {
    console.error('Error inserting questions from bank:', error);
    res.status(500).json({ error: 'Failed to insert questions' });
  }
});

// Get statistics about user's questions
router.get('/stats', async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's quizzes
    const userQuizzes = await Quiz.findAll({
      where: { created_by: userId },
      attributes: ['quiz_id', 'title']
    });

    const quizIds = userQuizzes.map(q => q.quiz_id);

    if (quizIds.length === 0) {
      return res.json({
        total: 0,
        byType: [],
        byDifficulty: [],
        topSources: []
      });
    }

    const [total, byType, byDifficulty, bySource] = await Promise.all([
      // Total questions (only originals, not copies)
      Question.count({
        where: { 
          quiz_id: { [Op.in]: quizIds },
          is_copy: 0
        }
      }),
      // Count by type (only originals)
      Question.findAll({
        where: { 
          quiz_id: { [Op.in]: quizIds },
          is_copy: 0
        },
        attributes: [
          'type',
          [Question.sequelize.fn('COUNT', Question.sequelize.col('question_id')), 'count']
        ],
        group: ['type']
      }),
      // Count by difficulty (only originals)
      Question.findAll({
        where: { 
          quiz_id: { [Op.in]: quizIds },
          is_copy: 0
        },
        attributes: [
          'difficulty',
          [Question.sequelize.fn('COUNT', Question.sequelize.col('question_id')), 'count']
        ],
        group: ['difficulty']
      }),
      // Count by source quiz (only originals)
      Question.findAll({
        where: { 
          quiz_id: { [Op.in]: quizIds },
          is_copy: 0
        },
        attributes: [
          'quiz_id',
          [Question.sequelize.fn('COUNT', Question.sequelize.col('question_id')), 'count']
        ],
        group: ['quiz_id'],
        limit: 10,
        order: [[Question.sequelize.fn('COUNT', Question.sequelize.col('question_id')), 'DESC']],
        include: [
          {
            model: Quiz,
            as: 'quiz',
            attributes: ['title']
          }
        ]
      })
    ]);

    res.json({
      total,
      byType: byType.map(item => ({
        type: item.type,
        count: parseInt(item.get('count'))
      })),
      byDifficulty: byDifficulty.map(item => ({
        difficulty: item.difficulty,
        count: parseInt(item.get('count'))
      })),
      topSources: bySource.map(item => ({
        quizId: item.quiz_id,
        quizTitle: item.quiz?.title || 'Unknown',
        count: parseInt(item.get('count'))
      }))
    });
  } catch (error) {
    console.error('Error fetching bank stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
