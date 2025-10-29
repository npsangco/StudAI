import express from 'express';
import Plan from '../models/Plan.js';

const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
};

// Get all plans for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const plans = await Plan.findAll({
      where: { user_id: req.session.userId },
      order: [['createdAt', 'DESC']]
    });

    res.json({ plans });
  } catch (err) {
    console.error('Failed to fetch plans:', err);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Create a new plan
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, due_date } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const newPlan = await Plan.create({
      user_id: req.session.userId,
      title,
      description: description || null,
      due_date: due_date || null
    });

    res.status(201).json({ plan: newPlan });
  } catch (err) {
    console.error('Failed to create plan:', err);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// Update a plan
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, description, due_date } = req.body;
    const planId = req.params.id;

    const plan = await Plan.findOne({
      where: { 
        planner_id: planId,
        user_id: req.session.userId 
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    await plan.update({ 
      title: title || plan.title,
      description: description !== undefined ? description : plan.description,
      due_date: due_date !== undefined ? due_date : plan.due_date
    });

    res.json({ plan });
  } catch (err) {
    console.error('Failed to update plan:', err);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// Delete a plan
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const planId = req.params.id;

    const plan = await Plan.findOne({
      where: { 
        planner_id: planId,
        user_id: req.session.userId 
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    await plan.destroy();
    res.json({ message: 'Plan deleted successfully' });
  } catch (err) {
    console.error('Failed to delete plan:', err);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

// Get plans by date range
router.get('/range', requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const { Op } = await import('sequelize');
    
    const plans = await Plan.findAll({
      where: { 
        user_id: req.session.userId,
        due_date: {
          [Op.between]: [new Date(start_date), new Date(end_date)]
        }
      },
      order: [['due_date', 'ASC']]
    });

    res.json({ plans });
  } catch (err) {
    console.error('Failed to fetch plans by range:', err);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Get plans by specific date
router.get('/date/:date', requireAuth, async (req, res) => {
  try {
    const { date } = req.params;
    
    const { Op } = await import('sequelize');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const plans = await Plan.findAll({
      where: { 
        user_id: req.session.userId,
        due_date: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      order: [['createdAt', 'DESC']]
    });

    res.json({ plans });
  } catch (err) {
    console.error('Failed to fetch plans by date:', err);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

export default router;