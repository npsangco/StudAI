import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import JitsiSession from '../models/JitsiSession.js';
import User from '../models/User.js';
import { Op } from 'sequelize';

const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Generate secure room ID
const generateRoomId = () => {
  return `studai-${uuidv4()}`;
};

// Create a new Jitsi session
router.post('/sessions', requireAuth, async (req, res) => {
  try {
    const { topic, duration, start_time, is_private, session_password } = req.body;
    const userId = req.session.userId;

    if (!topic || !start_time) {
      return res.status(400).json({ error: 'Topic and start time are required' });
    }

    const roomId = generateRoomId();

    const session = await JitsiSession.create({
      user_id: userId,
      room_id: roomId,
      topic,
      duration: duration || 60,
      start_time: new Date(start_time),
      is_private: is_private || false,
      session_password: session_password || null,
      is_published: false,
      status: 'scheduled'
    });

    // Schedule publication after 1 minute
    setTimeout(async () => {
      try {
        await JitsiSession.update(
          { is_published: true, published_at: new Date() },
          { where: { session_id: session.session_id } }
        );
        console.log(`Session ${session.session_id} published after 1 minute delay`);
      } catch (err) {
        console.error('Failed to publish session:', err);
      }
    }, 60000); // 1 minute delay

    res.json({
      message: 'Session created! It will be visible to others in 1 minute.',
      session: {
        ...session.toJSON(),
        jitsi_url: `https://meet.jit.si/${roomId}`
      }
    });
  } catch (err) {
    console.error('Error creating Jitsi session:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get user's sessions
router.get('/sessions/my', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const sessions = await JitsiSession.findAll({
      where: { user_id: userId },
      order: [['start_time', 'DESC']],
      include: [{
        model: User,
        as: 'creator',
        attributes: ['user_id', 'username', 'email']
      }]
    });

    const sessionsWithUrl = sessions.map(session => ({
      ...session.toJSON(),
      jitsi_url: `https://meet.jit.si/${session.room_id}`
    }));

    res.json({ sessions: sessionsWithUrl });
  } catch (err) {
    console.error('Error fetching user sessions:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get public sessions
router.get('/sessions/public', requireAuth, async (req, res) => {
  try {
    const sessions = await JitsiSession.findAll({
      where: {
        is_private: false,
        is_published: true,
        status: {
          [Op.in]: ['scheduled', 'active']
        }
      },
      order: [['start_time', 'ASC']],
      include: [{
        model: User,
        as: 'creator',
        attributes: ['user_id', 'username', 'email']
      }]
    });

    const sessionsWithUrl = sessions.map(session => ({
      ...session.toJSON(),
      jitsi_url: `https://meet.jit.si/${session.room_id}`,
      // Hide password from public view
      session_password: session.session_password ? '••••••••' : null
    }));

    res.json({ sessions: sessionsWithUrl });
  } catch (err) {
    console.error('Error fetching public sessions:', err);
    res.status(500).json({ error: 'Failed to fetch public sessions' });
  }
});

// Verify session password
router.post('/sessions/:id/verify', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const session = await JitsiSession.findByPk(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.session_password === password) {
      res.json({
        success: true,
        jitsi_url: `https://meet.jit.si/${session.room_id}`
      });
    } else {
      res.status(401).json({ error: 'Incorrect password' });
    }
  } catch (err) {
    console.error('Error verifying password:', err);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

// Delete session
router.delete('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const session = await JitsiSession.findByPk(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this session' });
    }

    await session.destroy();
    res.json({ message: 'Session deleted successfully' });
  } catch (err) {
    console.error('Error deleting session:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Update session status
router.patch('/sessions/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.session.userId;

    const session = await JitsiSession.findByPk(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this session' });
    }

    await session.update({ status });
    res.json({ message: 'Session status updated', session });
  } catch (err) {
    console.error('Error updating session status:', err);
    res.status(500).json({ error: 'Failed to update session status' });
  }
});

export default router;
