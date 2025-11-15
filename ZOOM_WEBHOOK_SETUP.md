# Zoom Webhook Setup Guide

This guide explains how to configure Zoom webhooks for real-time meeting event tracking in your StudAI application.

## Overview

The application now supports real-time Zoom meeting monitoring through:
- **REST API calls** - Query meeting status, participants, and metrics on demand
- **Webhook events** - Receive instant notifications when meetings start, end, or participants join/leave

## New Features Added

### 1. Zoom API Methods (zoomOAuth.js)

#### `getMeetingStatus(userId, meetingId)`
Get current meeting details from Zoom API.
```javascript
const result = await zoomOAuth.getMeetingStatus(userId, meetingId);
// Returns: { success, meeting: { id, topic, status, start_time, duration, join_url } }
```

#### `getPastMeetingMetrics(userId, meetingId)`
Get metrics for completed meetings.
```javascript
const result = await zoomOAuth.getPastMeetingMetrics(userId, meetingId);
// Returns: { success, metrics: { id, topic, start_time, end_time, duration, participants_count } }
```

#### `getActiveMeetingParticipants(userId, meetingId)`
Get list of participants currently in a live meeting.
```javascript
const result = await zoomOAuth.getActiveMeetingParticipants(userId, meetingId);
// Returns: { success, participants: [...], total_records }
```

#### `getPastMeetingParticipants(userId, meetingId)`
Get list of participants from a completed meeting.
```javascript
const result = await zoomOAuth.getPastMeetingParticipants(userId, meetingId);
// Returns: { success, participants: [...], total_records }
```

### 2. New API Endpoints (sessionRoutes.js)

#### `GET /api/sessions/:session_id/status`
Get real-time meeting status for a session.
- **Auth**: Required (session owner)
- **Returns**: Meeting details including status, start time, duration

#### `GET /api/sessions/:session_id/participants?type=live|past`
Get participant list for a session.
- **Auth**: Required (session owner)
- **Query**: `type=live` for active meeting, `type=past` for historical data
- **Returns**: List of participants with join/leave times

#### `GET /api/sessions/:session_id/metrics`
Get metrics for a completed meeting.
- **Auth**: Required (session owner)
- **Returns**: Total duration, participant count, start/end times

#### `POST /api/sessions/zoom/webhook`
Webhook endpoint for Zoom events (configured in Zoom App Marketplace).
- **Auth**: Zoom webhook verification
- **Events**: meeting.started, meeting.ended, participant.joined, participant.left

### 3. Database Changes

#### Session Model Updates
New fields added:
- `actual_start` - Actual meeting start time from webhook
- `actual_end` - Actual meeting end time from webhook
- `getActualDuration()` - Method to calculate actual duration

#### SessionParticipant Model (New)
Tracks individual participants in each session:
- `participant_id` - Primary key
- `session_id` - Foreign key to sessions
- `user_id` - Foreign key to users (null for external participants)
- `zoom_participant_id` - Zoom's participant ID
- `participant_name` - Name shown in Zoom
- `participant_email` - Email if available
- `join_time` - When they joined
- `leave_time` - When they left
- `duration` - Time spent in minutes
- `status` - joined, left, in_meeting

## Zoom Webhook Configuration

### Prerequisites
1. Your production server must have a **publicly accessible URL** (not localhost)
2. SSL/HTTPS is required for webhook endpoints
3. You need access to your Zoom App in the Zoom App Marketplace

### Step 1: Get Your Webhook URL
Your webhook endpoint will be:
```
https://your-production-domain.com/api/sessions/zoom/webhook
```

Example:
```
https://studai.example.com/api/sessions/zoom/webhook
```

### Step 2: Configure Zoom App Webhooks

1. **Go to Zoom App Marketplace**
   - Visit: https://marketplace.zoom.us/
   - Sign in with your Zoom account

2. **Navigate to Your App**
   - Click "Manage" → "Build App" (or "Develop" → "Build App")
   - Select your OAuth app (the one with your Client ID/Secret)

3. **Add Feature: Event Subscriptions**
   - Go to "Feature" tab
   - Click "+ Add Feature"
   - Select "Event Subscriptions"

4. **Configure Webhook URL**
   - Enter your webhook endpoint URL
   - Zoom will send a validation request
   - Your server will automatically respond (handled by the code)

5. **Subscribe to Events**
   Select these event types:
   - ✅ **Meeting** → `meeting.started`
   - ✅ **Meeting** → `meeting.ended`
   - ✅ **Meeting** → `meeting.participant_joined`
   - ✅ **Meeting** → `meeting.participant_left`

6. **Save and Activate**
   - Click "Save"
   - Activate the feature

### Step 3: Add Webhook Secret Token to Environment

1. Copy the "Secret Token" from Zoom App Marketplace
2. Add to your `.env` file:
```env
ZOOM_WEBHOOK_SECRET_TOKEN=your_secret_token_here
```

3. Restart your server

## Testing Webhooks

### Local Development Testing
For local testing, you'll need to expose your localhost to the internet:

1. **Using ngrok** (recommended):
```bash
ngrok http 4000
```
This gives you a temporary public URL like `https://abc123.ngrok.io`

2. **Configure Zoom with ngrok URL**:
```
https://abc123.ngrok.io/api/sessions/zoom/webhook
```

3. **Test by creating a meeting**:
   - Create a session in your app
   - Start the Zoom meeting
   - Check server logs for webhook events

