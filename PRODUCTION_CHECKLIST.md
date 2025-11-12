# 🚀 Production Readiness Checklist

## ⚠️ Critical Issues (Must Fix Before Deployment)

### 🔴 Code Issues

- [ ] **Replace all hardcoded localhost URLs**
  - Found 30+ occurrences of `http://localhost:4000`
  - Files to update:
    - `src/api/api.js` - Update baseURL to use `import.meta.env.VITE_API_URL`
    - All component files making direct API calls
  - **Action**: Update `src/api/api.js`:
    ```javascript
    import { API_URL } from '../config/api.config';
    
    const api = axios.create({
      baseURL: API_URL,
      withCredentials: true,
    });
    ```

- [ ] **Remove debug console.logs**
  - Many `console.log()` statements in production code
  - **Action**: Replace with proper logging service (Winston)
  - Keep critical error logs only

- [ ] **Configure CORS for production**
  - Currently: `origin: process.env.CLIENT_URL || 'http://localhost:5173'`
  - **Action**: Set `CLIENT_URL` in production `.env` to your domain
  - Example: `CLIENT_URL=https://studai.com`

### 🔐 Security Issues

- [ ] **Generate strong secrets**
  - `JWT_SECRET` - Used for authentication tokens
  - `SESSION_SECRET` - Used for session encryption
  - **Action**: Generate using: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
  - Add to `server/.env`

- [ ] **Configure OAuth credentials**
  - Zoom OAuth (for session integration)
  - Google OAuth (for authentication)
  - **Action**: 
    1. Register app in Zoom Marketplace
    2. Register app in Google Cloud Console
    3. Add credentials to `server/.env`

- [ ] **Add Helmet.js for security headers**
  - Not currently configured
  - **Action**: 
    ```javascript
    const helmet = require('helmet');
    app.use(helmet({
      contentSecurityPolicy: false, // Configure based on needs
      crossOriginEmbedderPolicy: false
    }));
    ```

- [ ] **Configure file upload limits**
  - Check `multer` configuration in `server.js`
  - Set appropriate file size limits
  - Validate file types strictly

### 🗄️ Database Issues

- [ ] **Set up production MySQL database**
  - Create database with proper character set (utf8mb4)
  - Create dedicated database user with limited privileges
  - **Action**: See DEPLOYMENT.md Section 3

- [ ] **Run database migrations**
  - Ensure all Sequelize models sync properly
  - Test with sample data
  - **Action**: 
    ```javascript
    // In server.js - already has:
    sequelize.sync({ alter: true })
    ```
  - For production, consider using migrations instead of `sync`

- [ ] **Set up database backups**
  - Daily automated backups
  - Test restore procedures
  - **Action**: Create cron job for `mysqldump`

### 📧 Email Configuration

- [ ] **Configure email service**
  - Set up Nodemailer credentials
  - Test email sending
  - **Action**: Add to `server/.env`:
    ```
    EMAIL_HOST=smtp.gmail.com
    EMAIL_PORT=587
    EMAIL_USER=your-email@gmail.com
    EMAIL_PASS=your-app-password
    ```

### 🔥 Firebase Configuration

- [ ] **Set up Firebase project**
  - Configure Firebase for real-time quiz battles
  - **Action**: Add Firebase config to `server/.env`:
    ```
    FIREBASE_PROJECT_ID=your-project-id
    FIREBASE_PRIVATE_KEY=...
    FIREBASE_CLIENT_EMAIL=...
    ```

## 🟡 Important Issues (Should Fix)

### 📊 Monitoring & Logging

- [ ] **Add proper logging**
  - Install Winston or similar
  - Log levels: error, warn, info, debug
  - **Action**:
    ```bash
    cd server && npm install winston
    ```

- [ ] **Set up error monitoring**
  - Consider Sentry for error tracking
  - **Action**:
    ```bash
    npm install @sentry/node @sentry/react
    ```

- [ ] **Health check endpoint**
  - ✅ Already added at `/health`
  - Returns server status and database connection
  - Use for Docker healthcheck and monitoring

### ⚡ Performance

- [ ] **Enable React production mode**
  - Build with `npm run build`
  - Vite automatically optimizes for production
  - **Action**: Ensure `NODE_ENV=production` in build

- [ ] **Configure caching**
  - Static assets caching (already in nginx.conf)
  - API response caching where appropriate
  - **Action**: Add Redis for session storage and caching

- [ ] **Database indexing**
  - Review database queries
  - Add indexes on frequently queried columns
  - **Action**: Add indexes in Sequelize models

