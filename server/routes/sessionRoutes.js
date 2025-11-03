// routes/sessionRoutes.js - Updated for multi-user
import express from 'express';
import { zoomOAuth } from '../utils/zoomOAuth.js';
import Session from '../models/Session.js';

const router = express.Router();

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
      return res.redirect('http://localhost:5173/sessions?error=zoom_oauth_failed');
    }
    
    if (!code) {
      console.error('❌ No authorization code received');
      return res.redirect('http://localhost:5173/sessions?error=no_authorization_code');
    }

    if (!req.session.userId) {
      console.error('❌ No user session found');
      return res.redirect('http://localhost:5173/sessions?error=no_user_session');
    }

    console.log('🔄 Exchanging authorization code for access token...');
    const tokenResult = await zoomOAuth.getAccessToken(code);
    
    if (!tokenResult.success) {
      console.error('❌ Token exchange failed:', tokenResult.error);
      return res.redirect(`http://localhost:5173/sessions?error=token_exchange_failed&details=${encodeURIComponent(tokenResult.error)}`);
    }

    // Store tokens for this specific user
    const storeResult = await zoomOAuth.storeUserTokens(req.session.userId, tokenResult);
    if (!storeResult.success) {
      console.error('❌ Failed to store tokens:', storeResult.error);
      return res.redirect('http://localhost:5173/sessions?error=token_storage_failed');
    }

    console.log('✅ Zoom OAuth completed successfully for user:', req.session.userId);
    res.redirect('http://localhost:5173/sessions?zoom_connected=true');
  } catch (error) {
    console.error('💥 Zoom callback error:', error);
    res.redirect('http://localhost:5173/sessions?error=callback_exception');
  }
});

// Create meeting with user-specific tokens
router.post('/create', async (req, res) => {
  console.log('🎯 Creating session for user:', req.session.userId);
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const { title, duration, scheduled_start } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Session title is required' });
    }

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
      scheduled_start: scheduled_start || null,
      status: 'scheduled'
    });

    console.log('✅ Session created successfully for user:', req.session.userId);

    res.json({
      message: '🎉 Session created successfully!',
      session: {
        session_id: session.session_id,
        title: session.title,
        zoom_join_url: session.zoom_join_url,
        zoom_start_url: session.zoom_start_url,
        zoom_password: session.zoom_password,
        duration: session.duration,
        scheduled_start: session.scheduled_start
      }
    });

  } catch (error) {
    console.error('💥 Create session error:', error);
    res.status(500).json({ 
      error: `Failed to create session: ${error.message}` 
    });
  }
});

// Add this to your sessionRoutes.js
router.get('/zoom/test-auth', async (req, res) => {
  try {
    const zoomOAuth = new ZoomOAuth();
    
    // Test the exact credentials being used
    const credentials = `${zoomOAuth.clientId}:${zoomOAuth.clientSecret}`;
    const authHeader = Buffer.from(credentials).toString('base64');
    
    // Test a simple request to verify credentials
    const testResponse = await axios.post('https://zoom.us/oauth/token', 
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    ).catch(error => {
      return { error: error.response?.data || error.message };
    });

    res.json({
      clientId: zoomOAuth.clientId,
      clientSecretLength: zoomOAuth.clientSecret ? zoomOAuth.clientSecret.length : 'Missing',
      redirectUri: zoomOAuth.redirectUri,
      authHeader: authHeader,
      authHeaderLength: authHeader.length,
      testResult: testResponse
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Get user's sessions
router.get('/', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const sessions = await Session.findAll({
      where: { user_id: req.session.userId },
      order: [['createdAt', 'DESC']]
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

export default router;