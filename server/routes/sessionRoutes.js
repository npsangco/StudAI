// routes/sessionRoutes.js
import express from 'express';
import bcrypt from 'bcrypt';
import { zoomOAuth } from '../zoomOAuth.js';
import Session from '../models/Session.js';
import SessionParticipant from '../models/SessionParticipant.js';
import { Op } from 'sequelize';

const router = express.Router();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Start Zoom OAuth flow
router.get('/zoom/connect', async (req, res) => {
  console.log('🔗 Starting Zoom OAuth flow for user:', req.session.userId);
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const authUrl = zoomOAuth.getAuthorizationUrl(req.session.userId.toString());
    console.log('📤 Redirecting to Zoom OAuth');
    res.json({ authUrl });
  } catch (error) {
    console.error('Zoom connect error:', error);
    res.status(500).json({ 
      error: 'Zoom OAuth not configured properly' 
    });
  }
});

// OAuth callback
router.get('/zoom/callback', async (req, res) => {
  console.log('🔄 Zoom OAuth callback received for user');
  
  try {
    const { code, error: zoomError } = req.query;
    
    if (zoomError) {
      console.error('❌ Zoom OAuth error:', zoomError);
      return res.redirect(`${CLIENT_URL}/sessions?error=zoom_oauth_failed`);
    }
    
    if (!code) {
      console.error('❌ No authorization code received');
      return res.redirect(`${CLIENT_URL}/sessions?error=no_authorization_code`);
    }

    if (!req.session.userId) {
      console.error('❌ No user session found');
      return res.redirect(`${CLIENT_URL}/sessions?error=no_user_session`);
    }

    console.log('🔄 Exchanging authorization code for access token...');
    const tokenResult = await zoomOAuth.getAccessToken(code);
    
    if (!tokenResult.success) {
      console.error('❌ Token exchange failed:', tokenResult.error);
      return res.redirect(`${CLIENT_URL}/sessions?error=token_exchange_failed&details=${encodeURIComponent(tokenResult.error)}`);
    }

    // Store tokens for this specific user
    const storeResult = await zoomOAuth.storeUserTokens(req.session.userId, tokenResult);
    if (!storeResult.success) {
      console.error('❌ Failed to store tokens:', storeResult.error);
      return res.redirect(`${CLIENT_URL}/sessions?error=token_storage_failed`);
    }

    console.log('✅ Zoom OAuth completed successfully for user:', req.session.userId);
    res.redirect(`${CLIENT_URL}/sessions?zoom_connected=true`);
  } catch (error) {
    console.error('💥 Zoom callback error:', error);
    res.redirect(`${CLIENT_URL}/sessions?error=callback_exception`);
  }
});

// Create meeting with user-specific tokens
router.post('/create', async (req, res) => {
  console.log('🎯 Creating session for user:', req.session.userId);
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const { title, duration, scheduled_start, is_private, session_password } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Session title is required' });
    }

    // Note: is_private means "don't show in public list", password is optional

    // Create Zoom meeting using user's tokens
    console.log('📞 Creating Zoom meeting via OAuth...');
    const meetingResult = await zoomOAuth.createMeeting(req.session.userId, {
      title,
      duration: duration || 60,
      scheduled_start
    });

    if (!meetingResult.success) {
      console.error('❌ Zoom meeting creation failed:', meetingResult.error);
      return res.status(500).json({ 
        error: `Zoom API error: ${meetingResult.error}` 
      });
    }

    // Calculate scheduled_end
    const startTime = scheduled_start ? new Date(scheduled_start) : new Date();
    const endTime = new Date(startTime.getTime() + (duration || 60) * 60000);

    // Hash password if private
    let hashedPassword = null;
    if (is_private && session_password) {
      hashedPassword = await bcrypt.hash(session_password, 10);
    }

    // Save to database
    console.log('💾 Saving session to database...');
    const session = await Session.create({
      user_id: req.session.userId,
      title,
      zoom_meeting_id: meetingResult.meeting.id.toString(),
      zoom_join_url: meetingResult.meeting.join_url,
      zoom_start_url: meetingResult.meeting.start_url,
      zoom_password: meetingResult.meeting.password,
      duration: duration || 60,
      scheduled_start: startTime,
      scheduled_end: endTime,
      status: 'scheduled',
      is_private: is_private || false,
      session_password: hashedPassword,
      host_name: req.session.username
    });

    console.log('✅ Session created successfully for user:', req.session.userId);

    // Check for session-related achievements
    try {
      const { checkAndUnlockAchievements } = await import('../services/achievementServices.js');
      const unlockedAchievements = await checkAndUnlockAchievements(req.session.userId);
      if (unlockedAchievements && unlockedAchievements.length > 0) {
        console.log(`🏆 User ${req.session.userId} unlocked ${unlockedAchievements.length} achievement(s):`, 
          unlockedAchievements.map(a => a.title).join(', '));
      }
    } catch (err) {
      console.error('Achievement check error:', err);
    }

    res.json({
      message: '🎉 Session created successfully!',
      session: {
        session_id: session.session_id,
        title: session.title,
        zoom_join_url: session.zoom_join_url,
        zoom_start_url: session.zoom_start_url,
        zoom_password: session.zoom_password,
        duration: session.duration,
        scheduled_start: session.scheduled_start,
        scheduled_end: session.scheduled_end,
        is_private: session.is_private,
        host_name: session.host_name,
        status: session.status
      }
    });

  } catch (error) {
    console.error('💥 Create session error:', error);
    res.status(500).json({ 
      error: `Failed to create session: ${error.message}` 
    });
  }
});

