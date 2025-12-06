import express from 'express';
import sequelize from '../db.js';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import UserDailyStat from '../models/UserDailyStat.js';
import { checkAndUnlockAchievements } from '../services/achievementServices.js';

const router = express.Router();

// Plan configuration
const PLAN_CONFIG = {
  points: {
    perTask: 30,
    dailyCap: 3,
    capMessage: "Daily task points limit reached (3/3). You can still complete tasks but won't earn points until tomorrow!"
  },
  exp: {
    perTask: 15,  // EXP for completing a task (unlimited)
    unlimited: true
  }
};

// Hybrid auth middleware
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

// Check and reset daily caps (same as quiz routes)
async function getDailyStats(userId) {
  const today = new Date().toISOString().split('T')[0];
  
  let dailyStat = await UserDailyStat.findOne({
    where: { user_id: userId, last_reset_date: today }
  });
  
  if (!dailyStat) {
    dailyStat = await UserDailyStat.create({
      user_id: userId,
      last_reset_date: today,
      notes_created_today: 0,
      quizzes_completed_today: 0,
      planner_updates_today: 0,
      points_earned_today: 0,
      exp_earned_today: 0,
      streak_active: false
    });
  }
  
  return dailyStat;
}

// Log daily stats (consistent with quiz routes)
async function logDailyStats(userId, activityType, points, exp = 0) {
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
      exp_earned_today: 0,
      streak_active: false
    }
  });
  
  const updates = {
    points_earned_today: dailyStat.points_earned_today + points,
    exp_earned_today: dailyStat.exp_earned_today + exp
  };
  
  if (activityType === 'task') {
    updates.planner_updates_today = dailyStat.planner_updates_today + 1;
  }
  
  await dailyStat.update(updates);
  await dailyStat.reload(); // Refresh to get updated values
  return dailyStat;
}

// Update user streak (same as quiz routes)
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

// ============================================
// PLAN ROUTES (Updated with Daily Points Limit)
// ============================================

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

