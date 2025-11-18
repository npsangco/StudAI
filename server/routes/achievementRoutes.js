// routes/achievementRoutes.js - Updated for Pet Buddy v2.1
import express from 'express';
import { 
  getUserAchievements, 
  checkAndUnlockAchievements,
  equipUserAchievement 
} from '../services/achievementServices.js';

const router = express.Router();

// ============================================
// MIDDLEWARE
// ============================================

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
};

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/achievements
 * Get all achievements with progress for the current user
 * AUTOMATICALLY checks for newly unlocked achievements before returning
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Check for newly unlocked achievements before fetching
    // This ensures achievements are always up-to-date when modal opens
    try {
      const newlyUnlocked = await checkAndUnlockAchievements(userId);
      if (newlyUnlocked && newlyUnlocked.length > 0) {
        console.log(`🏆 Auto-unlocked ${newlyUnlocked.length} achievement(s) for user ${userId} when opening modal`);
      }
    } catch (checkError) {
      console.error('Error auto-checking achievements:', checkError);
      // Don't fail the request if achievement check fails
    }
    
    const result = await getUserAchievements(userId);
    
    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch achievements' 
    });
  }
});

/**
 * POST /api/achievements/equip
 * Equip an achievement for display
 */
router.post('/equip', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { achievementId } = req.body;

    console.log('Equip request - User:', userId, 'Achievement ID:', achievementId);

    if (!achievementId) {
      return res.status(400).json({
        success: false,
        error: 'Achievement ID is required'
      });
    }

    // First, verify the user has unlocked this achievement
    const userAchievements = await getUserAchievements(userId);
    const achievement = userAchievements.achievements.find(
      a => a.achievement_id === achievementId && a.is_unlocked
    );

    console.log('Found achievement:', achievement);

    if (!achievement) {
      return res.status(400).json({
        success: false,
        error: 'Achievement not found or not unlocked',
        userHasUnlocked: userAchievements.achievements.some(a => a.achievement_id === achievementId && a.is_unlocked),
        allUnlockedAchievements: userAchievements.achievements.filter(a => a.is_unlocked).map(a => ({ id: a.achievement_id, title: a.title }))
      });
    }

    // Update user's equipped achievement in the database
    const result = await equipUserAchievement(userId, achievementId);
    
    res.json({
      success: true,
      message: 'Achievement equipped successfully',
      equippedAchievement: achievement
    });

  } catch (error) {
    console.error('Equip achievement error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to equip achievement' 
    });
  }
});

/**
 * POST /api/achievements/check
 * Manually trigger achievement check (useful after bulk operations)
 */
router.post('/check', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const newlyUnlocked = await checkAndUnlockAchievements(userId);
    
    res.json({
      success: true,
      newlyUnlocked,
      hasNew: newlyUnlocked.length > 0,
      count: newlyUnlocked.length
    });

  } catch (error) {
    console.error('Check achievements error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check achievements' 
    });
  }
});

/**
 * GET /api/achievements/unlocked
 * Get only unlocked achievements
 */
router.get('/unlocked', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const result = await getUserAchievements(userId);
    
    const unlockedAchievements = result.achievements.filter(a => a.is_unlocked);
    
    res.json({
      success: true,
      achievements: unlockedAchievements,
      total: unlockedAchievements.length
    });

  } catch (error) {
    console.error('Get unlocked achievements error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch unlocked achievements' 
    });
  }
});

/**
 * GET /api/achievements/locked
 * Get only locked achievements (with progress)
 */
router.get('/locked', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const result = await getUserAchievements(userId);
    
    // Filter out hidden achievements that aren't unlocked yet
    const lockedAchievements = result.achievements
      .filter(a => !a.is_unlocked && !a.is_hidden);
    
    res.json({
      success: true,
      achievements: lockedAchievements,
      total: lockedAchievements.length
    });

  } catch (error) {
    console.error('Get locked achievements error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch locked achievements' 
    });
  }
});

/**
 * GET /api/achievements/stats
 * Get achievement statistics for the user
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const result = await getUserAchievements(userId);
    
    const stats = {
      total: result.totalAchievements,
      unlocked: result.totalUnlocked,
      locked: result.totalAchievements - result.totalUnlocked,
      completionPercentage: Math.min(100, Math.round(
        (result.totalUnlocked / result.totalAchievements) * 100
      )),
      totalPointsEarned: result.achievements
        .filter(a => a.is_unlocked)
        .reduce((sum, a) => sum + a.points_reward, 0)
    };
    
    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get achievement stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch achievement stats' 
    });
  }
});

export default router;