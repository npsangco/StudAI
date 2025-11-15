# Digital Ocean App Platform Deployment Guide

## Quick Start Deployment

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Add App Platform configuration"
git push origin main
```

### Step 2: Create App on Digital Ocean

1. **Go to App Platform**
   - Visit: https://cloud.digitalocean.com/apps
   - Click "Create App"

2. **Connect GitHub Repository**
   - Choose "GitHub"
   - Select repository: `npsangco/StudAI`
   - Select branch: `main`
   - Enable "Autodeploy" (deploys automatically on git push)

3. **App Platform Auto-Detection**
   - It will detect your `.do/app.yaml` file
   - Review the configuration
   - Click "Next"

4. **Configure Environment Variables**
   You MUST update these values in the App Platform dashboard:
   
   **Security Secrets** (Generate random strings):
   ```bash
   # Generate on your local machine:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   - `SESSION_SECRET` - Use generated random string
   - `JWT_SECRET` - Use generated random string

   **Email** (Gmail App Password):
   - `EMAIL_USER` - Your Gmail address
   - `EMAIL_PASS` - Gmail app-specific password (not your regular password)
     - Get it: https://myaccount.google.com/apppasswords

   **Zoom OAuth** (From Zoom App Marketplace):
   - `ZOOM_CLIENT_ID` - Your Zoom OAuth Client ID
   - `ZOOM_CLIENT_SECRET` - Your Zoom OAuth Client Secret
   - `ZOOM_REDIRECT_URL` - Will auto-populate, verify it matches your Zoom app
   - `ZOOM_WEBHOOK_SECRET_TOKEN` - From Zoom App webhook settings

   **Google OAuth** (Optional, if using Google Sign-In):
   - `GOOGLE_CLIENT_ID` - From Google Cloud Console
   - `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
   - `GOOGLE_CALLBACK_URL` - Will auto-populate

   **Firebase** (For Quiz Battles):
   - Get all values from Firebase Console → Project Settings
   - Update all `FIREBASE_*` variables

5. **Review Resources**
   - **Web Service**: Basic plan ($5/month)
   - **MySQL Database**: Dev ($15/month) or Production ($25/month)
   - **Total**: ~$20-30/month

6. **Deploy**
   - Click "Create Resources"
   - Wait 5-10 minutes for initial deployment
   - App Platform will:
     - Build your Dockerfile
     - Create the MySQL database
     - Deploy your app
     - Assign a public URL

### Step 3: Post-Deployment Configuration

#### Update Zoom OAuth Redirect URL
Once deployed, you'll get a URL like: `https://studai-xxxxx.ondigitalocean.app`

1. Go to Zoom App Marketplace
2. Update Redirect URL to: `https://studai-xxxxx.ondigitalocean.app/api/sessions/zoom/callback`
3. Update Webhook URL to: `https://studai-xxxxx.ondigitalocean.app/api/sessions/zoom/webhook`

#### Update Google OAuth (if using)
1. Go to Google Cloud Console
2. Add authorized redirect URI: `https://studai-xxxxx.ondigitalocean.app/auth/google/callback`

#### Update Firebase (if using)
1. Go to Firebase Console → Authentication → Settings
2. Add your App Platform domain to authorized domains

#### Test Your Deployment
1. Visit your app URL
2. Try signing up
3. Check email verification
4. Test Zoom session creation
5. Monitor logs in App Platform dashboard

## Database Migrations

Your app uses Sequelize with `sync()`. On first deployment, tables will be created automatically.

For the new Zoom features (SessionParticipant, actual_start/actual_end fields):

**Option 1: Automatic (Recommended for first deploy)**
The app will auto-create tables on startup.

**Option 2: Manual SQL (If you need precise control)**
1. Go to App Platform → studai-db → Connection Details
2. Use provided credentials to connect via MySQL client
3. Run migration SQL:
```sql
ALTER TABLE sessions 
ADD COLUMN actual_start DATETIME NULL COMMENT 'Actual meeting start time from Zoom webhook',
ADD COLUMN actual_end DATETIME NULL COMMENT 'Actual meeting end time from Zoom webhook';

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

## Updating Your App (Development Workflow)

### Making Changes
```bash
# 1. Make your code changes locally
# 2. Test locally
npm run dev  # Frontend
cd server && npm run dev  # Backend

