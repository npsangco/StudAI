# StudAI - Digital Ocean App Platform Deployment Guide

## 🚀 Pre-Deployment Checklist

### ✅ Issues to Fix Before Production

#### 🔴 CRITICAL - Must Fix:

1. **Hardcoded localhost URLs**
   - [x] Replace all `http://localhost:4000` references with environment variables (✅ SERVER_URL)
   - [x] Update `src/api/api.js` to use `VITE_API_URL` (✅ Already implemented)
   - [x] Update all component files using hardcoded URLs (✅ Using CLIENT_URL)

2. **Missing Environment Configuration**
   - [ ] Create `.env` files from `.env.example`
   - [ ] Configure production database credentials
   - [ ] Set strong JWT_SECRET and SESSION_SECRET
   - [ ] Configure Zoom OAuth credentials
   - [ ] Configure email service credentials
   - [ ] Configure Firebase credentials

3. **Security Issues**
   - [ ] Remove debug console.logs in production
   - [ ] Add rate limiting (already has express-rate-limit)
   - [ ] Configure CORS for production domain only
   - [ ] Add helmet.js for security headers
   - [x] Validate all user inputs (✅ COMPLETED - See VALIDATION_ERROR_HANDLING.md)
   - [x] Add SQL injection protection (using Sequelize - OK)
   - [x] Frontend validation with comprehensive rules
   - [x] Backend validation middleware
   - [x] Centralized error handling
   - [x] Input sanitization and XSS prevention

4. **Database**
   - [ ] Set up production MySQL database
   - [ ] Run database migrations
   - [ ] Create database backups strategy
   - [ ] Configure database connection pooling

#### 🟡 IMPORTANT - Should Fix:

5. **Error Handling**
   - [ ] Add proper error logging (Winston/Morgan)
   - [ ] Set up error monitoring (Sentry)
   - [ ] Add health check endpoint
   - [ ] Implement graceful shutdown

6. **Performance**
   - [ ] Enable production mode for React
   - [ ] Minimize and compress assets
   - [ ] Set up CDN for static assets
   - [ ] Configure caching headers
   - [ ] Add database indexing

7. **File Uploads**
   - [ ] Configure file storage (DigitalOcean Spaces or S3)
   - [x] Add file size limits (✅ 25MB max)
   - [x] Add file type validation (✅ PDF, PPT, PPTX only)
   - [ ] Set up upload directory permissions

## 📋 Digital Ocean App Platform Setup

### Overview
App Platform is a Platform-as-a-Service (PaaS) that automates infrastructure management. Perfect for solo developers!

**Benefits:**
- ✅ No server management (no SSH, no updates)
- ✅ Auto-deploy on git push
- ✅ Built-in SSL/HTTPS
- ✅ Managed database with backups
- ✅ Easy scaling via UI
- ✅ Monitoring and logs included

### Step 1: Prepare Your Repository

1. **Commit all changes to GitHub:**
```bash
git add .
git commit -m "Prepare for App Platform deployment"
git push origin main
```

2. **Verify files are in place:**
   - ✅ `.do/app.yaml` (App Platform configuration)
   - ✅ `Dockerfile` (optimized for App Platform)
   - ✅ `.env.example` files (templates for environment variables)

### Step 2: Create App in App Platform

1. **Go to Digital Ocean Dashboard:**
   - Visit: https://cloud.digitalocean.com/apps
   - Click "Create App"

2. **Connect GitHub Repository:**
   - Choose "GitHub" as source
   - Authorize Digital Ocean to access your GitHub
   - Select repository: `npsangco/StudAI`
   - Select branch: `main`
   - ✅ Enable "Autodeploy" (deploys on every push)

3. **Review Configuration:**
   - App Platform will detect your `.do/app.yaml`
   - Verify resources:
     - Web Service: `studai-web` (basic-xs plan)
     - Database: `studai-db` (MySQL 8)
   - Click "Next"

4. **Configure Environment Variables:**
   
   **IMPORTANT:** Update these values in the App Platform dashboard:
   
   **Generate Secrets** (run locally):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   
   - `SESSION_SECRET` → Use generated secret
   - `JWT_SECRET` → Use another generated secret
   - `EMAIL_USER` → Your Gmail address
   - `EMAIL_PASS` → Gmail app-specific password (not regular password)
     - Get it at: https://myaccount.google.com/apppasswords
   - `ZOOM_CLIENT_ID` → From Zoom App Marketplace
   - `ZOOM_CLIENT_SECRET` → From Zoom App Marketplace
   - `ZOOM_WEBHOOK_SECRET_TOKEN` → From Zoom App webhook settings
   - `GOOGLE_CLIENT_ID` → From Google Cloud Console
   - `GOOGLE_CLIENT_SECRET` → From Google Cloud Console
   - `FIREBASE_*` → All Firebase config values from Firebase Console

   **Auto-configured** (no change needed):
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` → Auto-filled
   - `CLIENT_URL`, `SERVER_URL`, `VITE_API_URL` → Auto-generated
   - `ZOOM_REDIRECT_URL`, `GOOGLE_CALLBACK_URL` → Auto-generated

5. **Review & Deploy:**
   - Review the pricing estimate (~$20-30/month)
   - Click "Create Resources"
   - Wait 5-10 minutes for initial deployment

### Step 3: Post-Deployment Configuration

Once deployed, you'll get a URL like: `https://studai-xxxxx.ondigitalocean.app`

