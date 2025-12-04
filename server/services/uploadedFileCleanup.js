import cron from 'node-cron';
import File from '../models/File.js';
import { Op } from 'sequelize';
import { deleteFile } from './r2Service.js';

const FILE_EXPIRATION_DAYS = 7; // days

async function cleanupOldUploadedFiles() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - FILE_EXPIRATION_DAYS);

    const oldFiles = await File.findAll({
      where: {
        upload_date: {
          [Op.lte]: cutoff,
        }
      }
    });

    let deletedCount = 0;

    for (const f of oldFiles) {
      try {
        const key = f.file_path;

        // Delete file from R2 storage but keep DB record
        // This allows notes to keep the reference without breaking foreign key constraints
        if (key && !key.startsWith('/') && !key.startsWith('http') && key.startsWith('uploads/')) {
          try {
            await deleteFile(key);
            deletedCount++;
          } catch (err) {
            console.warn(`⚠️ [File Cleanup] Failed to delete R2 object ${key}:`, err.message || err);
          }
        }

        // Keep the database record - don't delete from file table
        // This prevents foreign key constraint errors with notes
      } catch (err) {
        console.error('❌ [File Cleanup] Error during file cleanup:', err);
      }
    }

    return deletedCount;
  } catch (err) {
    console.error('❌ [File Cleanup] Error during cleanup:', err);
    return 0;
  }
}

function startUploadedFileCleanup() {
  cleanupOldUploadedFiles();

  // Run daily at 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    await cleanupOldUploadedFiles();
  });
}

export { startUploadedFileCleanup, cleanupOldUploadedFiles, FILE_EXPIRATION_DAYS };