# 3. Commit and push
git add .
git commit -m "Your changes"
git push origin main

# 4. App Platform auto-deploys (takes 2-5 minutes)
# 5. Check deployment logs in App Platform dashboard
```

### Monitoring
- **Logs**: App Platform → Your App → Runtime Logs
- **Metrics**: CPU, Memory, Response Time charts
- **Alerts**: Set up notifications for errors

## File Uploads Storage

Your app uses Multer with local disk storage. On App Platform:

**Current Setup**: Files stored in container (lost on redeploy)

**For Production** (Recommended): Switch to Digital Ocean Spaces (S3-compatible)

1. **Create Space**:
   - Digital Ocean → Spaces → Create Space
   - Note: Name, Region, Access Key, Secret Key

2. **Install AWS SDK**:
   ```bash
   cd server
   npm install aws-sdk multer-s3
   ```

3. **Update Multer Config** (when ready):
   Configure to use Spaces instead of local disk.

**For Now**: Local storage works fine for testing. Files will be recreated as users upload.

## Custom Domain (Optional)

1. **Add Domain in App Platform**:
   - App Platform → Settings → Domains
   - Add your domain (e.g., `studai.com`)

2. **Update DNS**:
   - Add CNAME record provided by App Platform
   - Wait for DNS propagation (5-30 minutes)

3. **SSL**: Automatic and free via Let's Encrypt

4. **Update Environment Variables**:
   - `CLIENT_URL` → `https://studai.com`
   - Update OAuth redirect URLs in Zoom/Google/Firebase

## Costs Breakdown

### Basic Setup (~$20/month)
- Web Service (basic-xs): $5/month
- MySQL Dev Database: $15/month
- **Total**: $20/month

### Production Setup (~$30/month)
- Web Service (basic-xs): $5/month
- MySQL Production Database: $25/month
- **Total**: $30/month

### Scaling Options
- **basic-xxs**: $5/month (512MB RAM) - Current
- **basic-xs**: $12/month (1GB RAM) - More traffic
- **basic-s**: $24/month (2GB RAM) - High traffic
- **Multiple instances**: Add more containers for redundancy

## Troubleshooting

### App Won't Start
1. Check Runtime Logs for errors
2. Verify all environment variables are set
3. Check database connection (credentials correct?)

### Database Connection Failed
- Verify `studai-db` is running in App Platform
- Check that env vars use `${studai-db.HOSTNAME}` format
- Wait a few minutes after database creation

### Zoom/Google OAuth Not Working
- Verify redirect URLs match your app URL
- Check that secrets are set correctly (no spaces, quotes)
- Ensure callback URLs are whitelisted in OAuth provider

### Email Not Sending
- Use Gmail App Password, not regular password
- Enable "Less secure app access" if needed
- Check EMAIL_USER and EMAIL_PASS are correct

## Benefits You Get

✅ **No Server Management**: No SSH, no updates, no security patches  
✅ **Auto-Deploy**: Push to GitHub → automatically deploys  
✅ **Auto-SSL**: Free HTTPS certificates  
✅ **Auto-Backups**: Database backed up daily  
✅ **Monitoring**: Built-in metrics and logs  
✅ **Scaling**: Click a button to add more resources  
✅ **Rollback**: Revert to previous deployment in one click  

## Next Steps

1. ✅ **Push `.do/app.yaml` to GitHub**
2. 🚀 **Create app in App Platform** (connect GitHub repo)
3. 🔑 **Configure environment variables** (secrets, API keys)
4. ⏱️ **Wait for deployment** (5-10 minutes)
5. 🧪 **Test your app** (signup, email, Zoom, etc.)
6. 🎯 **Configure OAuth providers** (update redirect URLs)
7. 🌐 **Add custom domain** (optional)
8. 📊 **Monitor logs and metrics**

You're all set! App Platform will handle the infrastructure while you focus on building features. 🎉
