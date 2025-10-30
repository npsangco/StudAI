import express from 'express';
import Note from '../models/Note.js';
import SharedNote from '../models/SharedNote.js';
import NoteCategory from '../models/NoteCategory.js';

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
    is_shared: noteData.is_shared || false,
    is_pinned: noteData.is_pinned || false
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

// CATEGORY ROUTES
// Get all categories for current user
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

// Create a new category
router.post('/categories', requireAuth, async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category already exists for this user
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

// NOTES ROUTES
// Get all notes for current user
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
        ['is_pinned', 'DESC'], // pinned notes first
        ['createdAt', 'DESC']  // then by creation date
      ]
    });

    const notesWithExtras = notes.map(note => {
      const formatted = formatNoteForFrontend(note);
      // Add category info if exists
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

// Create a new note
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { title, content, file_id, category_id } = req.body;
    
    // Validate category if provided
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

    const newNote = await Note.create({
      user_id: req.session.userId,
      file_id: file_id || null,
      category_id: category_id || null,
      title,
      content: content || '',
      is_pinned: false
    });

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

    res.status(201).json({ note: noteWithExtras });
  } catch (err) {
    console.error('Failed to create note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update a note
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

    // Validate category if provided
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

    // Fetch the updated note with category info
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

    // creates copy for the current user (without category to avoid conflicts)
    const newNote = await Note.create({
      user_id: req.session.userId,
      file_id: null,
      category_id: null, // Don't copy category
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

// Pin a note
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

// Unpin a note
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