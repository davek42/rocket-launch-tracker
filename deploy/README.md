# 🚀 Deployment Guide - Rocket Launch Tracker

This directory contains all the configuration files needed to deploy the Rocket Launch Tracker to AWS Lightsail Ubuntu 24.04 LTS.

## 📋 Files

### 1. `setup.sh` - Automated Server Setup Script

Complete automation script that installs and configures everything needed for production deployment.

**What it does:**
- ✅ Installs Bun runtime (primary runtime for backend)
- ✅ Installs Node.js + PM2 (process manager)
- ✅ Installs Nginx (reverse proxy + static file server)
- ✅ Installs Certbot (SSL certificates)
- ✅ Clones repository
- ✅ Installs dependencies with Bun
- ✅ Initializes database
- ✅ Builds frontend for production
- ✅ Configures Nginx
- ✅ Starts backend with PM2
- ✅ Sets up daily sync cron job
- ✅ Configures firewall (UFW)

**Usage:**
```bash
sudo ./deploy/setup.sh
```

### 2. `ecosystem.config.js` - PM2 Process Manager Configuration

Tells PM2 how to manage the Bun-based Express backend.

**Key features:**
- Uses Bun as interpreter (not Node.js)
- Fork mode (Bun doesn't support cluster)
- Auto-restart on crashes
- 500MB memory limit
- Comprehensive logging

**Usage:**
```bash
pm2 start deploy/ecosystem.config.js
pm2 status
pm2 logs rocket-launches-api
```

### 3. `nginx.conf` - Nginx Reverse Proxy Configuration

Configures Nginx to serve the frontend and proxy API requests to the backend.

**Key features:**
- Serves React frontend from `frontend/dist`
- Proxies `/api/*` to backend on port 3005
- Security headers (HSTS, X-Frame-Options, etc.)
- Static asset caching (1 year for immutable assets)
- Gzip compression
- HTTP/2 support
- SSL ready (uncomment HTTPS section after Certbot)

**Installation:**
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/rocket-launches
sudo ln -s /etc/nginx/sites-available/rocket-launches /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🚀 Quick Start Deployment

### Prerequisites

1. **AWS Lightsail Instance**
   - Ubuntu 24.04 LTS
   - At least 1GB RAM (2GB recommended)
   - Static IP assigned

2. **Domain Name** (optional, for SSL)
   - DNS A record pointing to your Lightsail IP

3. **API Key**
   - Get free API key from [The Space Devs](https://thespacedevs.com/llapi)

### Step 1: Connect to Your Server

```bash
ssh ubuntu@your-server-ip
```

### Step 2: Update Repository Configuration

Before running the setup script, update these placeholders in `deploy/setup.sh`:

```bash
REPO_URL="https://github.com/yourusername/rocket-launches.git"  # Your actual repo URL
DOMAIN="yourdomain.com"  # Your actual domain name
```

### Step 3: Run Setup Script

```bash
# Clone the repository
cd /var/www
sudo git clone YOUR_REPO_URL rocket-launches
cd rocket-launches

# Run automated setup
sudo ./deploy/setup.sh
```

The script will take 5-10 minutes to complete. Watch for any errors.

### Step 4: Configure API Key

```bash
sudo nano /var/www/rocket-launches/backend/.env
```

Update the `LL2_API_KEY` line with your actual API key:
```
LL2_API_KEY=your_actual_api_key_here
```

Save and exit (Ctrl+X, Y, Enter).

### Step 5: Load Initial Data

```bash
cd /var/www/rocket-launches/backend
/home/ubuntu/.bun/bin/bun run initial-load
```

This will load ~7,000+ historical and upcoming launches. It takes 10-15 minutes due to API rate limits.

### Step 6: Configure SSL (Optional but Recommended)

**Prerequisites:**
- Domain DNS A record must point to your server IP
- Wait for DNS propagation (can take up to 24 hours)

**Steps:**
```bash
# Verify DNS is working
nslookup yourdomain.com

# Run Certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

Certbot will automatically:
- Obtain SSL certificate from Let's Encrypt
- Update Nginx configuration
- Set up auto-renewal (runs twice daily)

## 🔍 Verification

After deployment, verify everything is working:

### 1. Check Backend Health
```bash
curl http://localhost:3005/health
# Expected: {"status":"ok",...}
```

### 2. Check PM2 Status
```bash
pm2 status
# Expected: rocket-launches-api "online"
```

### 3. Check Database
```bash
ls -lh /var/www/rocket-launches/backend/data/
# Expected: launches.db file exists
```

### 4. Check Frontend (via Nginx)
```bash
curl http://localhost/
# Expected: HTML content
```

### 5. Check API (via Nginx)
```bash
curl http://localhost/api/launches?limit=1
# Expected: JSON with launches
```

### 6. Check Cron Job
```bash
crontab -l | grep daily-sync
# Expected: Cron entry for 4 AM UTC
```

### 7. View Logs
```bash
pm2 logs rocket-launches-api --lines 20
# Expected: No errors, recent activity
```

## 📊 Management Commands

### PM2 Process Management

```bash
# View status
pm2 status

# View logs
pm2 logs rocket-launches-api
pm2 logs rocket-launches-api --lines 100
pm2 logs rocket-launches-api --err  # Errors only

# Restart application
pm2 restart rocket-launches-api

# Stop application
pm2 stop rocket-launches-api

# Start application
pm2 start rocket-launches-api

# Delete from PM2
pm2 delete rocket-launches-api

# Monitor in real-time
pm2 monit
```

### Application Updates

```bash
# Pull latest code
cd /var/www/rocket-launches
git pull origin main

# Update backend dependencies
cd backend
/home/ubuntu/.bun/bin/bun install

# Update frontend dependencies
cd ../frontend
/home/ubuntu/.bun/bin/bun install

# Rebuild frontend
/home/ubuntu/.bun/bin/bun run build

# Restart backend
pm2 restart rocket-launches-api

# Reload Nginx (if nginx.conf changed)
sudo systemctl reload nginx
```

### Manual Data Sync

```bash
cd /var/www/rocket-launches/backend
/home/ubuntu/.bun/bin/bun run daily-sync
```

### View Sync Logs

```bash
tail -f /var/log/rocket-launches/sync.log
```

### Nginx Management

```bash
# Test configuration
sudo nginx -t

# Reload (for config changes)
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# View logs
tail -f /var/log/nginx/rocket-launches-error.log
tail -f /var/log/nginx/rocket-launches-access.log
```

### Firewall Management

```bash
# View status
sudo ufw status

# Add new rule
sudo ufw allow 8080/tcp

# Remove rule
sudo ufw delete allow 8080/tcp
```

## 🐛 Troubleshooting

### Backend Won't Start

**Symptoms:** PM2 shows "errored" or "stopped"

**Solutions:**
```bash
# Check PM2 logs
pm2 logs rocket-launches-api --err

# Common issues:
# 1. Database file missing
ls -la /var/www/rocket-launches/backend/data/

# 2. .env file missing or invalid
cat /var/www/rocket-launches/backend/.env

# 3. Port already in use
sudo lsof -i :3005

# 4. Bun not found
ls -la /home/ubuntu/.bun/bin/bun
```

### 502 Bad Gateway

**Symptoms:** Nginx returns 502 error

**Solutions:**
```bash
# 1. Check if backend is running
pm2 status

# 2. Check backend logs
pm2 logs rocket-launches-api

# 3. Verify port in Nginx config
grep "127.0.0.1" /etc/nginx/sites-available/rocket-launches
# Should show: server 127.0.0.1:3005;

# 4. Test Nginx config
sudo nginx -t

# 5. Restart everything
pm2 restart rocket-launches-api
sudo systemctl reload nginx
```

### Daily Sync Not Running

**Symptoms:** No new launches appearing, sync.log not updating

**Solutions:**
```bash
# 1. Check crontab
crontab -l | grep daily-sync

# 2. Verify Bun path
which bun
# Should be: /home/ubuntu/.bun/bin/bun

# 3. Check sync logs
tail -50 /var/log/rocket-launches/sync.log

# 4. Test manually
cd /var/www/rocket-launches/backend
/home/ubuntu/.bun/bin/bun run daily-sync

# 5. Verify API key is set
grep LL2_API_KEY /var/www/rocket-launches/backend/.env
```

### SSL Certificate Issues

**Symptoms:** Certbot fails, HTTPS not working

**Solutions:**
```bash
# 1. Verify DNS is working
nslookup yourdomain.com
dig yourdomain.com

# 2. Check Nginx is running
sudo systemctl status nginx

# 3. Check port 80 is accessible
curl http://yourdomain.com

# 4. Review Certbot logs
sudo cat /var/log/letsencrypt/letsencrypt.log

# 5. Test certificate renewal
sudo certbot renew --dry-run
```

### Database Locked Errors

**Symptoms:** "database is locked" errors in logs

**Solutions:**
```bash
# 1. Check if WAL mode is enabled
cd /var/www/rocket-launches/backend
/home/ubuntu/.bun/bin/bun run setup-db

# 2. Verify file permissions
ls -la /var/www/rocket-launches/backend/data/

# 3. Check for zombie processes
ps aux | grep bun
```

## 📈 Monitoring & Maintenance

### Disk Space

Monitor disk usage regularly:
```bash
df -h
du -sh /var/www/rocket-launches/backend/data/
du -sh /var/log/rocket-launches/
```

### Log Rotation

PM2 logs rotate automatically. For sync logs, consider adding logrotate:

```bash
sudo nano /etc/logrotate.d/rocket-launches
```

Add:
```
/var/log/rocket-launches/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    copytruncate
}
```

### Database Backups

Create daily backups:
```bash
# Manual backup
cp /var/www/rocket-launches/backend/data/launches.db \
   /var/www/rocket-launches/backend/data/launches-$(date +%Y%m%d).db

# Automated backup cron (2 AM UTC)
0 2 * * * cp /var/www/rocket-launches/backend/data/launches.db /var/www/rocket-launches/backend/data/launches-$(date +\%Y\%m\%d).db
```

### Performance Monitoring

```bash
# PM2 monitoring
pm2 monit

# System resources
htop

# Nginx connections
sudo nginx -t && sudo nginx -s reload
```

## 🔒 Security Best Practices

1. **Keep System Updated**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Monitor Failed Login Attempts**
   ```bash
   sudo tail -f /var/log/auth.log
   ```

3. **Review Firewall Rules**
   ```bash
   sudo ufw status verbose
   ```

4. **Use Strong Passwords**
   - For Ubuntu user
   - For SSH keys (recommended over passwords)

5. **Enable Automatic Security Updates**
   ```bash
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

6. **Protect .env File**
   ```bash
   sudo chmod 600 /var/www/rocket-launches/backend/.env
   ```

## 📞 Support

If you encounter issues not covered here:

1. Check the main project documentation: `rocket-launches-plan.md`
2. Review application logs: `pm2 logs rocket-launches-api`
3. Review Nginx logs: `/var/log/nginx/rocket-launches-error.log`
4. Review system logs: `/var/log/syslog`

## 🎯 Configuration Reference

### Environment Variables

Production `.env` file location: `/var/www/rocket-launches/backend/.env`

```bash
NODE_ENV=production
PORT=3005
DB_PATH=/var/www/rocket-launches/backend/data/launches.db
LL2_API_BASE_URL=https://ll.thespacedevs.com/2.2.0
LL2_API_KEY=your_api_key_here
SYNC_DELAY_MS=300000  # 5 minutes between API calls
SYNC_LOOKBACK_HOURS=48  # Check for updates in last 48 hours
LOG_LEVEL=info
```

### Important Paths

- Application: `/var/www/rocket-launches/`
- Backend: `/var/www/rocket-launches/backend/`
- Frontend: `/var/www/rocket-launches/frontend/dist/`
- Database: `/var/www/rocket-launches/backend/data/launches.db`
- Logs: `/var/log/rocket-launches/`
- Nginx Config: `/etc/nginx/sites-available/rocket-launches`
- SSL Certs: `/etc/letsencrypt/live/yourdomain.com/`
- Bun: `/home/ubuntu/.bun/bin/bun`

### Ports

- Backend: 3005 (internal only, not exposed to internet)
- Nginx HTTP: 80
- Nginx HTTPS: 443
- SSH: 22

## 📝 Notes

- **Bun Runtime:** This project uses Bun for fast performance and native SQLite support
- **PM2 + Bun:** PM2 manages the Bun process for production reliability
- **Fork Mode:** Bun doesn't support cluster mode, so we use fork mode with a single instance
- **Absolute Paths:** Production uses absolute paths to avoid PM2/cron issues
- **Daily Sync:** Runs at 4 AM UTC to catch new/updated launches
- **API Rate Limits:** With API key: 300 requests/day, without: 15/hour
