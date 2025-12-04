/**
 * SIMPLIFIED Battle Cleanup Service
 * 
 * NO Firebase Admin needed!
 * Uses existing MySQL queries to identify and clean up orphaned battles
 * Client-side Firebase cleanup already handles the Firebase part
 */

import { Op } from 'sequelize';
import QuizBattle from '../models/QuizBattle.js';
import BattleParticipant from '../models/BattleParticipant.js';
import sequelize from '../db.js';

// Configuration
const CLEANUP_CONFIG = {
  // Battles waiting for more than 30 minutes
  WAITING_TIMEOUT_MINUTES: 30,
  
  // Battles in progress for more than 2 hours (stuck/abandoned)
  IN_PROGRESS_TIMEOUT_HOURS: 2,
  
  // Run every 15 minutes
  INTERVAL_MS: 15 * 60 * 1000,
  
  // Enable/disable logging
  VERBOSE_LOGGING: false
};

/**
 * Clean up abandoned battles in MySQL ONLY
 * Client-side code already handles Firebase cleanup
 */
async function cleanupAbandonedBattles() {
  const transaction = await sequelize.transaction();
  
  try {
    const now = new Date();
    
    // Calculate timeout timestamps
    const waitingTimeout = new Date(now.getTime() - CLEANUP_CONFIG.WAITING_TIMEOUT_MINUTES * 60 * 1000);
    const inProgressTimeout = new Date(now.getTime() - CLEANUP_CONFIG.IN_PROGRESS_TIMEOUT_HOURS * 60 * 60 * 1000);
    
    // Find abandoned battles
    const abandonedBattles = await QuizBattle.findAll({
      where: {
        [Op.or]: [
          // Waiting battles older than 30 minutes
          {
            status: 'waiting',
            created_at: {
              [Op.lt]: waitingTimeout
            }
          },
          // In-progress battles older than 2 hours (likely abandoned)
          {
            status: 'in_progress',
            started_at: {
              [Op.lt]: inProgressTimeout
            }
          }
        ]
      },
      transaction
    });
    
    if (abandonedBattles.length === 0) {
      if (CLEANUP_CONFIG.VERBOSE_LOGGING) {
        console.log('✅ Battle cleanup: No abandoned battles found');
      }
      await transaction.commit();
      return { cleaned: 0, battles: [] };
    }
    
    const cleanedBattles = [];
    
    for (const battle of abandonedBattles) {
      try {
        // Delete participants first (foreign key constraint)
        await BattleParticipant.destroy({
          where: { battle_id: battle.battle_id },
          transaction
        });
        
        // Delete battle
        await battle.destroy({ transaction });
        
        cleanedBattles.push({
          gamePin: battle.game_pin,
          status: battle.status,
          createdAt: battle.created_at
        });
        
        console.log(`🗑️ Cleaned MySQL battle: ${battle.game_pin} (${battle.status})`);
      } catch (error) {
        console.error(`❌ Error cleaning battle ${battle.battle_id}:`, error.message);
      }
    }
    
    await transaction.commit();
    
    console.log(`✅ Successfully cleaned ${cleanedBattles.length} battles from MySQL`);
    console.log('   Note: Firebase cleanup is handled by client-side code');
    
    return {
      cleaned: cleanedBattles.length,
      battles: cleanedBattles
    };
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ MySQL battle cleanup failed:', error);
    throw error;
  }
}

/**
 * Start periodic cleanup (simple setInterval)
 */
let cleanupInterval = null;

export function startBattleCleanup() {
  // Run immediately on startup (after 10 seconds)
  setTimeout(async () => {
    try {
      await cleanupAbandonedBattles();
    } catch (error) {
      console.error('❌ Initial cleanup failed:', error.message);
    }
  }, 10000);
  
  // Then run periodically
  cleanupInterval = setInterval(async () => {
    try {
      await cleanupAbandonedBattles();
    } catch (error) {
      console.error('❌ Periodic cleanup failed:', error.message);
    }
  }, CLEANUP_CONFIG.INTERVAL_MS);
  
  return cleanupInterval;
}

/**
 * Stop cleanup service (for graceful shutdown)
 */
export function stopBattleCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('🛑 Battle cleanup service stopped');
  }
}

/**
 * Manual cleanup trigger (for admin endpoints)
 */
export async function triggerManualCleanup() {
  try {
    console.log('\n🧹 Manual battle cleanup triggered...');
    const startTime = Date.now();
    
    const result = await cleanupAbandonedBattles();
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Manual cleanup completed in ${duration}ms\n`);
    
    return {
      success: true,
      cleaned: result.cleaned,
      battles: result.battles,
      duration
    };
    
  } catch (error) {
    console.error('❌ Manual cleanup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  startBattleCleanup,
  stopBattleCleanup,
  triggerManualCleanup,
  CLEANUP_CONFIG
};