### Production Testing
1. Deploy your application with the webhook endpoint
2. Create a test meeting through your app
3. Start the meeting and verify:
   - Session status changes to "active"
   - `actual_start` is recorded
   - Participants are tracked in `session_participants` table
4. End the meeting and verify:
   - Session status changes to "completed"
   - `actual_end` is recorded
   - Participant leave times are recorded

## Webhook Event Flow

```
User creates session
       ↓
Meeting scheduled in Zoom
       ↓
Host starts meeting
       ↓
🔔 Zoom sends meeting.started webhook
       ↓
Session.status → "active"
Session.actual_start → timestamp
       ↓
Participants join
       ↓
🔔 Zoom sends meeting.participant_joined webhook
       ↓
SessionParticipant record created
       ↓
Participants leave
       ↓
🔔 Zoom sends meeting.participant_left webhook
       ↓
SessionParticipant.leave_time updated
SessionParticipant.duration calculated
       ↓
Meeting ends
       ↓
🔔 Zoom sends meeting.ended webhook
       ↓
Session.status → "completed"
Session.actual_end → timestamp
```

## Security Considerations

1. **Webhook Verification**
   - Webhooks are verified using HMAC SHA256
   - Secret token must be kept secure
   - Validation happens automatically in the code

2. **Authentication**
   - API endpoints require user authentication
   - Only session owners can access their meeting data
   - Public sessions still require auth for detailed metrics

3. **Rate Limiting**
   - Consider adding rate limiting to webhook endpoint
   - Zoom may send multiple events rapidly

## Troubleshooting

### Webhook Not Receiving Events
1. Check Zoom App Marketplace → Your App → Event Subscriptions
2. Verify URL is publicly accessible (test with `curl`)
3. Check server logs for validation requests
4. Ensure ZOOM_WEBHOOK_SECRET_TOKEN is set correctly

### Validation Failed
1. Check that your server is responding within 3 seconds
2. Verify the secret token matches Zoom App Marketplace
3. Check server logs for error messages

### Participants Not Being Tracked
1. Verify webhooks are configured and active
2. Check that `participant.joined` and `participant.left` events are subscribed
3. Verify SessionParticipant model is synced to database

### Missing Meeting Status Updates
1. Check that session has a valid `zoom_meeting_id`
2. Verify user's Zoom OAuth tokens are not expired
3. Check Zoom API rate limits (not exceeded)

## Database Migration

To add the new fields and table, you can either:

### Option 1: Auto-sync (Development Only)
```javascript
await sequelize.sync({ alter: true });
```

### Option 2: Manual Migration (Production)
```sql
-- Add fields to sessions table
ALTER TABLE sessions 
ADD COLUMN actual_start DATETIME NULL COMMENT 'Actual meeting start time from Zoom webhook',
ADD COLUMN actual_end DATETIME NULL COMMENT 'Actual meeting end time from Zoom webhook';

-- Create session_participants table
CREATE TABLE session_participants (
  participant_id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id INT NULL,
  zoom_participant_id VARCHAR(255) NULL,
  participant_name VARCHAR(255) NOT NULL,
  participant_email VARCHAR(255) NULL,
  join_time DATETIME NULL,
  leave_time DATETIME NULL,
  duration INT NULL,
  status ENUM('joined', 'left', 'in_meeting') DEFAULT 'in_meeting',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_session_id (session_id),
  INDEX idx_user_id (user_id),
  INDEX idx_zoom_participant_id (zoom_participant_id)
);
```

## Environment Variables Checklist

Ensure these are set in production:
```env
# Existing
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_REDIRECT_URL=https://yourdomain.com/api/sessions/zoom/callback

# New for Webhooks
ZOOM_WEBHOOK_SECRET_TOKEN=your_webhook_secret_token

# Server URLs
SERVER_URL=https://yourdomain.com
CLIENT_URL=https://yourdomain.com
```

## API Usage Examples

### Frontend: Get Meeting Status
```javascript
const response = await fetch(`/api/sessions/${sessionId}/status`, {
  credentials: 'include'
});
const meeting = await response.json();
console.log('Meeting status:', meeting.status);
```

### Frontend: Get Live Participants
```javascript
const response = await fetch(`/api/sessions/${sessionId}/participants?type=live`, {
  credentials: 'include'
});
const { participants, total_records } = await response.json();
console.log(`${total_records} participants in meeting`);
```

### Frontend: Get Meeting Metrics After Completion
```javascript
const response = await fetch(`/api/sessions/${sessionId}/metrics`, {
  credentials: 'include'
});
const metrics = await response.json();
console.log(`Meeting lasted ${metrics.duration} minutes with ${metrics.participants_count} participants`);
```

## Next Steps

1. **Deploy to production** with a public URL
2. **Configure Zoom webhooks** in App Marketplace
3. **Test with a real meeting** to verify events
4. **Monitor logs** for webhook delivery
5. **Update frontend** to display real-time status and participant counts

## Support Resources

- [Zoom Webhook Documentation](https://marketplace.zoom.us/docs/api-reference/webhook-reference)
- [Zoom Meeting API](https://marketplace.zoom.us/docs/api-reference/zoom-api/methods#tag/Meetings)
- [Zoom Metrics API](https://marketplace.zoom.us/docs/api-reference/zoom-api/methods#tag/Metrics)
