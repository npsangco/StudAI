// services/dailyResetCron.js - Pet Buddy v2.1 Daily Reset System
import cron from 'node-cron';
import User from '../models/User.js';
import UserDailyStat from '../models/UserDailyStat.js';
import sequelize from '../db.js';
import { getTodayPhilippines, getYesterdayPhilippines } from '../utils/timezone.js';

/**
 * Daily Reset Function
 * Resets daily caps and checks streaks
 */
export async function performDailyReset() {
  const transaction = await sequelize.transaction();
  
  try {
    const today = getTodayPhilippines();
    const yesterday = getYesterdayPhilippines();
    
    // Get all users
    const users = await User.findAll({
      attributes: ['user_id', 'study_streak', 'longest_streak', 'last_activity_date'],
      transaction
    });
    
    let resetCount = 0;
    let streaksContinued = 0;
    let streaksBroken = 0;
    
    for (const user of users) {
      // Check if user had activity yesterday
      const yesterdayStats = await UserDailyStat.findOne({
        where: {
          user_id: user.user_id,
          stat_date: yesterday
        },
        transaction
      });
      
      const hadActivityYesterday = yesterdayStats && (
        yesterdayStats.notes_created > 0 ||
        yesterdayStats.quizzes_completed > 0 ||
        yesterdayStats.tasks_added > 0
      );
      
      // Update streak
      let newStreak = user.study_streak || 0;
      
      if (hadActivityYesterday) {
        // Continue streak
        streaksContinued++;
      } else {
        // Break streak
        if (newStreak > 0) {
          streaksBroken++;
        }
        newStreak = 0;
      }
      
      // Reset daily caps
      await user.update({
        daily_notes_count: 0,
        daily_quizzes_count: 0,
        daily_tasks_count: 0,
        daily_reset_date: today,
        study_streak: newStreak,
        longest_streak: Math.max(user.longest_streak || 0, newStreak)
      }, { transaction });
      
      resetCount++;
    }
    
    await transaction.commit();
    
    console.log(`✅ Daily reset complete!`);
    console.log(`   - Users reset: ${resetCount}`);
    console.log(`   - Streaks continued: ${streaksContinued}`);
    console.log(`   - Streaks broken: ${streaksBroken}`);
    console.log(`   - Date: ${today}`);
    
    return {
      success: true,
      resetCount,
      streaksContinued,
      streaksBroken,
      date: today
    };
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Daily reset failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check and award streak bonuses
 */
export async function awardStreakBonuses() {
  try {
    console.log('🎁 Checking for streak bonuses...');
    const today = getTodayPhilippines();
    
    // Find users with active streaks of 7+ days
    const users = await User.findAll({
      where: {
        study_streak: {
          [sequelize.Sequelize.Op.gte]: 7
        },
        last_activity_date: today
      }
    });
    
    let bonusesAwarded = 0;
    const STREAK_BONUS = 20; // points per week
    
    for (const user of users) {
      // Check if user already got bonus today
      const dailyStat = await UserDailyStat.findOne({
        where: {
          user_id: user.user_id,
          stat_date: today,
          streak_active: false
        }
      });
      
      if (dailyStat && user.study_streak % 7 === 0) {
        // Award weekly streak bonus
        await User.increment('points', {
          by: STREAK_BONUS,
          where: { user_id: user.user_id }
        });
        
        await dailyStat.update({ streak_active: true });
        
        bonusesAwarded++;
        console.log(`   🔥 Awarded ${STREAK_BONUS}pts to user ${user.user_id} (${user.study_streak}-day streak)`);
      }
    }
    
    console.log(`✅ Streak bonuses awarded: ${bonusesAwarded}`);
    
    return { bonusesAwarded };
    
  } catch (error) {
    console.error('❌ Streak bonus failed:', error);
    return { error: error.message };
  }
}

/**
 * Clean up old daily stats (keep last 90 days)
 */
export async function cleanupOldStats() {
  try {
    console.log('🧹 Cleaning up old stats...');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffString = cutoffDate.toISOString().split('T')[0];
    
    const deleted = await UserDailyStat.destroy({
      where: {
        stat_date: {
          [sequelize.Sequelize.Op.lt]: cutoffString
        }
      }
    });
    
    console.log(`✅ Deleted ${deleted} old stat records (older than ${cutoffString})`);
    
    return { deleted };
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return { error: error.message };
  }
}

/**
 * Initialize cron jobs
 */
export function initializeCronJobs() {
  // Daily reset at midnight (00:00 Philippines Time)
  cron.schedule('0 0 * * *', async () => {
    await performDailyReset();
    await awardStreakBonuses();
  }, {
    timezone: 'Asia/Manila' // Philippines timezone
  });
  
  // Weekly cleanup on Sunday at 2 AM (Philippines Time)
  cron.schedule('0 2 * * 0', async () => {
    await cleanupOldStats();
  }, {
    timezone: 'Asia/Manila'
  });
}

/**
 * Manual trigger endpoint (for testing)
 */
export async function manualReset() {
  const resetResult = await performDailyReset();
  const bonusResult = await awardStreakBonuses();
  const cleanupResult = await cleanupOldStats();
  
  return {
    reset: resetResult,
    bonuses: bonusResult,
    cleanup: cleanupResult
  };
}

export default {
  performDailyReset,
  awardStreakBonuses,
  cleanupOldStats,
  initializeCronJobs,
  manualReset
};