// Create a new plan - Count towards daily quest but award smaller rewards
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, due_date, completed } = req.body;
    const userId = req.session.userId;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const newPlan = await Plan.create({
      user_id: userId,
      title,
      description: description || null,
      due_date: due_date || null,
      completed: completed || false,
      created_at: new Date()
    });

    // Get daily stats
    const dailyStats = await getDailyStats(userId);
    
    let pointsAwarded = 0;
    let expAwarded = 10; // Award 10 EXP for creating plan
    let dailyCapReached = false;

    // Check if under daily cap
    if (dailyStats.planner_updates_today < PLAN_CONFIG.points.dailyCap) {
      pointsAwarded = 10; // 10 points for creation (vs 30 for completion)
      
      // Award points
      await User.increment('points', {
        by: pointsAwarded,
        where: { user_id: userId }
      });
    } else {
      dailyCapReached = true;
    }

    // Log daily stats (increments planner_updates_today)
    const updatedStats = await logDailyStats(userId, 'task', pointsAwarded, expAwarded);

    // Award EXP to pet
    const petLevelUp = await awardPetExp(userId, expAwarded);

    res.status(201).json({ 
      plan: newPlan,
      points_awarded: pointsAwarded,
      exp_awarded: expAwarded,
      petLevelUp,
      dailyCapReached,
      remainingTasks: PLAN_CONFIG.points.dailyCap - updatedStats.planner_updates_today
    });
  } catch (err) {
    console.error('Failed to create plan:', err);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// Update a plan - Handle marking as done WITH DAILY POINTS LIMIT
router.put('/:id', requireAuth, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { title, description, due_date, completed } = req.body;
    const planId = req.params.id;
    const userId = req.session.userId;

    const plan = await Plan.findOne({
      where: { 
        planner_id: planId,
        user_id: userId 
      },
      transaction
    });

    if (!plan) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Allow explicit null/undefined values for due_date (to clear deadline)
    const updateData = { 
      title: title !== undefined ? title : plan.title,
      description: description !== undefined ? description : plan.description,
      due_date: due_date !== undefined ? (due_date === null || due_date === '' ? null : due_date) : plan.due_date
    };

    let pointsAwarded = 0;
    let expAwarded = 0;
    let petLevelUp = null;
    let wasNewlyCompleted = false;
    let dailyCapReached = false;

    // Handle completed status - this is where marking as done happens
    if (completed !== undefined) {
      updateData.completed = completed;
      if (completed && !plan.completed) {
        // Get daily stats
        const dailyStats = await getDailyStats(userId);
        
        updateData.completed_at = new Date();
        wasNewlyCompleted = true;
        
        // Always award EXP (unlimited)
        expAwarded = PLAN_CONFIG.exp.perTask;
        
        // CHECK DAILY POINTS LIMIT (but don't block completion)
        if (dailyStats.planner_updates_today >= PLAN_CONFIG.points.dailyCap) {
          dailyCapReached = true;
          console.log(`[Planner] Plan ${planId} marked as completed - daily limit reached, no points awarded (still earned ${expAwarded} EXP)`);
          
          // Still log stats for tracking (no points though)
          await logDailyStats(userId, 'task', 0, expAwarded);
        } else {
          // AWARD POINTS AND UPDATE STATS (only if under daily limit)
          const TASK_POINTS = PLAN_CONFIG.points.perTask;
          
          // Update user points
          await User.increment('points', {
            by: TASK_POINTS,
            where: { user_id: userId },
            transaction
          });
          
          // Log daily stats (increments planner_updates_today)
          await logDailyStats(userId, 'task', TASK_POINTS, expAwarded);
          
          pointsAwarded = TASK_POINTS;
          console.log(`[Planner] Awarded ${TASK_POINTS} points and ${expAwarded} EXP for completing task (${dailyStats.planner_updates_today + 1}/3 daily)`);
        }
        
        // Award EXP to pet (always, even if points cap reached)
        // Note: Must happen after transaction commit, so we'll do it outside
        
        // Update streak regardless of points limit
        await updateUserStreak(userId);
        
      } else if (!completed && plan.completed) {
        updateData.completed_at = null;
        console.log(`[Planner] Plan ${planId} marked as incomplete`);
      }
    }

    await plan.update(updateData, { transaction });
    await transaction.commit();

    // Award EXP to pet after transaction (even if points cap reached)
    if (wasNewlyCompleted && expAwarded > 0) {
      petLevelUp = await awardPetExp(userId, expAwarded);
    }

    // Check achievements after successful completion (even without points)
    if (wasNewlyCompleted) {
      try {
        await checkAndUnlockAchievements(userId);
      } catch (achievementError) {
        console.error('Error checking achievements:', achievementError);
        // Don't fail the request if achievement check fails
      }
    }

    const updatedStats = await getDailyStats(userId);
    
    res.json({ 
      plan,
      points_awarded: pointsAwarded,
      exp_awarded: expAwarded,
      petLevelUp,
      dailyCapReached: dailyCapReached,
      message: dailyCapReached 
        ? `${PLAN_CONFIG.points.capMessage} (Still earned ${expAwarded} EXP!)`
        : pointsAwarded > 0 
          ? `Task completed! +${pointsAwarded} points and +${expAwarded} EXP!` 
          : 'Task updated',
      remainingTasks: PLAN_CONFIG.points.dailyCap - updatedStats.planner_updates_today
    });

  } catch (err) {
    await transaction.rollback();
    console.error('Failed to update plan:', err);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// Mark as completed (DELETE route) WITH DAILY POINTS LIMIT
router.delete('/:id', requireAuth, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const planId = req.params.id;
    const userId = req.session.userId;

    const plan = await Plan.findOne({
      where: { 
        planner_id: planId,
        user_id: userId 
      },
      transaction
    });

    if (!plan) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Check if already completed to avoid double rewards
    if (plan.completed) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Task already completed' });
    }

    // Get daily stats
    const dailyStats = await getDailyStats(userId);
    
    let pointsAwarded = 0;
    let expAwarded = PLAN_CONFIG.exp.perTask; // Always award EXP
    let dailyCapReached = false;

    // CHECK DAILY POINTS LIMIT (but don't block completion)
    if (dailyStats.planner_updates_today >= PLAN_CONFIG.points.dailyCap) {
      dailyCapReached = true;
      console.log(`[Planner] Plan ${planId} marked as completed via DELETE - daily limit reached, no points awarded (still earned ${expAwarded} EXP)`);
      
      // Still log stats for tracking (no points though)
      await logDailyStats(userId, 'task', 0, expAwarded);
    } else {
      // AWARD POINTS AND UPDATE STATS (only if under daily limit)
      const TASK_POINTS = PLAN_CONFIG.points.perTask;
      
      // Update user points
      await User.increment('points', {
        by: TASK_POINTS,
        where: { user_id: userId },
        transaction
      });
      
      // Log daily stats (increments planner_updates_today)
      await logDailyStats(userId, 'task', TASK_POINTS, expAwarded);

      pointsAwarded = TASK_POINTS;
      console.log(`[Planner] Plan ${planId} marked as completed via DELETE - +${TASK_POINTS} points awarded (${dailyStats.planner_updates_today + 1}/3 daily)`);
    }

    // Update streak regardless of points limit
    await updateUserStreak(userId);

    // Mark as completed instead of deleting (ALWAYS ALLOWED)
    await plan.update({ 
      completed: true,
      completed_at: new Date()
    }, { transaction });

    await transaction.commit();

    // Check achievements (even without points)
    try {
      await checkAndUnlockAchievements(userId);
    } catch (achievementError) {
      console.error('Error checking achievements:', achievementError);
    }

    const updatedStats = await getDailyStats(userId);
    
    res.json({ 
      message: dailyCapReached 
        ? 'Task completed (daily points limit reached)' 
        : 'Task marked as completed', 
      plan,
      points_awarded: pointsAwarded,
      exp_awarded: expAwarded,
      dailyCapReached: dailyCapReached,
      remainingTasks: PLAN_CONFIG.points.dailyCap - updatedStats.planner_updates_today
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Failed to update task:', err);
    res.status(500).json({ error: 'Failed to update task' });
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