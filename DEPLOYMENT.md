# StudAI - DigitalOcean Deployment Guide

## 🚀 Pre-Deployment Checklist

### ✅ Issues to Fix Before Production

#### 🔴 CRITICAL - Must Fix:

1. **Hardcoded localhost URLs**
   - [ ] Replace all `http://localhost:4000` references with environment variables
   - [ ] Update `src/api/api.js` to use `VITE_API_URL`
   - [ ] Update all component files using hardcoded URLs

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
   - [ ] Validate all user inputs
   - [ ] Add SQL injection protection (using Sequelize - OK)

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
   - [ ] Add file size limits
   - [ ] Add file type validation
   - [ ] Set up upload directory permissions

## 📋 DigitalOcean Droplet Setup

### 1. Create Droplet
```bash
# Recommended specs:
- OS: Ubuntu 22.04 LTS
- Size: 2GB RAM / 2 vCPUs (Basic - $18/month)
- Region: Choose closest to your users
- Add SSH key for secure access
```

### 2. Initial Server Setup
```bash
# Connect to your droplet
ssh root@your_droplet_ip

# Update system
apt update && apt upgrade -y

# Create a new user
adduser studai
usermod -aG sudo studai
su - studai

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Git
sudo apt install -y git
```

### 3. Set up MySQL Database
```bash
sudo mysql

CREATE DATABASE studai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'studai_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON studai_db.* TO 'studai_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Deploy Application
```bash
# Clone repository
cd /var/www
sudo mkdir studai
sudo chown studai:studai studai
cd studai
git clone your-repo-url .

# Install dependencies
npm install
cd server && npm install && cd ..

# Set up environment variables
cp .env.example .env
cp server/.env.example server/.env

# Edit .env files with production values
nano .env
nano server/.env

# Build frontend
npm run build

# Set up uploads directory
mkdir -p server/uploads/profile_pictures
chmod 755 server/uploads

# Start backend with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Configure Nginx
```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/studai
sudo ln -s /etc/nginx/sites-available/studai /etc/nginx/sites-enabled/

# Update domain in nginx config
sudo nano /etc/nginx/sites-available/studai
# Replace 'your-domain.com' with actual domain

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# Enable nginx on boot
sudo systemctl enable nginx
```

### 6. Set up SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot will auto-configure SSL in nginx
# Certificates auto-renew
```

### 7. Set up Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

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

### Initial Deployment
```bash
cd /var/www/studai
git pull origin main
npm install
cd server && npm install && cd ..
npm run build
pm2 restart studai-backend
```

### For Updates
```bash
cd /var/www/studai
git pull origin main
npm install
cd server && npm install && cd ..
npm run build
pm2 restart studai-backend
```

## 📊 Monitoring

### PM2 Monitoring
```bash
# View logs
pm2 logs studai-backend

# Monitor processes
pm2 monit

# Check status
pm2 status
```

### System Monitoring
```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU
top
```

## 🔐 Security Best Practices

1. **Keep system updated**
```bash
sudo apt update && sudo apt upgrade -y
```

2. **Use strong passwords**
   - Database passwords
   - SSH keys instead of passwords
   - JWT secrets

3. **Regular backups**
```bash
# Database backup script
mysqldump -u studai_user -p studai_db > backup_$(date +%Y%m%d).sql
```

4. **Monitor logs**
```bash
pm2 logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🐛 Troubleshooting

### Backend won't start
```bash
pm2 logs studai-backend
# Check for errors in logs
```

### Database connection issues
```bash
# Check MySQL is running
sudo systemctl status mysql

# Test connection
mysql -u studai_user -p studai_db
```

### Nginx issues
```bash
# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## 📈 Performance Optimization

1. **Enable Nginx caching**
2. **Use CDN for static assets**
3. **Enable gzip compression** (already in nginx.conf)
4. **Database indexing**
5. **PM2 cluster mode** (already configured)

## 💰 Cost Estimation

### DigitalOcean Droplet
- Basic Droplet (2GB RAM): $18/month
- Managed Database (optional): $15/month
- Spaces for file storage (optional): $5/month
- Domain name: ~$12/year
- **Total: ~$23-38/month**

## 📞 Support Resources

- DigitalOcean Docs: https://docs.digitalocean.com
- PM2 Docs: https://pm2.keymetrics.io
- Nginx Docs: https://nginx.org/en/docs
- Let's Encrypt: https://letsencrypt.org

---

## ⚠️ Before Going Live

- [ ] Test all features thoroughly
- [ ] Set up database backups
- [ ] Configure error monitoring
- [ ] Set up uptime monitoring
- [ ] Create deployment checklist
- [ ] Document admin procedures
- [ ] Train team on deployment process