1. **Update Zoom OAuth Redirect URLs:**
   - Go to: https://marketplace.zoom.us/
   - Navigate to your OAuth app
   - Update Redirect URL: `https://studai-xxxxx.ondigitalocean.app/api/sessions/zoom/callback`
   - Update Webhook URL: `https://studai-xxxxx.ondigitalocean.app/api/sessions/zoom/webhook`

2. **Update Google OAuth (if using):**
   - Go to: https://console.cloud.google.com/
   - Navigate to your OAuth app
   - Add authorized redirect URI: `https://studai-xxxxx.ondigitalocean.app/auth/google/callback`

3. **Update Firebase (if using):**
   - Go to Firebase Console → Authentication → Settings
   - Add your App Platform domain to authorized domains

### Step 4: Test Your Deployment

1. Visit your app URL
2. Test user signup (verify email arrives)
3. Test login
4. Test Zoom session creation
5. Check logs in App Platform dashboard for errors

## 🔧 Environment Variables Setup

### Frontend (.env)
```env
VITE_API_URL=https://your-domain.com
```

### Backend (server/.env)
```env
NODE_ENV=production
PORT=4000
DB_NAME=studai_db
DB_USER=studai_user
DB_PASS=your_strong_password
DB_HOST=localhost
DB_PORT=3306
JWT_SECRET=generate-a-very-strong-secret-here
SESSION_SECRET=generate-another-strong-secret-here
CLIENT_URL=https://your-domain.com
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_REDIRECT_URL=https://your-domain.com/api/sessions/zoom/callback
```

## 🔄 Deployment Workflow

### Making Updates

App Platform automatically deploys when you push to GitHub:

```bash
# 1. Make your code changes locally
# 2. Test locally
npm run dev  # Test frontend
cd server && npm run dev  # Test backend

# 3. Commit and push to GitHub
git add .
git commit -m "Your update description"
git push origin main

# 4. App Platform automatically deploys (takes 3-5 minutes)
# 5. Monitor deployment in App Platform dashboard
```

### Manual Redeploy

If you need to redeploy without code changes:
1. Go to App Platform dashboard
2. Select your app
3. Click "Actions" → "Force Rebuild and Deploy"

### Rollback to Previous Version

If deployment fails or has issues:
1. Go to App Platform dashboard
2. Click "Deployments" tab
3. Find previous successful deployment
4. Click "Rollback" → Instant rollback, no downtime

## 📊 Monitoring

### App Platform Dashboard

1. **Runtime Logs:**
   - App Platform → Your App → "Runtime Logs" tab
   - Real-time logs from your application
   - Filter by component (web service, database)
   - Search logs by keyword

2. **Metrics:**
   - CPU usage graph
   - Memory usage graph
   - HTTP response times
   - Request count
   - Error rates

3. **Deployment History:**
   - See all past deployments
   - Status: success/failed
   - Duration of each deployment
   - One-click rollback

4. **Alerts** (optional):
   - Set up email/Slack notifications
   - CPU/Memory threshold alerts
   - Deployment status alerts

### Database Monitoring

1. **Database Metrics:**
   - App Platform → Databases → studai-db
   - Connection count
   - Query performance
   - Storage usage

2. **Automated Backups:**
   - Daily automatic backups
   - Point-in-time recovery
   - Manual backup option

## 🔐 Security Best Practices

1. **Use Strong Secrets**
   - Generate random SESSION_SECRET and JWT_SECRET
   - Use "SECRET" type in App Platform for sensitive env vars
   - Never commit secrets to GitHub

2. **Database Security**
   - App Platform databases are private by default
   - Only accessible from your app
   - Automatic SSL/TLS encryption
   - Daily automatic backups

