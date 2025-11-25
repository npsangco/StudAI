import express from 'express';
import ChatMessage from '../models/ChatMessage.js';
import Note from '../models/Note.js';

const router = express.Router();

// Hybrid authentication middleware - supports both session cookies and JWT tokens
const requireAuth = (req, res, next) => {
  // Method 1: Check session cookie (primary)
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Method 2: Check if already authenticated by parent middleware (e.g., sessionLockCheck)
  if (req.user && req.user.userId) {
    return next();
  }
  
  // No valid authentication found
  return res.status(401).json({ 
    error: 'Authentication required. Please log in.',
    authRequired: true 
  });
};

router.get('/history', requireAuth, async (req, res) => {
  try {
    const { noteId, fileId } = req.query;

    let resolvedNoteId = null;

    if (noteId) {
      const parsed = parseInt(noteId, 10);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ error: 'noteId must be numeric' });
      }
      resolvedNoteId = parsed;
    }

    if (!resolvedNoteId && fileId) {
      const parsedFileId = parseInt(fileId, 10);
      if (Number.isNaN(parsedFileId)) {
        return res.status(400).json({ error: 'fileId must be numeric' });
      }

      const relatedNote = await Note.findOne({
        where: {
          file_id: parsedFileId,
          user_id: req.session.userId
        }
      });

      if (!relatedNote) {
        return res.status(404).json({ error: 'No note found for provided fileId' });
      }

      resolvedNoteId = relatedNote.note_id;
    }

    if (!resolvedNoteId) {
      return res.status(400).json({ error: 'noteId is required' });
    }

    const whereClause = {
      user_id: req.session.userId,
      note_id: resolvedNoteId
    };

    const history = await ChatMessage.findAll({
      where: whereClause,
      order: [['timestamp', 'ASC']]
    });

    res.json({ history });
  } catch (error) {
    console.error('❌ Failed to fetch chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

export default router;
