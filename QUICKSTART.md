# 🚀 Quick Start: Production Deployment

## ⚡ 15-Minute Setup Guide

### Step 1: Fix Hardcoded URLs (5 minutes)
```bash
# 1. Already done:
✅ src/config/api.config.js created
✅ src/api/api.js updated

# 2. Update remaining files:
# See HARDCODED_URLS.md for complete list
# Replace all "http://localhost:4000" with:
import { API_URL } from '../config/api.config';
`${API_URL}/api/...`
```

### Step 2: Create Environment Files (5 minutes)
```bash
# Frontend
cp .env.example .env
# Edit .env:
VITE_API_URL=http://localhost:4000  # For local testing

# Backend
cd server
cp .env.example .env
# Edit server/.env with your values
```

### Step 3: Test Locally (5 minutes)
```bash
# Terminal 1 - Backend
cd server
npm install
node server.js

# Terminal 2 - Frontend
npm install
npm run dev

# Test in browser: http://localhost:5173
```

---

## 🎯 Production Deployment (60 minutes)

### Prerequisites:
- DigitalOcean account
- Domain name (optional but recommended)
- SSH key for secure access

### 1. Create Droplet (5 min)
```bash
# On DigitalOcean:
- Choose: Ubuntu 22.04 LTS
- Size: Basic - 2GB RAM ($18/month)
- Add SSH key
- Create Droplet
```

### 2. Initial Server Setup (10 min)
```bash
ssh root@your_droplet_ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install tools
npm install -g pm2
apt install -y nginx mysql-server git
```

### 3. Set up MySQL (5 min)
```bash
mysql_secure_installation

mysql -u root -p
CREATE DATABASE studai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'studai_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON studai_db.* TO 'studai_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Deploy Application (15 min)
```bash
# Clone repo
cd /var/www
mkdir studai && cd studai
git clone your-repo-url .

# Install dependencies
npm install
cd server && npm install && cd ..

# Set up environment
cp .env.example .env
cp server/.env.example server/.env
nano .env  # Edit with production URL
nano server/.env  # Edit with DB credentials, secrets, etc.

# Build frontend
npm run build

# Create uploads directory
mkdir -p server/uploads/profile_pictures
chmod 755 server/uploads

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions
```

### 5. Configure Nginx (10 min)
```bash
# Copy config
cp nginx.conf /etc/nginx/sites-available/studai

# Edit domain
nano /etc/nginx/sites-available/studai
# Replace 'your-domain.com' with actual domain or droplet IP

# Enable site
ln -s /etc/nginx/sites-available/studai /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl restart nginx
systemctl enable nginx
```

### 6. Set up SSL (10 min)
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is configured automatically
```

### 7. Configure Firewall (5 min)
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

---

## ✅ Verification Checklist

### Local Testing:
- [ ] Backend starts without errors
- [ ] Frontend builds successfully
- [ ] Login/logout works
- [ ] File upload works
- [ ] Quiz features work
- [ ] Admin panel accessible

### Production Testing:
- [ ] HTTPS works (green padlock)
- [ ] All pages load correctly
- [ ] API calls work (check browser console)
- [ ] Login with Google OAuth works
- [ ] File uploads work
- [ ] Database connections stable
- [ ] PM2 shows all processes running

---

## 🔧 Common Issues & Fixes

### Issue: "Cannot connect to API"
```bash
# Check backend is running
pm2 status

# Check logs
pm2 logs studai-backend

# Restart if needed
pm2 restart studai-backend
```

### Issue: "Database connection failed"
```bash
# Check MySQL is running
systemctl status mysql

# Test connection
mysql -u studai_user -p studai_db
```

### Issue: "502 Bad Gateway"
```bash
# Check Nginx config
nginx -t

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx
```

### Issue: "SSL certificate not working"
```bash
# Renew certificate
certbot renew --dry-run

# If renewal fails, get new cert
certbot --nginx -d your-domain.com
```

---

## 📊 Health Check

```bash
# Check all services
systemctl status nginx
systemctl status mysql
pm2 status

# Check disk space
df -h

# Check memory
free -h

# Check logs
pm2 logs studai-backend --lines 50
tail -f /var/log/nginx/access.log
```

---

## 🔄 Update/Redeploy

```bash
cd /var/www/studai

# Pull latest code
git pull origin main

# Update dependencies
npm install
cd server && npm install && cd ..

# Rebuild frontend
npm run build

# Restart backend
pm2 restart studai-backend

# No need to restart Nginx (serves static files)
```

---

## 📱 Quick Commands

```bash
# View PM2 logs
pm2 logs

# Monitor PM2 processes
pm2 monit

# Restart backend
pm2 restart studai-backend

# Stop all
pm2 stop all

# View Nginx logs
tail -f /var/log/nginx/error.log

# Test Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx

# Database backup
mysqldump -u studai_user -p studai_db > backup.sql

# Database restore
mysql -u studai_user -p studai_db < backup.sql
```

---

## 💰 Monthly Costs

| Service | Cost |
|---------|------|
| Basic Droplet (2GB RAM) | $18 |
| Domain Name (optional) | ~$1 |
| **Total** | **$18-19/month** |

SSL Certificate: **FREE** (Let's Encrypt)

---

## 📞 Emergency Contacts

- **DigitalOcean Support**: https://cloud.digitalocean.com/support
- **Community Forums**: https://www.digitalocean.com/community
- **Status Page**: https://status.digitalocean.com

---

## 🎉 Success Criteria

Your app is successfully deployed when:
- ✅ Accessible via HTTPS
- ✅ All features work
- ✅ No console errors
- ✅ Database persists data
- ✅ PM2 shows healthy processes
- ✅ Can login and use all features
- ✅ Admin panel accessible

---

## 📖 Detailed Documentation

For more information, see:
- **DEPLOYMENT.md** - Full deployment guide
- **PRODUCTION_CHECKLIST.md** - Pre-deployment checklist
- **PRODUCTION_AUDIT.md** - Comprehensive audit
- **HARDCODED_URLS.md** - URL fix documentation

---

**Good luck! 🚀**
