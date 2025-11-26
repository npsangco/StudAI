# StudAI Email System Documentation

## Overview
StudAI uses an automated email system to keep users informed about important account activities, security events, and task reminders. All emails are sent from a Gmail account configured in the environment variables.

---

## Email Features

### 1. 📧 Email Verification (Registration)
**When it's sent:** Immediately after a new user signs up

**Why we send this:**
- Verify that the email address belongs to the person signing up
- Prevent fake accounts with invalid email addresses
- Ensure users can receive important notifications
- Security measure to confirm user identity

**What happens:**
1. User fills out registration form
2. Account is created in `pending_users` table (not yet active)
3. Verification email sent with a unique token
4. User must click the link within 5 minutes
5. Upon verification, account moves to `users` table and becomes active

**Token Expiry:** 5 minutes

**Email Display:** "This link will expire in 5 minutes"

**Email Template:** Clean, modern design with blue button to verify email

---

### 2. 🔐 Password Reset Request
**When it's sent:** When a user forgets their password and requests a reset

**Why we send this:**
- Allow users to regain access to their account securely
- Verify that the person requesting the reset owns the email
- Prevent unauthorized password changes
- Time-limited for security (10 minutes)

**What happens:**
1. User clicks "Forgot Password" on login page
2. Enters their email address
3. System checks if email exists in database
4. If found, generates secure reset token
5. Email sent with password reset link
6. User clicks link and creates new password

**Token Expiry:** 10 minutes

**Email Display:** "This link will expire in 10 minutes"

**Email Template:** Professional design explaining password reset process

---

### 3. 🔄 Password Update Confirmation
**When it's sent:** When a logged-in user changes their password in settings

**Why we send this:**
- Additional security layer for password changes
- Prevent unauthorized changes if someone gains session access
- Give user ability to cancel if they didn't initiate change
- Confirm user identity before applying sensitive changes

**What happens:**
1. User goes to Settings/Account
2. Enters new password and confirms
3. System generates confirmation token
4. Email sent with confirmation link
5. User must click link to finalize password change
6. Only then is password updated in database

**Token Expiry:** 10 minutes

**Email Display:** "This link will expire in 10 minutes"

**Email Template:** Clear confirmation design with warning about security

---

### 4. 🔒 Account Status Notifications (Lock/Unlock)
**When it's sent:** When an administrator locks or unlocks a user account

**Why we send this:**
- Inform users immediately about account status changes
- Transparency in moderation actions
- Provide reason for account lock (from admin)
- Notify users when they can access account again

**What happens:**

**Account Locked:**
1. Admin identifies policy violation or suspicious activity
2. Admin locks account from admin panel with reason
3. User immediately logged out from all sessions
4. Email sent explaining the lock and reason
5. User can contact support if they believe it's a mistake

**Account Unlocked:**
1. Admin reviews case and decides to unlock
2. Admin unlocks account from admin panel
3. Email sent confirming access is restored
4. User can log in normally again

**Email Template:** 
- **Locked:** Red badge, serious tone, explains reason and next steps
- **Unlocked:** Green badge, positive tone, welcomes user back

---

### 5. 📋 Daily Task Reminders
**When it's sent:** Every day at 8:00 AM (automated cron job)

**Why we send this:**
- Help users stay on top of their deadlines
- Prevent tasks from being forgotten
- Reduce procrastination with timely reminders
- Provide daily summary of what's due soon

**What happens:**
1. Cron job runs every day at 8 AM server time
2. System scans all users' tasks in planner
3. Finds tasks due in next 3 days (upcoming)
4. Finds tasks past their due date (overdue)
5. Groups tasks by user email
6. Sends one summary email per user with both sections
7. Email only sent if user has upcoming or overdue tasks

**Email Content:**
- **Upcoming Tasks:** Tasks due within 3 days, with countdown badges
- **Overdue Tasks:** Past-due tasks highlighted in red
- Beautiful HTML table showing:
  - Task title
  - Description
  - Due date
  - Status badge (Due today, 1 day, 2 days, Overdue, etc.)

**Schedule:** `0 8 * * *` (8:00 AM daily)

**Email Template:** Professional summary layout with color-coded status badges

---

### 6. 🔥 Streak Expiration Warning
**When it's sent:** Every 6 hours (automated check for expiring streaks)

**Why we send this:**
- Motivate users to maintain their learning consistency
- Prevent accidental streak loss
- Encourage daily engagement
- Build positive learning habits

