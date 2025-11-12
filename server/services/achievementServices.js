// services/achievementService.js - COMPLETELY FIXED VERSION
import User from '../models/User.js';
import PetCompanion from '../models/PetCompanion.js';
import Achievement from '../models/Achievement.js';
import UserAchievement from '../models/UserAchievement.js';
import Note from '../models/Note.js';
import QuizAttempt from '../models/QuizAttempt.js';
import BattleParticipant from '../models/BattleParticipant.js';
import UserPetItem from '../models/UserPetItem.js';
import File from '../models/File.js';
import Session from '../models/Session.js';
import sequelize from '../db.js';

/**
 * Check and unlock achievements for a user
 */
export async function checkAndUnlockAchievements(userId) {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      console.error('User not found:', userId);
      return [];
    }

    // Get all locked achievements for this user
    const unlockedIds = await UserAchievement.findAll({
      where: { user_id: userId },
      attributes: ['achievement_id']
    });
    
    const unlockedIdSet = new Set(unlockedIds.map(ua => ua.achievement_id));

    const lockedAchievements = await Achievement.findAll({
      where: {
        achievement_id: {
          [sequelize.Sequelize.Op.notIn]: Array.from(unlockedIdSet)
        }
      }
    });

    console.log(`🔍 Checking ${lockedAchievements.length} locked achievements for user ${userId}`);

    // Calculate current stats based on ACTUAL database requirement types
    const stats = await calculateUserStats(userId, user);
    console.log(`📊 User stats:`, stats);

    const newlyUnlocked = [];

    // Check each locked achievement
    for (const achievement of lockedAchievements) {
      console.log(`⚔️ Checking achievement: ${achievement.title} (type: ${achievement.requirement_type}, required: ${achievement.requirement_value}, current: ${stats[achievement.requirement_type]})`);
      
      const requirementMet = await checkAchievementRequirement(
        achievement,
        stats
      );

      if (requirementMet) {
        // Unlock achievement
        await UserAchievement.create({
          user_id: userId,
          achievement_id: achievement.achievement_id,
          unlocked_at: new Date()
        });

        // Award points
        if (achievement.points_reward > 0) {
          await User.increment('points', {
            by: achievement.points_reward,
            where: { user_id: userId }
          });
        }

        newlyUnlocked.push({
          achievement_id: achievement.achievement_id,
          title: achievement.title,
          description: achievement.description,
          points_reward: achievement.points_reward,
          color: achievement.color
        });

        console.log(`✅ Achievement unlocked for user ${userId}: ${achievement.title}`);
      }
    }

    return newlyUnlocked;

  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}

/**
 * Calculate all user statistics based on ACTUAL database requirement types
 */
async function calculateUserStats(userId, user) {
  try {
    const [
      notesCount,
      quizzesCount,
      battlesWonCount,
      filesUploadedCount,
      sessionsHostedCount,
      pet
    ] = await Promise.all([
      Note.count({ where: { user_id: userId } }).catch(e => {
        console.error('Error counting notes:', e);
        return 0;
      }),
      QuizAttempt.count({ where: { user_id: userId } }).catch(e => {
        console.error('Error counting quizzes:', e);
        return 0;
      }),
      BattleParticipant.count({ 
        where: { user_id: userId, is_winner: true } 
      }).catch(e => {
        console.error('Error counting battles:', e);
        return 0;
      }),
      File.count({ where: { user_id: userId } }).catch(e => {
        console.error('Error counting files:', e);
        return 0;
      }),
      Session.count({ where: { user_id: userId } }).catch(e => {
        console.error('Error counting sessions:', e);
        return 0;
      }),
      PetCompanion.findOne({ where: { user_id: userId } }).catch(e => {
        console.error('Error finding pet:', e);
        return null;
      })
    ]);

    return {
      points: user.points || 0,
      streak: user.study_streak || 0,
      notes_created: notesCount,
      quizzes_completed: quizzesCount,
      battles_won: battlesWonCount,
      files_uploaded: filesUploadedCount,
      sessions_hosted: sessionsHostedCount,
      pet_level: pet?.level || 0,
      times_fed: pet?.times_fed || 0,
      times_played: pet?.times_played || 0,
      times_cleaned: pet?.times_cleaned || 0,
      pet_adopted: pet ? 1 : 0
    };
  } catch (error) {
    console.error('Error calculating user stats:', error);
    return {
      points: user?.points || 0,
      streak: user?.study_streak || 0,
      notes_created: 0,
      quizzes_completed: 0,
      battles_won: 0,
      files_uploaded: 0,
      sessions_hosted: 0,
      pet_level: 0,
      times_fed: 0,
      times_played: 0,
      times_cleaned: 0,
      pet_adopted: 0
    };
  }
}