// Get user's own sessions (both public and private)
router.get('/my-sessions', async (req, res) => {
  console.log('📋 Fetching my sessions for user:', req.session.userId);
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const sessions = await Session.findAll({
      where: { user_id: req.session.userId },
      order: [['scheduled_start', 'DESC']]
    });

    console.log(`✅ Found ${sessions.length} sessions for user ${req.session.userId}`);

    // Update status for each session
    for (let session of sessions) {
      let newStatus = session.status;
      
      if (session.isExpired()) {
        newStatus = 'expired';
      } else if (session.isActive()) {
        newStatus = 'active';
      }
      
      if (newStatus !== session.status) {
        await session.update({ status: newStatus });
      }
    }

    res.json({ sessions });
  } catch (error) {
    console.error('❌ Get my sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get all sessions for browsing (both public and private, but hide URLs for private)
router.get('/public', async (req, res) => {
  console.log('🌍 Fetching all browsable sessions');
  
  try {
    const now = new Date();
    
    const sessions = await Session.findAll({
      where: {
        status: 'active', // Only show active sessions
        scheduled_end: {
          [Op.gt]: now // Only show sessions that haven't ended
        }
      },
      order: [['scheduled_start', 'ASC']],
      attributes: {
        exclude: ['session_password', 'zoom_start_url'] // Don't expose sensitive data
      }
    });

    console.log(`✅ Found ${sessions.length} browsable sessions`);

    // Update status and hide join URLs for private sessions
    const processedSessions = [];
    for (let session of sessions) {
      let newStatus = session.status;
      
      if (session.isExpired()) {
        newStatus = 'expired';
      } else if (session.isActive()) {
        newStatus = 'active';
      }
      
      if (newStatus !== session.status) {
        await session.update({ status: newStatus });
      }

      // Create a plain object from the session
      const sessionData = session.toJSON();
      
      // Hide zoom_join_url for private sessions (only show after password verification)
      if (sessionData.is_private) {
        sessionData.zoom_join_url = null;
        sessionData.zoom_password = null;
      }
      
      processedSessions.push(sessionData);
    }

    res.json({ sessions: processedSessions });
  } catch (error) {
    console.error('❌ Get public sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch public sessions' });
  }
});

// Verify password for private session
router.post('/verify-password', async (req, res) => {
  console.log('🔐 Verifying password for session');
  
  try {
    const { session_id, password } = req.body;

    if (!session_id || !password) {
      return res.status(400).json({ error: 'Session ID and password required' });
    }

    const session = await Session.findByPk(session_id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.is_private) {
      return res.status(400).json({ error: 'Session is not private' });
    }

    // Check if session expired
    if (session.isExpired()) {
      return res.status(410).json({ error: 'Session has expired' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, session.session_password);

    if (!isValid) {
      console.log('❌ Invalid password attempt');
      return res.status(401).json({ error: 'Incorrect password' });
    }

    console.log('✅ Password verified successfully');

    // Return session details
    res.json({
      success: true,
      session: {
        session_id: session.session_id,
        title: session.title,
        zoom_join_url: session.zoom_join_url,
        zoom_password: session.zoom_password,
        duration: session.duration,
        scheduled_start: session.scheduled_start,
        scheduled_end: session.scheduled_end,
        host_name: session.host_name,
        status: session.status
      }
    });

  } catch (error) {
    console.error('❌ Verify password error:', error);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

// Check Zoom connection status for current user
router.get('/zoom/status', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const status = await zoomOAuth.getUserZoomStatus(req.session.userId);
  res.json(status);
});

// Disconnect Zoom for current user
router.delete('/zoom/disconnect', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const result = await zoomOAuth.disconnectUser(req.session.userId);
  if (result.success) {
    res.json({ message: 'Zoom disconnected successfully' });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// Delete a session
router.delete('/:session_id', async (req, res) => {
  console.log('🗑️ Deleting session:', req.params.session_id);
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const session = await Session.findOne({
      where: {
        session_id: req.params.session_id,
        user_id: req.session.userId
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    await session.destroy();
    console.log('✅ Session deleted successfully');
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('❌ Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Get real-time meeting status
router.get('/:session_id/status', async (req, res) => {
  console.log('📊 Getting meeting status for session:', req.params.session_id);
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const session = await Session.findOne({
      where: {
        session_id: req.params.session_id,
        user_id: req.session.userId
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    if (!session.zoom_meeting_id) {
      return res.status(400).json({ error: 'Session does not have a Zoom meeting' });
    }

    const result = await zoomOAuth.getMeetingStatus(req.session.userId, session.zoom_meeting_id);
    
    if (result.success) {
      res.json(result.meeting);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('❌ Get meeting status error:', error);
    res.status(500).json({ error: 'Failed to get meeting status' });
  }
});

// Get meeting participants (live or past)
router.get('/:session_id/participants', async (req, res) => {
  console.log('👥 Getting participants for session:', req.params.session_id);
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const session = await Session.findOne({
      where: {
        session_id: req.params.session_id,
        user_id: req.session.userId
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    if (!session.zoom_meeting_id) {
      return res.status(400).json({ error: 'Session does not have a Zoom meeting' });
    }

    const type = req.query.type || 'past'; // 'live' or 'past'
    
    let result;
    if (type === 'live') {
      result = await zoomOAuth.getActiveMeetingParticipants(req.session.userId, session.zoom_meeting_id);
    } else {
      result = await zoomOAuth.getPastMeetingParticipants(req.session.userId, session.zoom_meeting_id);
    }
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('❌ Get participants error:', error);
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

// Get past meeting metrics
router.get('/:session_id/metrics', async (req, res) => {
  console.log('📈 Getting metrics for session:', req.params.session_id);
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const session = await Session.findOne({
      where: {
        session_id: req.params.session_id,
        user_id: req.session.userId
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    if (!session.zoom_meeting_id) {
      return res.status(400).json({ error: 'Session does not have a Zoom meeting' });
    }

    const result = await zoomOAuth.getPastMeetingMetrics(req.session.userId, session.zoom_meeting_id);
    
    if (result.success) {
      res.json(result.metrics);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('❌ Get metrics error:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Zoom webhook endpoint for meeting events
router.post('/zoom/webhook', express.json(), async (req, res) => {
  console.log('🔔 Zoom webhook received:', req.body.event);

  try {
    const { event, payload } = req.body;

    // Verify webhook (Zoom sends verification request)
    if (event === 'endpoint.url_validation') {
      const crypto = await import('crypto');
      const hashForValidate = crypto
        .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '')
        .update(payload.plainToken)
        .digest('hex');
      
      return res.json({
        plainToken: payload.plainToken,
        encryptedToken: hashForValidate
      });
    }

    // Handle meeting events
    switch (event) {
      case 'meeting.started':
        await handleMeetingStarted(payload);
        break;
      
      case 'meeting.ended':
        await handleMeetingEnded(payload);
        break;
      
      case 'meeting.participant_joined':
        await handleParticipantJoined(payload);
        break;
      
      case 'meeting.participant_left':
        await handleParticipantLeft(payload);
        break;
      
      default:
        console.log('ℹ️ Unhandled webhook event:', event);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Webhook handlers
async function handleMeetingStarted(payload) {
  console.log('🟢 Meeting started:', payload.object.id);
  
  try {
    const session = await Session.findOne({
      where: { zoom_meeting_id: payload.object.id.toString() }
    });

    if (session) {
      session.status = 'active';
      session.actual_start = new Date(payload.object.start_time);
      await session.save();
      console.log('✅ Session status updated to active');
    }
  } catch (error) {
    console.error('❌ Error handling meeting started:', error);
  }
}

async function handleMeetingEnded(payload) {
  console.log('🔴 Meeting ended:', payload.object.id);
  
  try {
    const session = await Session.findOne({
      where: { zoom_meeting_id: payload.object.id.toString() }
    });

    if (session) {
      session.status = 'completed';
      session.actual_end = new Date(payload.object.end_time);
      await session.save();
      console.log('✅ Session status updated to completed');
    }
  } catch (error) {
    console.error('❌ Error handling meeting ended:', error);
  }
}

async function handleParticipantJoined(payload) {
  console.log('👤 Participant joined:', payload.object.participant.user_name);
  
  try {
    const session = await Session.findOne({
      where: { zoom_meeting_id: payload.object.id.toString() }
    });

    if (session) {
      await SessionParticipant.create({
        session_id: session.session_id,
        zoom_participant_id: payload.object.participant.id,
        participant_name: payload.object.participant.user_name,
        participant_email: payload.object.participant.email || null,
        join_time: new Date(payload.object.participant.join_time),
        status: 'in_meeting'
      });
      console.log('✅ Participant record created');
    }
  } catch (error) {
    console.error('❌ Error storing participant:', error);
  }
}

async function handleParticipantLeft(payload) {
  console.log('👋 Participant left:', payload.object.participant.user_name);
  
  try {
    const session = await Session.findOne({
      where: { zoom_meeting_id: payload.object.id.toString() }
    });

    if (session) {
      const participant = await SessionParticipant.findOne({
        where: {
          session_id: session.session_id,
          zoom_participant_id: payload.object.participant.id
        }
      });

      if (participant) {
        participant.leave_time = new Date(payload.object.participant.leave_time);
        participant.status = 'left';
        participant.calculateDuration();
        await participant.save();
        console.log('✅ Participant leave time updated');
      }
    }
  } catch (error) {
    console.error('❌ Error updating participant:', error);
  }
}

export default router;