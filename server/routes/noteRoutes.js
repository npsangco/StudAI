import express from 'express';
import Note from '../models/Note.js';
import SharedNote from '../models/SharedNote.js';

const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
};

// Helper function to add computed fields for frontend
const formatNoteForFrontend = (note) => {
  const noteData = note.toJSON ? note.toJSON() : note;
  return {
    ...noteData,
    created_at: noteData.createdAt,
    words: noteData.content ? noteData.content.split(/\s+/).length : 0,
    is_shared: noteData.is_shared || false
  };
};

// Generate a random 6-character alphanumeric code
function generateShareCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// NOTES ROUTES
// Get all notes for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const notes = await Note.findAll({
      where: { user_id: req.session.userId },
      order: [['createdAt', 'DESC']]
    });

    const notesWithExtras = notes.map(formatNoteForFrontend);
    res.json({ notes: notesWithExtras });
  } catch (err) {
    console.error('Failed to fetch notes:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Create a new note
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { title, content, file_id } = req.body;
    
    const newNote = await Note.create({
      user_id: req.session.userId,
      file_id: file_id || null,
      title,
      content: content || ''
    });

    const noteWithExtras = formatNoteForFrontend(newNote);
    res.status(201).json({ note: noteWithExtras });
  } catch (err) {
    console.error('Failed to create note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update a note
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, content } = req.body;
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

    await note.update({ title, content });

    const noteWithExtras = formatNoteForFrontend(note);
    res.json({ note: noteWithExtras });
  } catch (err) {
    console.error('Failed to update note:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete a note
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

    await note.destroy();
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error('Failed to delete note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// SHARED NOTES ROUTES
// Share a note - generates a share code
router.post('/:id/share', requireAuth, async (req, res) => {
  try {
    const noteId = req.params.id;

    // Verify the note belongs to the user
    const note = await Note.findOne({
      where: { 
        note_id: noteId,
        user_id: req.session.userId 
      }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Check if already shared
    let sharedNote = await SharedNote.findOne({
      where: { 
        note_id: noteId,
        isActive: true
      }
    });

    if (sharedNote) {
      // Return existing share code
      return res.json({ 
        shareCode: sharedNote.share_code,
        message: 'Note already shared'
      });
    }

    // Generate unique share code
    let shareCode;
    let isUnique = false;
    while (!isUnique) {
      shareCode = generateShareCode();
      const existing = await SharedNote.findOne({
        where: { share_code: shareCode }
      });
      if (!existing) isUnique = true;
    }

    // Create shared note record
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

// Retrieve a shared note by code
router.post('/shared/retrieve', requireAuth, async (req, res) => {
  try {
    const { shareCode } = req.body;

    if (!shareCode || shareCode.trim().length !== 6) {
      return res.status(400).json({ error: 'Invalid share code' });
    }

    // Find the shared note
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

    // check if user already has this note
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

    // creates copy for the current user
    const newNote = await Note.create({
      user_id: req.session.userId,
      file_id: null,
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

// retrieves all notes of current user
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

// deactivates sharing
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

export default router;