- [ ] **Add compression**
  - ✅ Already configured in nginx.conf (gzip)
  - Ensure enabled in production

### 📁 File Storage

- [ ] **Configure persistent file storage**
  - Current: Local filesystem (`server/uploads/`)
  - Issue: Files lost on container restart
  - **Options**:
    1. DigitalOcean Spaces (S3-compatible)
    2. Mount volume in Docker
    3. Separate file server
  - **Action**: Implement cloud storage or volume mounting

### 🔒 SSL/TLS

- [ ] **Set up SSL certificate**
  - Use Let's Encrypt (free)
  - Configure auto-renewal
  - **Action**: See DEPLOYMENT.md Section 6

- [ ] **Force HTTPS**
  - Redirect HTTP to HTTPS
  - ✅ Already configured in nginx.conf

### 🛡️ Additional Security

- [ ] **Rate limiting**
  - ✅ Already has express-rate-limit
  - Verify configuration is strict enough

- [ ] **Input validation**
  - Review all endpoints for input sanitization
  - Add validation middleware
  - **Action**: Consider using `express-validator`

- [ ] **SQL injection protection**
  - ✅ Using Sequelize ORM (protected)
  - Ensure parameterized queries everywhere

## 🟢 Nice to Have

### 📈 Analytics

- [ ] Add Google Analytics or similar
- [ ] Set up application metrics (Prometheus)
- [ ] User behavior tracking

### 🔄 CI/CD

- [ ] Set up GitHub Actions for automated deployment
- [ ] Automated testing pipeline
- [ ] Staging environment

### 📱 PWA

- [ ] Test PWA functionality
- [ ] ✅ Already configured with vite-plugin-pwa
- [ ] Test offline capabilities
- [ ] Test on mobile devices

### 🧪 Testing

- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Add E2E tests
- [ ] Set up test coverage reporting

## ✅ Already Configured

- ✅ Toast notification system (consistent UX)
- ✅ Custom confirmation dialogs (Tailwind-styled)
- ✅ JWT authentication
- ✅ Session management
- ✅ File upload (Multer)
- ✅ PWA configuration
- ✅ Vite build optimization
- ✅ Express rate limiting
- ✅ CORS configuration
- ✅ Environment variable support
- ✅ PM2 process management (ecosystem.config.js)
- ✅ Nginx reverse proxy (nginx.conf)
- ✅ Docker support (Dockerfile)
- ✅ Health check endpoint

## 📝 Environment Files Status

### Frontend (.env)
- ✅ `.env.example` created
- [ ] Create `.env` from example
- [ ] Set `VITE_API_URL` to production domain

### Backend (server/.env)
- ✅ `server/.env.example` created (comprehensive)
- [ ] Create `server/.env` from example
- [ ] Configure all required services:
  - Database credentials
  - JWT secrets
  - Zoom OAuth
  - Google OAuth
  - Firebase
  - Email service

## 🎯 Immediate Next Steps

1. **Create API configuration** (✅ Done: `src/config/api.config.js`)
2. **Update hardcoded URLs** (⏳ In Progress)
   - Update `src/api/api.js` to import from config
   - Search and replace other occurrences
3. **Set up environment files**
   - Copy `.env.example` to `.env`
   - Copy `server/.env.example` to `server/.env`
   - Fill in all credentials
4. **Test locally with production settings**
   - Build frontend: `npm run build`
   - Start backend: `cd server && node server.js`
5. **Follow DEPLOYMENT.md** for DigitalOcean setup

## 📞 Support Checklist

- [ ] Document admin procedures
- [ ] Create runbook for common issues
- [ ] Set up monitoring alerts
- [ ] Create backup/restore procedures
- [ ] Document deployment process
- [ ] Train team on production management

---

## 🚦 Deployment Readiness Score

**Current Status**: 🟡 **65%** Ready for Production

### Breakdown:
- ✅ Infrastructure: 90% (Docker, PM2, Nginx configured)
- 🟡 Configuration: 50% (Needs environment setup)
- 🟡 Security: 60% (Needs secrets and OAuth setup)
- ✅ Code Quality: 85% (Toast/confirm systems done)
- 🔴 URLs: 20% (Hardcoded localhost needs fixing)
- 🟡 Monitoring: 40% (Health check added, needs logging)

### To Reach 100%:
1. Fix hardcoded URLs (Critical)
2. Set up all environment variables (Critical)
3. Configure OAuth services (Critical)
4. Add proper logging (Important)
5. Set up file storage (Important)
6. Test thoroughly in staging environment

**Estimated time to production-ready: 4-6 hours**