**What happens:**
1. Cron job runs every 6 hours
2. Finds users whose last activity was yesterday (streak about to expire)
3. Only sends to users with active streaks (> 0 days)
4. Reminds user they have less than 24 hours to continue streak
5. Suggests quick activities: take quiz, create note, update planner

**Trigger Condition:** User's `last_activity_date` was yesterday and `study_streak > 0`

**Schedule:** `0 */6 * * *` (Every 6 hours)

**Email Template:** Gradient orange/red design with fire emoji and motivational messaging

---

### 7. 👋 Inactive User Reminder
**When it's sent:** Daily at 10:00 AM for users inactive for 3 days

**Why we send this:**
- Re-engage users who haven't visited recently
- Remind them of platform features and benefits
- Reduce user churn
- Encourage them to return to their learning journey

**What happens:**
1. Cron job runs daily at 10 AM
2. Finds users whose last activity was exactly 3 days ago
3. Only sends once (won't spam daily after that)
4. Only sends to active accounts (not locked/banned)
5. Highlights what they're missing: dashboard, AI features, quizzes, pet companion

**Trigger Condition:** User's `last_activity_date` is 3 days old and status is 'active'

**Schedule:** `0 10 * * *` (10:00 AM daily)

**Email Template:** Friendly purple design with "We Miss You" messaging and feature highlights

---

## Email System Architecture

### SMTP Configuration
- **Service:** Gmail
- **Authentication:** App-specific password (not regular password)
- **Connection Pooling:** Enabled for performance
- **Rate Limiting:** 5 emails per second to respect Gmail limits

### Performance Optimizations
- **Asynchronous Sending:** Emails sent in background, API responds immediately
- **Connection Reuse:** Pool maintains connections instead of creating new ones
- **Timeout Protection:** 30-second timeouts prevent hanging
- **Error Handling:** Failed emails logged but don't crash server

### Security Features
- **JWT Tokens:** All email links use secure, expiring tokens
- **Short Expiry:** 5-10 minute windows reduce attack surface
- **One-Time Use:** Tokens invalidated after use
- **Email Ownership Verification:** Ensures actions confirmed by email owner

---

## User Benefits

### For Security:
- Two-factor email verification for sensitive actions
- Protection against unauthorized account access
- Immediate notification of account status changes
- Time-limited tokens prevent replay attacks

### For Productivity:
- Never miss a deadline with daily reminders
- See all upcoming and overdue tasks in one place
- Convenient email summary without logging in
- Color-coded priorities for quick scanning

### For User Experience:
- No waiting for emails to send (instant API responses)
- Professional, branded email templates
- Clear calls-to-action with buttons
- Mobile-friendly responsive design

---

## Technical Details

### Environment Variables Required:
```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-specific-password
JWT_SECRET=your-jwt-secret-key
SERVER_URL=https://your-backend-url.com
CLIENT_URL=https://your-frontend-url.com
```

### Email Files:
- `server/services/emailService.js` - Email templates and sender functions
- `server/services/emailScheduler.js` - Automated reminder cron jobs (task reminders, streak warnings, inactive users)
- `server/server.js` - Registration, password reset, password update routes

### Dependencies:
- `nodemailer` - Email sending library
- `node-cron` - Scheduled task execution
- `jsonwebtoken` - Secure token generation

---

## Email Delivery Times

**Before Optimization:** 10+ minutes (blocking)
**After Optimization:** 1-2 minutes (non-blocking)

Users now receive instant UI feedback while emails are delivered in the background.

---

## Cron Schedule Summary

| Email Type | Schedule | Frequency | Purpose |
|------------|----------|-----------|---------|
| Task Reminders | `0 8 * * *` | Daily at 8 AM | Upcoming/overdue tasks |
| Streak Warning | `0 */6 * * *` | Every 6 hours | Expiring streak alerts |
| Inactive Users | `0 10 * * *` | Daily at 10 AM | Re-engagement after 3 days |

## Future Enhancements

Potential improvements for the email system:
1. Email preferences (let users opt-in/out of reminders)
2. Customize reminder frequency (daily, weekly)
3. Weekly digest option instead of daily
4. Email open/click tracking for analytics
5. Multiple language support for international users
6. Fallback email providers (SendGrid, Mailgun) for reliability
7. Personalized study time suggestions based on user activity patterns
