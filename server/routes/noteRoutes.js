// Note routes with Pet Buddy points system
import express from 'express';
import fs from 'fs';
import Note from '../models/Note.js';
import SharedNote from '../models/SharedNote.js';
import NoteCategory from '../models/NoteCategory.js';
import User from '../models/User.js';
import UserDailyStat from '../models/UserDailyStat.js';
import File from '../models/File.js';
import { validateNoteRequest, validateTitle, validateNumericId } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Pet Buddy configuration
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
  
  return res.status(401).json({ 
    error: 'Authentication required. Please log in.',
    authRequired: true 
  });
};

// Format note data for frontend
const formatNoteForFrontend = (note) => {
  const noteData = note.toJSON ? note.toJSON() : note;
  return {
    ...noteData,
    created_at: noteData.createdAt,
    words: noteData.content ? noteData.content.split(/\s+/).length : 0,
    is_shared: noteData.is_shared || false,
    is_pinned: noteData.is_pinned || false,
    is_archived: Boolean(noteData.is_archived ?? noteData.isArchived),
    archived_at: noteData.archived_at || noteData.archivedAt || null
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

// Get or create daily stats for user
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

// Log activity and update daily stats
async function logDailyStats(userId, activityType, points, exp = 0) {
  console.log('📊 Logging daily stats:', { userId, activityType, points, exp });
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
  
  if (created) {
    console.log('📊 Created new daily stat record for today');
  }
  
  const updates = {
    points_earned_today: dailyStat.points_earned_today + points,
    exp_earned_today: dailyStat.exp_earned_today + exp
  };
  
  if (activityType === 'note') {
    updates.notes_created_today = dailyStat.notes_created_today + 1;
  }
  
  console.log('📊 Updating daily stats with:', updates);
  await dailyStat.update(updates);
  await dailyStat.reload(); // Refresh to get updated values
  console.log('📊 Daily stats after update:', {
    notes: dailyStat.notes_created_today,
    quizzes: dailyStat.quizzes_completed_today,
    points: dailyStat.points_earned_today,
    exp: dailyStat.exp_earned_today
  });
  return dailyStat;
}

// Trigger achievement check
async function checkAchievements(userId) {
  try {
    const { checkAndUnlockAchievements } = await import('../services/achievementServices.js');
    return await checkAndUnlockAchievements(userId);
  } catch (err) {
    console.log('Achievement service not available:', err.message);
    return [];
  }
}

// Award EXP to pet companion with level-up handling
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

// Get all note categories for user
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

// Create new note category
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

// Get all notes for user (with filters)
router.get('/', requireAuth, async (req, res) => {
  try {
    const status = (req.query.status || 'all').toLowerCase();
    const whereClause = { user_id: req.session.userId };

    if (status === 'active') {
      whereClause.is_archived = false;
    } else if (status === 'archived') {
      whereClause.is_archived = true;
    } else if (status !== 'all') {
      return res.status(400).json({ error: 'Invalid status filter. Use active, archived, or all.' });
    }

    const order = status === 'archived'
      ? [['archived_at', 'DESC']]
      : [
          ['is_pinned', 'DESC'],
          ['createdAt', 'DESC']
        ];

    const limit = status === 'all' ? undefined : 10;

    const notes = await Note.findAll({
      where: whereClause,
      include: [{
        model: NoteCategory,
        as: 'category',
        attributes: ['category_id', 'name', 'color'],
        required: false
      }],
      order,
      limit
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

// Create new note with rewards (daily cap applies)
router.post('/create', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { title, content, file_id, category_id } = req.body;
    
    // Validate character count (5000 characters max for storage optimization)
    if (content) {
      const charCount = content.length;
      if (charCount > 5000) {
        return res.status(400).json({ 
          error: 'Note content exceeds 5000 character limit',
          charCount: charCount,
          maxChars: 5000
        });
      }
    }

    const unarchivedCount = await Note.count({
      where: { user_id: userId, is_archived: false }
    });
    if (unarchivedCount >= 10) {
      return res.status(400).json({ error: 'Note library limit reached (10 active notes). Archive some notes to create new ones.' });
    }
    
    // Get daily stats
    const dailyStats = await getDailyStats(userId);
    
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
      is_pinned: false,
      is_archived: false,
      archived_at: null
    });

    // Award points if under daily cap
    let pointsEarned = 0;
    let expEarned = NOTE_CONFIG.exp.create; // Always award EXP (15)
    let dailyCapReached = false;
    let remainingNotes = 0;
    let petLevelUp = null;
    
    // Check if under daily cap
    const currentNoteCount = dailyStats.notes_created_today;
    console.log('Before increment - notes_created_today:', currentNoteCount);
    
    if (currentNoteCount < NOTE_CONFIG.points.dailyCap) {
      pointsEarned = NOTE_CONFIG.points.amount;
      
      // Award points
      await User.increment('points', {
        by: pointsEarned,
        where: { user_id: userId }
      });
      
      // Log daily stats (increments notes_created_today and adds points/EXP)
      const updatedStats = await logDailyStats(userId, 'note', pointsEarned, expEarned);
      
      console.log('After increment - notes_created_today:', updatedStats.notes_created_today);
      
      // Calculate remaining notes with updated count
      remainingNotes = Math.max(0, NOTE_CONFIG.points.dailyCap - updatedStats.notes_created_today);
      
      // Check achievements
      await checkAchievements(userId);
    } else {
      dailyCapReached = true;
      remainingNotes = 0;
      
      // Still log EXP even if no points (for daily stats tracking)
      await logDailyStats(userId, 'note', 0, expEarned);
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

// Archive all notes for user
router.post('/archive-all', requireAuth, async (req, res) => {
  try {
    const [archivedCount] = await Note.update(
      { is_archived: true, archived_at: new Date(), is_pinned: false },
      {
        where: {
          user_id: req.session.userId,
          is_archived: false
        }
      }
    );

    res.json({
      archivedCount,
      message: archivedCount > 0
        ? `Archived ${archivedCount} note${archivedCount === 1 ? '' : 's'}`
        : 'No notes were archived'
    });
  } catch (err) {
    console.error('Failed to archive notes:', err);
    res.status(500).json({ error: 'Failed to archive notes' });
  }
});

// Archive a single note
router.post('/:id/archive', requireAuth, async (req, res) => {
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

    if (note.is_archived) {
      return res.status(400).json({ error: 'Note is already archived' });
    }

    await note.update({
      is_archived: true,
      archived_at: new Date(),
      is_pinned: false
    });

    const noteWithExtras = formatNoteForFrontend(note);
    res.json({ note: noteWithExtras, message: 'Note archived successfully' });
  } catch (err) {
    console.error('Failed to archive note:', err);
    res.status(500).json({ error: 'Failed to archive note' });
  }
});

// Restore archived note
router.post('/:id/restore', requireAuth, async (req, res) => {
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

    if (!note.is_archived) {
      return res.status(400).json({ error: 'Note is not archived' });
    }

    await note.update({
      is_archived: false,
      archived_at: null
    });

    const noteWithExtras = formatNoteForFrontend(note);
    res.json({ note: noteWithExtras, message: 'Note restored successfully' });
  } catch (err) {
    console.error('Failed to restore note:', err);
    res.status(500).json({ error: 'Failed to restore note' });
  }
});

// Update note content or metadata
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, content, category_id } = req.body;
    const noteId = req.params.id;

    // Validate character count (5000 characters max for storage optimization)
    if (content) {
      const charCount = content.length;
      if (charCount > 5000) {
        return res.status(400).json({ 
          error: 'Note content exceeds 5000 character limit',
          charCount: charCount,
          maxChars: 5000
        });
      }
    }

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

// Delete note permanently
router.delete('/:id', requireAuth, async (req, res) => {
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

    if (!note.is_archived) {
      return res.status(400).json({ error: 'Archive this note before deleting permanently' });
    }

    const attachedFileId = note.file_id;
    await note.destroy();

    if (attachedFileId) {
      try {
        const fileRecord = await File.findOne({
          where: {
            file_id: attachedFileId,
            user_id: req.session.userId
          }
        });

        if (fileRecord) {
          if (fileRecord.file_path && fs.existsSync(fileRecord.file_path)) {
            fs.unlinkSync(fileRecord.file_path);
          }
          await fileRecord.destroy();
        }
      } catch (fileErr) {
        console.error('Failed to delete attached file during note removal:', fileErr);
      }
    }

    res.json({ message: 'Note deleted successfully', deletedFileId: attachedFileId || null });
  } catch (err) {
    console.error('Failed to delete note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Share note with generated code
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

// Retrieve shared note by code
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
      include: [
        {
          model: Note,
          as: 'sharedNote'
        },
        {
          model: User,
          as: 'sharer',
          attributes: ['user_id', 'username', 'email']
        }
      ]
    });

    if (!sharedNote) {
      return res.status(404).json({ error: 'Shared note not found or expired' });
    }

    const originalNote = sharedNote.sharedNote;
    const sharer = sharedNote.sharer;

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

    // Check note limit (10 active notes max)
    const unarchivedCount = await Note.count({
      where: { user_id: req.session.userId, is_archived: false }
    });
    if (unarchivedCount >= 10) {
      return res.status(400).json({ error: 'Note library limit reached (10 active notes). Archive some notes to create new ones.' });
    }

    // Add attribution to the content
    const attributionText = `\n\n---\nShared by: ${sharer.username} (${sharer.email})\nAcademic Integrity Reminder: This note was shared for collaborative learning. Always provide proper attribution and use it ethically in accordance with your institution's academic integrity policies.`;

    const newNote = await Note.create({
      user_id: req.session.userId,
      file_id: null,
      category_id: null,
      title: `${originalNote.title} (Shared)`,
      content: originalNote.content + attributionText
    });

    const noteWithExtras = formatNoteForFrontend(newNote);
    noteWithExtras.is_shared = true;
    noteWithExtras.shared_by = {
      username: sharer.username,
      email: sharer.email
    };

    res.json({ 
      note: noteWithExtras,
      message: 'Shared note retrieved successfully'
    });

  } catch (err) {
    console.error('Failed to retrieve shared note:', err);
    res.status(500).json({ error: 'Failed to retrieve shared note' });
  }
});

// Get all notes shared by user
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

// Remove share for a note
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

// Pin note to top
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

    if (note.is_archived) {
      return res.status(400).json({ error: 'Cannot pin an archived note' });
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

// Unpin note
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