import express from 'express';
import ChatMessage from '../models/ChatMessage.js';

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
};

router.get('/history', requireAuth, async (req, res) => {
  try {
    const { noteId } = req.query;

    if (!noteId) {
      return res.status(400).json({ error: 'noteId is required' });
    }

    const parsedNoteId = parseInt(noteId, 10);
    if (Number.isNaN(parsedNoteId)) {
      return res.status(400).json({ error: 'noteId must be numeric' });
    }

    const whereClause = {
      user_id: req.session.userId,
      note_id: parsedNoteId
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
