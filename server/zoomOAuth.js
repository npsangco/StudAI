// utils/zoomOAuth.js
import axios from 'axios';
import ZoomToken from './models/ZoomToken.js';

class ZoomOAuth {
  constructor() {
    // Use direct credentials - environment variables aren't loading
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.redirectUri = process.env.ZOOM_REDIRECT_URL;
    this.authUrl = 'https://zoom.us/oauth/authorize';
    this.tokenUrl = 'https://zoom.us/oauth/token';
    this.apiBaseUrl = 'https://api.zoom.us/v2';
    
    console.log('🔑 Zoom OAuth Configuration:');
    console.log('   Client ID:', this.clientId);
    console.log('   Client Secret length:', this.clientSecret ? this.clientSecret.length : 'Missing');
    console.log('   Redirect URI:', this.redirectUri);
    
    this.validateConfig();
  }

  validateConfig() {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Zoom OAuth configuration missing: Client ID and Secret are required');
    }
    
    // Test the credentials format
    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    console.log('   Auth Header (first 20 chars):', authHeader.substring(0, 20) + '...');
    
    console.log('✅ Zoom OAuth configuration validated');
  }

  getAuthorizationUrl() {
    this.validateConfig();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri
    });

    const authUrl = `${this.authUrl}?${params.toString()}`;
    console.log('📤 Generated OAuth URL:', authUrl);
    return authUrl;
  }

  async getAccessToken(code) {
    try {
      console.log('🔄 Exchanging code for access token...');
      console.log('📝 Code length:', code ? code.length : 'No code');
      
      if (!code) {
        throw new Error('No authorization code provided');
      }

      const credentials = `${this.clientId}:${this.clientSecret}`;
      const authHeader = Buffer.from(credentials).toString('base64');
      
      console.log('🔐 Using Client ID:', this.clientId);
      console.log('🔐 Auth header length:', authHeader.length);
      console.log('🔐 Auth header (first 30 chars):', authHeader.substring(0, 30) + '...');

      const requestBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri
      });

      console.log('📤 Making token request to Zoom...');
      console.log('📍 Token URL:', this.tokenUrl);
      console.log('📦 Request body params:', {
        grant_type: 'authorization_code',
        code_length: code.length,
        redirect_uri: this.redirectUri
      });

      const response = await axios.post(this.tokenUrl, requestBody.toString(), {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'StudAI-App/1.0'
        },
        timeout: 30000,
        transformRequest: [(data) => data]
      });

      console.log('✅ Access token received successfully!');
      console.log('📦 Response status:', response.status);
      
      return {
        success: true,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type
      };
    } catch (error) {
      console.error('❌ Token exchange failed:');
      
      if (error.response) {
        console.error('📡 Zoom API Response Status:', error.response.status);
        console.error('📡 Zoom API Response Headers:', error.response.headers);
        console.error('📡 Zoom API Response Data:', JSON.stringify(error.response.data, null, 2));
        
        // Detailed error analysis
        if (error.response.status === 401) {
          console.error('🔐 401 Unauthorized - Invalid client credentials');
          console.error('🔑 Verify your Client ID and Secret in Zoom App Marketplace');
        }
        
        return {
          success: false,
          error: `Zoom API Error (${error.response.status}): ${error.response.data.reason || error.response.data.error || 'Unknown error'}`,
          details: error.response.data
        };
      } else if (error.request) {
        console.error('📡 No response received from Zoom API');
        console.error('📡 Request was made but no response received');
        
        return {
          success: false,
          error: 'No response from Zoom API - check network connectivity'
        };
      } else {
        console.error('📡 Request setup error:', error.message);
        
        return {
          success: false,
          error: `Request error: ${error.message}`
        };
      }
    }
  }

  // ... rest of your methods remain the same
  async refreshToken(refreshToken) {
    try {
      console.log('🔄 Refreshing access token...');
      
      const credentials = `${this.clientId}:${this.clientSecret}`;
      const authHeader = Buffer.from(credentials).toString('base64');
      
      const requestBody = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      const response = await axios.post(this.tokenUrl, requestBody.toString(), {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        transformRequest: [(data) => data]
      });

      console.log('✅ Token refreshed successfully');
      
      return {
        success: true,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in
      };
    } catch (error) {
      console.error('❌ Token refresh failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.reason || error.message
      };
    }
  }

  async storeUserTokens(userId, tokenData) {
    try {
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
      
      // Get Zoom user info to store
      const userInfo = await this.getZoomUserInfo(tokenData.access_token);
      
      const [zoomToken, created] = await ZoomToken.upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        zoom_user_id: userInfo.success ? userInfo.user.id : null,
        zoom_email: userInfo.success ? userInfo.user.email : null
      }, {
        where: { user_id: userId }
      });

      console.log(`✅ Zoom tokens ${created ? 'created' : 'updated'} for user ${userId}`);
      return { success: true, zoomToken };
    } catch (error) {
      console.error('❌ Failed to store Zoom tokens:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserTokens(userId) {
    try {
      const zoomToken = await ZoomToken.findOne({
        where: { user_id: userId }
      });

      if (!zoomToken) {
        return { success: false, error: 'No Zoom connection found' };
      }

      // Check if token needs refresh
      if (new Date() >= zoomToken.expires_at) {
        console.log('🔄 Token expired, refreshing...');
        return await this.refreshUserTokens(userId, zoomToken.refresh_token);
      }

      return {
        success: true,
        access_token: zoomToken.access_token,
        refresh_token: zoomToken.refresh_token,
        expires_at: zoomToken.expires_at
      };
    } catch (error) {
      console.error('❌ Failed to get user tokens:', error);
      return { success: false, error: error.message };
    }
  }

  async refreshUserTokens(userId, refreshToken) {
    try {
      console.log('🔄 Refreshing user tokens...');
      
      const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const requestBody = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      const response = await axios.post(this.tokenUrl, requestBody.toString(), {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        transformRequest: [(data) => data]
      });

      // Update stored tokens
      const expiresAt = new Date(Date.now() + (response.data.expires_in * 1000));
      
      await ZoomToken.update({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: expiresAt
      }, {
        where: { user_id: userId }
      });

      console.log('✅ User tokens refreshed successfully');
      
      return {
        success: true,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: expiresAt
      };
    } catch (error) {
      console.error('❌ Token refresh failed:', error.response?.data || error.message);
      
      // If refresh fails, delete the invalid tokens
      await ZoomToken.destroy({ where: { user_id: userId } });
      
      return {
        success: false,
        error: error.response?.data?.reason || error.message
      };
    }
  }

  async getZoomUserInfo(accessToken) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return {
        success: true,
        user: response.data
      };
    } catch (error) {
      console.error('Get Zoom user info failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async createMeeting(userId, meetingData) {
    try {
      // Get user's access token
      const tokenResult = await this.getUserTokens(userId);
      if (!tokenResult.success) {
        return tokenResult; // Return the error
      }

      console.log('📞 Creating Zoom meeting for user:', userId);
      
      const meetingPayload = {
        topic: meetingData.title,
        type: 2, // Scheduled meeting
        duration: meetingData.duration || 60,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: false,
          watermark: false,
          approval_type: 0,
          audio: 'both'
        }
      };

      if (meetingData.scheduled_start) {
        meetingPayload.start_time = new Date(meetingData.scheduled_start).toISOString();
      }

      const response = await axios.post(`${this.apiBaseUrl}/users/me/meetings`, meetingPayload, {
        headers: {
          'Authorization': `Bearer ${tokenResult.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Zoom meeting created successfully for user:', userId);
      
      return {
        success: true,
        meeting: response.data
      };
    } catch (error) {
      console.error('❌ Meeting creation failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async disconnectUser(userId) {
    try {
      await ZoomToken.destroy({ where: { user_id: userId } });
      console.log('✅ Zoom disconnected for user:', userId);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to disconnect Zoom:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserZoomStatus(userId) {
    try {
      const zoomToken = await ZoomToken.findOne({
        where: { user_id: userId },
        attributes: ['zoom_user_id', 'zoom_email', 'expires_at']
      });

      if (!zoomToken) {
        return { connected: false };
      }

      const isExpired = new Date() >= zoomToken.expires_at;
      
      return {
        connected: !isExpired,
        zoom_user_id: zoomToken.zoom_user_id,
        zoom_email: zoomToken.zoom_email,
        expires_at: zoomToken.expires_at,
        is_expired: isExpired
      };
    } catch (error) {
      console.error('❌ Failed to get user Zoom status:', error);
      return { connected: false, error: error.message };
    }
  }
}

export const zoomOAuth = new ZoomOAuth();