import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import JitsiSession from '../models/JitsiSession.js';
import User from '../models/User.js';
import { Op } from 'sequelize';

const router = express.Router();

// Generate Jitsi URL with username pre-filled
const generateJitsiUrl = (roomId, user) => {
  const baseUrl = `https://meet.jit.si/${roomId}`;
  
  if (!user || !user.username) return baseUrl;
  
  const displayName = encodeURIComponent(user.username);
  return `${baseUrl}#config.prejoinPageEnabled=false&userInfo.displayName=${displayName}`;
};

// Auth check: session cookie or parent middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  
  if (req.user && req.user.userId) {
    return next();
  }
  
  return res.status(401).json({ 
    error: 'Authentication required. Please log in.',
    authRequired: true 
  });
};

const generateRoomId = () => {
  return `studai-${uuidv4()}`;
};

// Create new Jitsi session (published after 1 min delay)
router.post('/sessions', requireAuth, async (req, res) => {
  try {
    const { topic, duration, start_time, is_private, session_password } = req.body;
    const userId = req.session.userId;

    if (!topic || !start_time) {
      return res.status(400).json({ error: 'Topic and start time are required' });
    }

    const now = new Date();
    const startTime = new Date(start_time);
    const durationMinutes = duration || 60;
    const scheduledEnd = new Date(startTime.getTime() + durationMinutes * 60000);

    const existingSession = await JitsiSession.findOne({
      where: {
        user_id: userId,
        status: {
          [Op.ne]: 'ended'
        }
      }
    });

    if (existingSession) {
      const sessionEnd = new Date(new Date(existingSession.start_time).getTime() + existingSession.duration * 60000);
      if (now < sessionEnd) {
        const minutesLeft = Math.ceil((sessionEnd - now) / 60000);
        return res.status(400).json({ 
          error: `You already have an active session that ends in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}. Please wait for it to end or delete it before creating a new one.` 
        });
      }
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

    // Get user info for Jitsi URL
    const user = await User.findByPk(userId, {
      attributes: ['user_id', 'username', 'email']
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
        jitsi_url: generateJitsiUrl(roomId, user)
      }
    });
  } catch (err) {
    console.error('Error creating Jitsi session:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get user's own sessions
router.get('/sessions/my', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    console.log('Fetching sessions for user:', userId);

    const sessions = await JitsiSession.findAll({
      where: { user_id: userId },
      order: [['start_time', 'DESC']]
    });

    console.log(`Found ${sessions.length} sessions for user ${userId}`);

    // Get user info separately to avoid association issues
    const user = await User.findByPk(userId, {
      attributes: ['user_id', 'username', 'email']
    });

    const sessionsWithUrl = sessions.map(session => ({
      ...session.toJSON(),
      jitsi_url: generateJitsiUrl(session.room_id, user),
      creator: user ? {
        user_id: user.user_id,
        username: user.username,
        email: user.email
      } : null
    }));

    res.json({ sessions: sessionsWithUrl });
  } catch (err) {
    console.error('Error fetching user sessions:', err);
    res.status(500).json({ error: 'Failed to fetch sessions', details: err.message });
  }
});

// Get all published public sessions
router.get('/sessions/public', requireAuth, async (req, res) => {
  try {
    console.log('Fetching public sessions...');
    const userId = req.session.userId;
    
    const sessions = await JitsiSession.findAll({
      where: {
        is_published: true,
        status: {
          [Op.in]: ['scheduled', 'active']
        }
      },
      order: [['start_time', 'ASC']]
    });

    console.log(`Found ${sessions.length} public sessions`);

    // Get current user info for Jitsi URL
    const currentUser = await User.findByPk(userId, {
      attributes: ['user_id', 'username', 'email']
    });

    // Get creators separately
    const sessionsWithUrl = await Promise.all(sessions.map(async (session) => {
      const creator = await User.findByPk(session.user_id, {
        attributes: ['user_id', 'username', 'email']
      });

      return {
        ...session.toJSON(),
        jitsi_url: generateJitsiUrl(session.room_id, currentUser),
        session_password: session.session_password ? '••••••••' : null,
        creator: creator ? {
          user_id: creator.user_id,
          username: creator.username,
          email: creator.email
        } : null
      };
    }));

    res.json({ sessions: sessionsWithUrl });
  } catch (err) {
    console.error('Error fetching public sessions:', err);
    res.status(500).json({ error: 'Failed to fetch public sessions', details: err.message });
  }
});

// Verify password for private session
router.post('/sessions/:id/verify', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const userId = req.session.userId;

    const session = await JitsiSession.findByPk(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.session_password === password) {
      // Get user info for Jitsi URL
      const user = await User.findByPk(userId, {
        attributes: ['user_id', 'username', 'email']
      });

      res.json({
        success: true,
        jitsi_url: generateJitsiUrl(session.room_id, user)
      });
    } else {
      res.status(401).json({ error: 'Incorrect password' });
    }
  } catch (err) {
    console.error('Error verifying password:', err);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

// Delete session (owner only)
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

// Update session status (owner only)
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
