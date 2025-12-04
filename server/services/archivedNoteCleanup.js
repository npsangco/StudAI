import cron from 'node-cron';
import Note from '../models/Note.js';
import { Op } from 'sequelize';

const ARCHIVE_EXPIRATION_DAYS = 140; // 20 weeks

/**
 * Delete archived notes that have been archived for more than 140 days
 */
async function cleanupExpiredArchivedNotes() {
  try {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - ARCHIVE_EXPIRATION_DAYS);

    const deletedCount = await Note.destroy({
      where: {
        is_archived: true,
        archived_at: {
          [Op.lte]: expirationDate,
          [Op.not]: null
        }
      }
    });

    // Cleanup completed

    return deletedCount;
  } catch (error) {
    console.error('❌ [Archive Cleanup] Error cleaning up archived notes:', error);
    return 0;
  }
}

/**
 * Get count of archived notes that will expire soon (within 7 days)
 */
async function getNotesExpiringSoon(userId) {
  try {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - ARCHIVE_EXPIRATION_DAYS);

    const warnDate = new Date();
    warnDate.setDate(warnDate.getDate() - (ARCHIVE_EXPIRATION_DAYS - 7)); // 7 days before expiration

    const count = await Note.count({
      where: {
        user_id: userId,
        is_archived: true,
        archived_at: {
          [Op.between]: [expirationDate, warnDate],
          [Op.not]: null
        }
      }
    });

    return count;
  } catch (error) {
    console.error('❌ [Archive Cleanup] Error getting expiring notes:', error);
    return 0;
  }
}

/**
 * Get days remaining until an archived note expires
 */
function getDaysUntilExpiration(archivedAt) {
  if (!archivedAt) return null;

  const archived = new Date(archivedAt);
  const expirationDate = new Date(archived);
  expirationDate.setDate(expirationDate.getDate() + ARCHIVE_EXPIRATION_DAYS);

  const today = new Date();
  const daysRemaining = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

  return Math.max(0, daysRemaining);
}

/**
 * Start the cron job to clean up expired archived notes
 * Runs immediately on startup, then daily at 12:00 AM (midnight)
 */
function startArchivedNoteCleanup() {
  // Run immediately on startup
  console.log('🔄 [Archive Cleanup] Running initial cleanup...');
  cleanupExpiredArchivedNotes();

  // Run daily at 12:00 AM (midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 [Archive Cleanup] Running scheduled cleanup...');
    await cleanupExpiredArchivedNotes();
  });

  console.log('✅ [Archive Cleanup] Scheduled job started (runs daily at 12:00 AM)');
  console.log(`📅 [Archive Cleanup] Archived notes expire after ${ARCHIVE_EXPIRATION_DAYS} days (20 weeks)`);
}

export {
  startArchivedNoteCleanup,
  cleanupExpiredArchivedNotes,
  getNotesExpiringSoon,
  getDaysUntilExpiration,
  ARCHIVE_EXPIRATION_DAYS
};