3. **HTTPS/SSL**
   - Automatic SSL certificates (Let's Encrypt)
   - Auto-renewal
   - Force HTTPS redirects

4. **Monitor Logs**
   - Check Runtime Logs daily
   - Look for failed login attempts
   - Monitor error rates
   - Set up alerts for unusual activity

5. **Access Control**
   - Use GitHub's branch protection rules
   - Require pull request reviews before merging to main
   - Limit who can deploy to production

## 🐛 Troubleshooting

### Deployment Failed

1. **Check Build Logs:**
   - App Platform → Deployments → Click failed deployment
   - Review build output for errors
   - Common issues:
     - Missing dependencies in package.json
     - Build command failed
     - Dockerfile syntax errors

2. **Environment Variable Issues:**
   - Verify all required env vars are set
   - Check for typos in variable names
   - Ensure SECRET type for sensitive values

### App Won't Start

1. **Check Runtime Logs:**
   - Look for startup errors
   - Common issues:
     - Database connection failed (check credentials)
     - Port already in use (should be 4000)
     - Missing environment variables

2. **Database Connection Failed:**
   - Verify database is running (App Platform → Databases)
   - Check env vars use `${studai-db.HOSTNAME}` format
   - Wait a few minutes after database creation

### Zoom/Google OAuth Not Working

1. **Verify Redirect URLs:**
   - Must match exactly in OAuth provider settings
   - Use your App Platform URL (not localhost)
   - Include full path: `/api/sessions/zoom/callback`

2. **Check Secrets:**
   - Ensure no extra spaces or quotes
   - Verify CLIENT_ID and CLIENT_SECRET are correct

### Email Not Sending

1. **Gmail App Password:**
   - Must use App Password, not regular password
   - Enable 2-factor authentication first
   - Generate new App Password if issues persist

### Performance Issues

1. **Scale Up Resources:**
   - App Platform → Settings → Edit Plan
   - Upgrade from basic-xs to basic-s or higher
   - Add more instances for load balancing

2. **Database Performance:**
   - Check connection pool settings
   - Monitor slow queries
   - Consider upgrading database tier

## 📈 Performance Optimization

### Automatic Optimizations (Built-in)
- ✅ CDN for static assets
- ✅ HTTP/2 support
- ✅ Gzip compression
- ✅ DDoS protection
- ✅ Load balancing (multi-instance)

### Manual Optimizations

1. **Database Indexing:**
   - Add indexes to frequently queried columns
   - Use Sequelize index definitions in models

2. **Caching:**
   - Implement Redis for session storage
   - Cache frequently accessed data

3. **File Storage:**
   - Move uploads to Digital Ocean Spaces
   - Offload static file serving

4. **Scaling:**
   - Increase instance count (horizontal scaling)
   - Upgrade instance size (vertical scaling)
   - Enable database read replicas (for high traffic)

## 💰 Cost Estimation

### App Platform Pricing

**Basic Setup (~$20/month):**
- Web Service (basic-xs, 512MB RAM): $5/month
- MySQL Dev Database (1GB RAM): $15/month
- **Total: $20/month**

**Production Setup (~$30/month):**
- Web Service (basic-xs, 512MB RAM): $5/month
- MySQL Production Database (2GB RAM): $25/month
- **Total: $30/month**

**High Traffic Setup (~$60/month):**
- Web Service (basic-s, 1GB RAM): $12/month
- Multiple instances (2x): $24/month
- MySQL Production Database: $25/month
- Spaces (file storage): $5/month
- **Total: ~$54-66/month**

**Additional Costs:**
- Custom domain: ~$12/year (optional)
- Spaces for file storage: $5/month (optional)
- Bandwidth overage: $0.01/GB over limits

**Cost Comparison:**
- Droplet (self-managed): ~$23/month + your time
- App Platform: ~$20-30/month + no management time
- **App Platform is cheaper when factoring in time savings!**

## 📞 Support Resources

- **App Platform Docs:** https://docs.digitalocean.com/products/app-platform/
- **App Platform Tutorials:** https://www.digitalocean.com/community/tags/app-platform
- **Managed Databases:** https://docs.digitalocean.com/products/databases/
- **Spaces (Storage):** https://docs.digitalocean.com/products/spaces/
- **Digital Ocean Community:** https://www.digitalocean.com/community/
- **Support Tickets:** https://cloud.digitalocean.com/support/tickets

## 📄 Detailed Guides

For more detailed setup instructions, see:
- **APP_PLATFORM_DEPLOYMENT.md** - Step-by-step deployment guide
- **ZOOM_WEBHOOK_SETUP.md** - Zoom integration configuration
- **VALIDATION_ERROR_HANDLING.md** - Security and validation documentation

---

## ⚠️ Before Going Live

- [ ] Push all code to GitHub main branch
- [ ] Create app in App Platform
- [ ] Configure all environment variables
- [ ] Update OAuth redirect URLs (Zoom, Google)
- [ ] Test user signup and email verification
- [ ] Test Zoom session creation
- [ ] Test all major features
- [ ] Set up monitoring alerts
- [ ] Add custom domain (optional)
- [ ] Review security settings
- [ ] Document deployment process
- [ ] Create backup/recovery plan

---

## 🎉 You're Ready!

App Platform handles all the infrastructure complexity. Focus on building features, not managing servers!

**Quick Deploy Checklist:**
1. ✅ `.do/app.yaml` exists
2. ✅ `Dockerfile` optimized
3. ✅ Push to GitHub
4. ✅ Create app in App Platform
5. ✅ Configure environment variables
6. ✅ Wait for deployment
7. ✅ Update OAuth redirect URLs
8. ✅ Test and launch! 🚀
