// noteRoutes.js - Updated with Pet Buddy v2.1 Points System
import express from 'express';
import { Op } from 'sequelize';
import sequelize from '../db.js';
import Note from '../models/Note.js';
import File from '../models/File.js';
import SharedNote from '../models/SharedNote.js';
import NoteCategory from '../models/NoteCategory.js';
import User from '../models/User.js';
import UserDailyStat from '../models/UserDailyStat.js';

const router = express.Router();

// ============================================
// CONFIGURATION (Pet Buddy v2.1)
// ============================================

const NOTE_CONFIG = {
  points: {
    amount: 50,
    dailyCap: 3,
    capMessage: "Daily note limit reached (3/3). Come back tomorrow for more points!"
  },
  exp: {
    create: 15,      // EXP for creating a note
    aiSummary: 25,   // EXP for AI-generated summary (counts as create)
    unlimited: true  // No daily cap on EXP
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
};

const formatNoteForFrontend = (note) => {
  const noteData = note.toJSON ? note.toJSON() : note;
  return {
    ...noteData,
    created_at: noteData.createdAt,
    words: noteData.content ? noteData.content.split(/\s+/).length : 0,
    is_shared: noteData.is_shared || false,
    is_pinned: noteData.is_pinned || false
  };
};

function generateShareCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function checkAndResetDailyCaps(userId) {
  const user = await User.findByPk(userId);
  const today = new Date().toISOString().split('T')[0];
  
  if (!user.daily_reset_date || user.daily_reset_date !== today) {
    await user.update({
      daily_notes_count: 0,
      daily_quizzes_count: 0,
      daily_tasks_count: 0,
      daily_reset_date: today
    });
  }
  
  return user;
}

async function logDailyStats(userId, activityType, points, exp = 0) {
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
  
  const updates = {
    points_earned_today: dailyStat.points_earned_today + points,
    exp_earned_today: dailyStat.exp_earned_today + exp
  };
  
  if (activityType === 'note') {
    updates.notes_created_today = dailyStat.notes_created_today + 1;
  }
  
  await dailyStat.update(updates);
  return dailyStat;
}

async function checkAchievements(userId) {
  try {
    const { checkAndUnlockAchievements } = await import('../services/achievementServices.js');
    return await checkAndUnlockAchievements(userId);
  } catch (err) {
    console.log('Achievement service not available:', err.message);
    return [];
  }
}

async function awardPetExp(userId, expAmount) {
  try {
    const PetCompanion = (await import('../models/PetCompanion.js')).default;
    const pet = await PetCompanion.findOne({ where: { user_id: userId } });
    
    if (!pet) {
      return null; // User hasn't adopted a pet yet
    }

    // Max level is 50
    if (pet.level >= 50) {
      return { leveledUp: false, currentLevel: 50, message: 'Pet is at max level!' };
    }

    let newExp = pet.experience_points + expAmount;
    let newLevel = pet.level;
    let levelsGained = 0;
    
    // EXP formula: 100 × 1.08^(level-1)
    const getExpNeeded = (level) => Math.floor(100 * Math.pow(1.08, level - 1));
    let expNeeded = getExpNeeded(newLevel);

    while (newExp >= expNeeded && newLevel < 50) {
      newExp -= expNeeded;
      newLevel++;
      levelsGained++;
      expNeeded = getExpNeeded(newLevel);
    }

    await pet.update({
      experience_points: newExp,
      level: newLevel,
      last_updated: new Date()
    });

    return {
      leveledUp: levelsGained > 0,
      levelsGained,
      currentLevel: newLevel,
      expGained: expAmount
    };
  } catch (err) {
    console.error('Failed to award pet EXP:', err);
    return null;
  }
}

// ============================================
// CATEGORY ROUTES
// ============================================

router.get('/categories', requireAuth, async (req, res) => {
  try {
    const categories = await NoteCategory.findAll({
      where: { user_id: req.session.userId },
      order: [['name', 'ASC']]
    });

    res.json({ categories });
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', requireAuth, async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existing = await NoteCategory.findOne({
      where: { 
        user_id: req.session.userId,
        name: name.trim()
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const category = await NoteCategory.create({
      user_id: req.session.userId,
      name: name.trim(),
      color: color || '#3B82F6'
    });

    res.status(201).json({ category });
  } catch (err) {
    console.error('Failed to create category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// ============================================
// NOTES ROUTES (WITH DAILY CAPS)
// ============================================

router.get('/', requireAuth, async (req, res) => {
  try {
    const notes = await Note.findAll({
      where: { user_id: req.session.userId },
      include: [{
        model: NoteCategory,
        as: 'category',
        attributes: ['category_id', 'name', 'color'],
        required: false
      }],
      order: [
        ['is_pinned', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    const notesWithExtras = notes.map(note => {
      const formatted = formatNoteForFrontend(note);
      if (note.category) {
        formatted.category = {
          category_id: note.category.category_id,
          name: note.category.name,
          color: note.category.color
        };
      }
      return formatted;
    });

    res.json({ notes: notesWithExtras });
  } catch (err) {
    console.error('Failed to fetch notes:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.post('/create', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { title, content, file_id, category_id } = req.body;
    
    // Check and reset daily caps
    const user = await checkAndResetDailyCaps(userId);
    
    // Validate category if provided
    if (category_id) {
      const category = await NoteCategory.findOne({
        where: {
          category_id: category_id,
          user_id: userId
        }
      });

      if (!category) {
        return res.status(400).json({ error: 'Invalid category' });
      }
    }

    const newNote = await Note.create({
      user_id: userId,
      file_id: file_id || null,
      category_id: category_id || null,
      title,
      content: content || '',
      is_pinned: false
    });

    // Award points if under daily cap
    let pointsEarned = 0;
    let expEarned = NOTE_CONFIG.exp.create; // Always award EXP (15)
    let dailyCapReached = false;
    let remainingNotes = 0;
    let petLevelUp = null;
    
    // Handle case where daily_notes_count might be undefined
    const currentNoteCount = user.daily_notes_count || 0;
    console.log('Before increment - daily_notes_count:', currentNoteCount);
    
    if (currentNoteCount < NOTE_CONFIG.points.dailyCap) {
      pointsEarned = NOTE_CONFIG.points.amount;
      
      // Award points
      await User.increment('points', {
        by: pointsEarned,
        where: { user_id: userId }
      });
      
      // Increment daily count - handle both cases (field exists or not)
      if (user.daily_notes_count !== undefined) {
        await user.increment('daily_notes_count');
      } else {
        // If field doesn't exist, set it to 1
        await User.update(
          { daily_notes_count: 1 },
          { where: { user_id: userId } }
        );
      }
      
      const updatedUser = await User.findByPk(userId); // ⬅️ REFRESH USER
      
      const updatedNoteCount = updatedUser.daily_notes_count || 1;
      console.log('After increment - daily_notes_count:', updatedNoteCount);
      
      // Calculate remaining notes with updated count
      remainingNotes = Math.max(0, NOTE_CONFIG.points.dailyCap - updatedNoteCount);
      
      // Log daily stats with EXP
      await logDailyStats(userId, 'note', pointsEarned, expEarned);
      
      // Check achievements
      await checkAchievements(userId);
    } else {
      dailyCapReached = true;
      remainingNotes = 0;
    }

    // Award EXP to pet (always, even if points cap reached)
    petLevelUp = await awardPetExp(userId, expEarned);

    // Fetch the note with category info
    const noteWithCategory = await Note.findOne({
      where: { note_id: newNote.note_id },
      include: [{
        model: NoteCategory,
        as: 'category',
        attributes: ['category_id', 'name', 'color'],
        required: false
      }]
    });

    const noteWithExtras = formatNoteForFrontend(noteWithCategory);
    if (noteWithCategory.category) {
      noteWithExtras.category = {
        category_id: noteWithCategory.category.category_id,
        name: noteWithCategory.category.name,
        color: noteWithCategory.category.color
      };
    }

    res.status(201).json({ 
      note: noteWithExtras,
      pointsEarned,
      expEarned,
      petLevelUp,
      dailyCapReached,
      remainingNotes: remainingNotes,
      message: dailyCapReached 
        ? `${NOTE_CONFIG.points.capMessage} (Still earned ${expEarned} EXP!)`
        : `Note created! Earned ${pointsEarned} points and ${expEarned} EXP!`
    });
  } catch (err) {
    console.error('Failed to create note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, content, category_id } = req.body;
    const noteId = req.params.id;

    const note = await Note.findOne({
      where: { 
        note_id: noteId,
        user_id: req.session.userId 
      }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (category_id) {
      const category = await NoteCategory.findOne({
        where: {
          category_id: category_id,
          user_id: req.session.userId
        }
      });

      if (!category) {
        return res.status(400).json({ error: 'Invalid category' });
      }
    }

    await note.update({ 
      title, 
      content,
      category_id: category_id !== undefined ? category_id : note.category_id
    });

    const updatedNote = await Note.findOne({
      where: { note_id: noteId },
      include: [{
        model: NoteCategory,
        as: 'category',
        attributes: ['category_id', 'name', 'color'],
        required: false
      }]
    });

    const noteWithExtras = formatNoteForFrontend(updatedNote);
    if (updatedNote.category) {
      noteWithExtras.category = {
        category_id: updatedNote.category.category_id,
        name: updatedNote.category.name,
        color: updatedNote.category.color
      };
    }

    res.json({ note: noteWithExtras });
  } catch (err) {
    console.error('Failed to update note:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.session.userId;

    console.log(`🗑️ Attempting to delete note ${noteId} for user ${userId}`);

    const note = await Note.findOne({
      where: { 
        note_id: noteId,
        user_id: userId
      }
    });

    if (!note) {
      console.log(`❌ Note not found: ${noteId}`);
      return res.status(404).json({ error: 'Note not found' });
    }

    console.log(`✓ Found note: ${noteId}, file_id: ${note.file_id}`);

    // =====================================
    // CAPTURE FILE INFO BEFORE DELETION
    // =====================================
    const noteFileId = note.file_id;
    console.log(`📝 Captured file_id for cleanup: ${noteFileId}`);

    // =====================================
    // DELETE NOTE FIRST (remove FK constraint)
    // =====================================
    await note.destroy();
    console.log(`✅ Note ${noteId} destroyed successfully`);

    // =====================================
    // FILE CLEANUP LOGIC (after note deletion)
    // =====================================
    
    // Strategy 1: Delete the file if this note had a file_id
    if (noteFileId) {
      console.log(`📋 Strategy 1: Direct file_id match. Checking for other notes using file ${noteFileId}...`);
      
      const otherNotesWithFile = await Note.count({
        where: {
          file_id: noteFileId,
          user_id: userId
        }
      });

      console.log(`   Found ${otherNotesWithFile} other note(s) using file ${noteFileId}`);

      if (otherNotesWithFile === 0) {
        console.log(`🔍 Deleting file ${noteFileId} from File table...`);
        console.log(`📊 Delete query: file_id=${noteFileId}, user_id=${userId}`);
        try {
          const fileToDelete = await File.findOne({
            where: {
              file_id: noteFileId,
              user_id: userId
            }
          });
          
          if (!fileToDelete) {
            console.log(`⚠️  File not found: file_id=${noteFileId}, user_id=${userId}`);
          } else {
            console.log(`✓ Found file to delete:`, fileToDelete.dataValues);
            
            const destroyResult = await File.destroy({
              where: {
                file_id: noteFileId,
                user_id: userId
              },
              force: true
            });
            console.log(`✅ Destroyed ${destroyResult} file record(s)`);
          }
        } catch (deleteErr) {
          console.error(`❌ Error deleting file:`, deleteErr.message);
        }
      } else {
        console.log(`⏳ File ${noteFileId} still in use by ${otherNotesWithFile} other note(s)`);
      }
    } else {
      // Strategy 2: After note deletion, check for orphaned files
      console.log(`📋 Strategy 2: Note had no file_id. Checking for orphaned files...`);
      
      try {
        // Get all file IDs that are currently referenced by any note for this user
        const referencedFileIds = await Note.findAll({
          where: {
            user_id: userId,
            file_id: { [Op.not]: null }
          },
          attributes: ['file_id'],
          raw: true
        });
        
        const referencedIds = referencedFileIds.map(n => n.file_id);
        console.log(`   Files still referenced: [${referencedIds.join(', ')}]`);
        
        // Find files that aren't referenced by any note
        const orphanedFiles = await File.findAll({
          where: {
            user_id: userId,
            file_id: referencedIds.length > 0 ? { [Op.notIn]: referencedIds } : {} // If no referenced files, all are orphaned
          }
        });
        
        if (orphanedFiles.length > 0) {
          console.log(`   Found ${orphanedFiles.length} orphaned file(s)`);
          
          const orphanedFileIds = orphanedFiles.map(f => f.file_id);
          const destroyCount = await File.destroy({
            where: {
              file_id: { [Op.in]: orphanedFileIds },
              user_id: userId
            }
          });
          
          console.log(`✅ Deleted ${destroyCount} orphaned file(s): [${orphanedFileIds.join(', ')}]`);
        } else {
          console.log(`ℹ️  No orphaned files found`);
        }
      } catch (orphanErr) {
        console.error(`⚠️  Error checking orphaned files:`, orphanErr.message);
      }
    }
    console.log(`✅ Note ${noteId} destroyed successfully`);
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ============================================
// SHARED NOTES ROUTES
// ============================================

router.post('/:id/share', requireAuth, async (req, res) => {
  try {
    const noteId = req.params.id;

    const note = await Note.findOne({
      where: { 
        note_id: noteId,
        user_id: req.session.userId 
      }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    let sharedNote = await SharedNote.findOne({
      where: { 
        note_id: noteId,
        isActive: true
      }
    });

    if (sharedNote) {
      return res.json({ 
        shareCode: sharedNote.share_code,
        message: 'Note already shared'
      });
    }

    let shareCode;
    let isUnique = false;
    while (!isUnique) {
      shareCode = generateShareCode();
      const existing = await SharedNote.findOne({
        where: { share_code: shareCode }
      });
      if (!existing) isUnique = true;
    }

    sharedNote = await SharedNote.create({
      user_id: req.session.userId,
      note_id: noteId,
      share_code: shareCode,
      isActive: true
    });

    res.json({ 
      shareCode: shareCode,
      message: 'Note shared successfully'
    });

  } catch (err) {
    console.error('Failed to share note:', err);
    res.status(500).json({ error: 'Failed to share note' });
  }
});

router.post('/shared/retrieve', requireAuth, async (req, res) => {
  try {
    const { shareCode } = req.body;

    if (!shareCode || shareCode.trim().length !== 6) {
      return res.status(400).json({ error: 'Invalid share code' });
    }

    const sharedNote = await SharedNote.findOne({
      where: { 
        share_code: shareCode.toUpperCase(),
        isActive: true
      },
      include: [{
        model: Note,
        as: 'note'
      }]
    });

    if (!sharedNote) {
      return res.status(404).json({ error: 'Shared note not found or expired' });
    }

    const originalNote = sharedNote.note;

    const existingNote = await Note.findOne({
      where: {
        user_id: req.session.userId,
        title: `${originalNote.title} (Shared)`,
        content: originalNote.content
      }
    });

    if (existingNote) {
      return res.status(409).json({ error: 'You already have this shared note' });
    }

    const newNote = await Note.create({
      user_id: req.session.userId,
      file_id: null,
      category_id: null,
      title: `${originalNote.title} (Shared)`,
      content: originalNote.content
    });

    const noteWithExtras = formatNoteForFrontend(newNote);
    noteWithExtras.is_shared = true;

    res.json({ 
      note: noteWithExtras,
      message: 'Shared note retrieved successfully'
    });

  } catch (err) {
    console.error('Failed to retrieve shared note:', err);
    res.status(500).json({ error: 'Failed to retrieve shared note' });
  }
});

router.get('/shared/my-shares', requireAuth, async (req, res) => {
  try {
    const sharedNotes = await SharedNote.findAll({
      where: { 
        user_id: req.session.userId,
        isActive: true
      },
      include: [{
        model: Note,
        as: 'note'
      }],
      order: [['createdAt', 'DESC']]
    });

    const formattedShares = sharedNotes.map(share => ({
      share_code: share.share_code,
      note_id: share.note_id,
      title: share.note.title,
      created_at: share.createdAt,
      note_created_at: share.note.createdAt
    }));

    res.json({ shares: formattedShares });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shared notes' });
  }
});

router.delete('/:id/share', requireAuth, async (req, res) => {
  try {
    const noteId = req.params.id;
    
    const result = await SharedNote.update(
      { isActive: false },
      { 
        where: { 
          note_id: noteId,
          user_id: req.session.userId,
          isActive: true
        }
      }
    );

    if (result[0] === 0) {
      return res.status(404).json({ error: 'Shared note not found' });
    }

    res.json({ message: 'Share deactivated successfully' });

  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate share' });
  }
});

router.post('/:id/pin', requireAuth, async (req, res) => {
  try {
    const noteId = req.params.id;

    const note = await Note.findOne({
      where: { 
        note_id: noteId,
        user_id: req.session.userId 
      }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await note.update({ is_pinned: true });

    const noteWithExtras = formatNoteForFrontend(note);
    res.json({ 
      note: noteWithExtras,
      message: 'Note pinned successfully'
    });
  } catch (err) {
    console.error('Failed to pin note:', err);
    res.status(500).json({ error: 'Failed to pin note' });
  }
});

router.post('/:id/unpin', requireAuth, async (req, res) => {
  try {
    const noteId = req.params.id;

    const note = await Note.findOne({
      where: { 
        note_id: noteId,
        user_id: req.session.userId 
      }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await note.update({ is_pinned: false });

    const noteWithExtras = formatNoteForFrontend(note);
    res.json({ 
      note: noteWithExtras,
      message: 'Note unpinned successfully'
    });
  } catch (err) {
    console.error('Failed to unpin note:', err);
    res.status(500).json({ error: 'Failed to unpin note' });
  }
});

export default router;