/**
 * Check if achievement requirement is met
 */
function checkAchievementRequirement(achievement, stats) {
  const reqType = achievement.requirement_type;
  const reqValue = achievement.requirement_value;
  const currentValue = stats[reqType] || 0;

  const isMet = currentValue >= reqValue;
  console.log(`  → ${reqType}: ${currentValue} >= ${reqValue}? ${isMet}`);
  return isMet;
}

/**
 * Get user achievements with progress
 */
export async function getUserAchievements(userId) {
  try {
    const user = await User.findByPk(userId);

    // First, check and unlock any newly unlocked achievements
    console.log(`🔄 Checking for newly unlocked achievements for user ${userId}...`);
    await checkAndUnlockAchievements(userId);

    // Get all achievements
    const allAchievements = await Achievement.findAll({
      order: [['achievement_id', 'ASC']]
    });

    // Get unlocked achievements
    const userAchievements = await UserAchievement.findAll({
      where: { user_id: userId },
      include: [{
        model: Achievement,
        as: 'achievement'
      }]
    });

    const unlockedMap = new Map(
      userAchievements.map(ua => [
        ua.achievement_id,
        {
          unlocked_at: ua.unlocked_at,
          is_equipped: ua.is_equipped || false
        }
      ])
    );

    // Calculate stats based on ACTUAL database requirement types
    const stats = await calculateUserStats(userId, user);

    // Map achievements with progress
    const achievementsWithProgress = allAchievements.map(achievement => {
      const userAchievement = unlockedMap.get(achievement.achievement_id);
      const isUnlocked = !!userAchievement;
      const unlockedAt = userAchievement?.unlocked_at;
      const isEquipped = userAchievement?.is_equipped || false;
      
      const reqType = achievement.requirement_type;
      const reqValue = achievement.requirement_value;
      const currentValue = stats[reqType] || 0;
      
      const progress = Math.min(
        Math.round((currentValue / reqValue) * 100),
        100
      );

      return {
        achievement_id: achievement.achievement_id,
        title: achievement.title,
        description: achievement.description,
        color: achievement.color,
        requirement_type: achievement.requirement_type,
        requirement_value: achievement.requirement_value,
        points_reward: achievement.points_reward,
        is_hidden: achievement.is_hidden,
        is_unlocked: isUnlocked,
        is_equipped: isEquipped,
        unlocked_at: unlockedAt,
        progress,
        current_value: currentValue
      };
    });

    return {
      achievements: achievementsWithProgress,
      totalUnlocked: userAchievements.length,
      totalAchievements: allAchievements.length
    };

  } catch (error) {
    console.error('Error getting user achievements:', error);
    throw error;
  }
}

/**
 * Equip an achievement for a user
 */
export async function equipUserAchievement(userId, achievementId) {
  try {
    console.log('Equipping achievement - User:', userId, 'Achievement:', achievementId);
    
    // First, check if the user has this achievement unlocked
    const userAchievement = await UserAchievement.findOne({
      where: { 
        user_id: userId,
        achievement_id: achievementId 
      }
    });

    if (!userAchievement) {
      throw new Error('User has not unlocked this achievement');
    }

    // First, unequip all achievements for this user
    await UserAchievement.update(
      { is_equipped: false },
      { 
        where: { 
          user_id: userId
        } 
      }
    );

    // Then equip the selected achievement
    await UserAchievement.update(
      { is_equipped: true },
      { 
        where: { 
          user_id: userId,
          achievement_id: achievementId 
        } 
      }
    );

    console.log('Successfully equipped achievement');
    return { success: true };
  } catch (error) {
    console.error('Error equipping achievement:', error);
    throw error;
  }
}

export default {
  checkAndUnlockAchievements,
  getUserAchievements,
  equipUserAchievement
};