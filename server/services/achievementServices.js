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

    // Calculate current stats based on ACTUAL database requirement types
    const stats = await calculateUserStats(userId, user);

    const newlyUnlocked = [];

    // Check each locked achievement
    for (const achievement of lockedAchievements) {
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
  const [
    notesCount,
    quizzesCount,
    battlesWonCount,
    filesUploadedCount,
    sessionsHostedCount
  ] = await Promise.all([
    Note.count({ where: { user_id: userId } }),
    QuizAttempt.count({ where: { user_id: userId } }),
    BattleParticipant.count({ 
      where: { user_id: userId, is_winner: true } 
    }),
    File.count({ where: { user_id: userId } }),
    Session.count({ where: { user_id: userId } })
  ]);

  return {
    points: user.points || 0,
    streak: user.study_streak || 0,
    notes_created: notesCount,
    quizzes_completed: quizzesCount,
    battles_won: battlesWonCount,
    files_uploaded: filesUploadedCount,
    sessions_hosted: sessionsHostedCount
  };
}

/**
 * Check if achievement requirement is met
 */
function checkAchievementRequirement(achievement, stats) {
  const reqType = achievement.requirement_type;
  const reqValue = achievement.requirement_value;
  const currentValue = stats[reqType] || 0;

  return currentValue >= reqValue;
}

/**
 * Get user achievements with progress
 */
export async function getUserAchievements(userId) {
  try {
    const user = await User.findByPk(userId);

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