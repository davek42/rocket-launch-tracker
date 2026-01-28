# 🔧 Operations Guide - Rocket Launch Tracker

**Production URL:** http://16.148.114.211/
**Server:** AWS Lightsail Ubuntu 24.04 LTS
**Last Updated:** January 27, 2026

---

## 📋 Table of Contents

- [Quick Health Checks](#-quick-health-checks)
- [Automated Health Check Script](#-automated-health-check-script)
- [What to Look For](#-what-to-look-for)
- [Common Issues & Fixes](#-common-issues--fixes)
- [Monitoring Commands](#-monitoring-commands)
- [Daily Sync Management](#-daily-sync-management)
- [Update Procedures](#-update-procedures)
- [Backup Procedures](#-backup-procedures)
- [Emergency Recovery](#-emergency-recovery)
- [System Information](#-system-information)

---

## 🏥 Quick Health Checks

### Daily Check (< 1 minute)

```bash
# Connect to server
ssh -i ~/.ssh/LightsailDefaultKey-us-west-2.pem ubuntu@16.148.114.211

# Check PM2 status
pm2 status

# Check backend health
curl http://localhost:3005/health

# Check last sync
tail -20 /var/log/rocket-launches/sync.log
```

### Weekly Check (2-3 minutes)

```bash
# 1. PM2 Status - Is the backend running?
pm2 status

# 2. Backend Health Endpoint - Is the API responding?
curl http://localhost:3005/health

# 3. Nginx Status - Is the web server running?
sudo systemctl status nginx --no-pager

# 4. Check Recent Backend Logs - Any errors?
pm2 logs rocket-launches-api --lines 20 --nostream

# 5. Check Last Sync - Did daily sync run successfully?
tail -20 /var/log/rocket-launches/sync.log

# 6. Disk Space - Running out of space?
df -h | grep -E "Filesystem|/$"

# 7. Memory Usage - Is swap being used heavily?
free -h

# 8. Check cron job is active
crontab -l | grep daily-sync
```

---

## 🤖 Automated Health Check Script

Create a comprehensive health check script on the server:

```bash
# Create the script
cat > ~/check-health.sh << 'EOF'
#!/bin/bash

echo "=================================="
echo "🚀 Rocket Launch Tracker Health Check"
echo "=================================="
echo ""

echo "1️⃣  PM2 Status:"
pm2 status | tail -4
echo ""

echo "2️⃣  Backend Health:"
curl -s http://localhost:3005/health | jq '.' 2>/dev/null || curl -s http://localhost:3005/health || echo "❌ Backend not responding"
echo ""

echo "3️⃣  Nginx Status:"
sudo systemctl is-active nginx && echo "✅ Nginx is running" || echo "❌ Nginx is down"
echo ""

echo "4️⃣  Last Sync (last 5 lines):"
if [ -f /var/log/rocket-launches/sync.log ]; then
    tail -5 /var/log/rocket-launches/sync.log
else
    echo "⚠️  No sync log yet"
fi
echo ""

echo "5️⃣  Disk Space:"
df -h / | grep -v Filesystem
echo ""

echo "6️⃣  Memory:"
free -h | grep -E "Mem|Swap"
echo ""

echo "7️⃣  Cron Job:"
crontab -l | grep daily-sync && echo "✅ Cron job configured" || echo "⚠️  No cron job found"
echo ""

echo "8️⃣  Recent Backend Errors (if any):"
pm2 logs rocket-launches-api --lines 50 --nostream --err 2>/dev/null | tail -10 || echo "No recent errors"
echo ""

echo "=================================="
echo "✅ Health check complete!"
echo "=================================="
EOF

# Make it executable
chmod +x ~/check-health.sh
```

### Run the Health Check

```bash
~/check-health.sh
```

---

## ✅ What to Look For

### Healthy System Indicators

- **PM2 Status:** Shows "online" with uptime (not frequent restarts)
- **Backend Health:** Returns `{"status":"ok","timestamp":"...","environment":"production"}`
- **Nginx:** Shows "active (running)" in green
- **Last Sync:** Shows successful sync with summary stats
  ```
  ✅ Daily sync complete!
  - Launches checked: XX
  - New launches: X
  - Updated launches: X
  ```
- **Disk Space:** < 80% used on `/`
- **Memory:**
  - Available memory > 200MB
  - Swap usage < 50% (occasional use is fine)
- **Cron Job:** Daily sync entry present in crontab

### ⚠️ Warning Signs

- **PM2:**
  - Status shows "errored" or "stopped"
  - Restart count is very high (>10 in short period)
  - Memory usage approaching 500MB limit
- **Backend Health:**
  - Returns error or times out
  - Wrong environment (shows "development" instead of "production")
- **Nginx:** Shows "inactive (dead)" or "failed"
- **Last Sync:**
  - Shows errors or API failures
  - Hasn't run in 24+ hours
  - Consistently shows 0 launches checked
- **Disk Space:** > 80% full
- **Memory:**
  - Swap constantly > 50% (memory pressure)
  - Available memory < 100MB
  - OOM (Out of Memory) errors in logs
- **Cron Job:** Missing from crontab

---

## 🚨 Common Issues & Quick Fixes

### Backend Crashed

**Symptoms:** PM2 shows "errored" or "stopped"

```bash
# Check logs for error
pm2 logs rocket-launches-api --lines 50 --err

# Restart backend
pm2 restart rocket-launches-api

# Verify it started
pm2 status
curl http://localhost:3005/health
```

### Nginx Not Serving Site

**Symptoms:** 502 Bad Gateway or default nginx page

```bash
# Check nginx status
sudo systemctl status nginx

# Check if backend is running
pm2 status
curl http://localhost:3005/health

# Test nginx config
sudo nginx -t

# Restart nginx if needed
sudo systemctl restart nginx

# Check nginx error logs
sudo tail -50 /var/log/nginx/rocket-launches-error.log
```

### Daily Sync Failed

**Symptoms:** Sync log shows errors or hasn't run

```bash
# Check sync log for errors
tail -50 /var/log/rocket-launches/sync.log

# Verify cron job exists
crontab -l | grep daily-sync

# Run sync manually to test
cd /var/www/rocket-launches/backend
/home/ubuntu/.bun/bin/bun scripts/dailySync.js

# Check API key is set
grep LL2_API_KEY /var/www/rocket-launches/backend/.env
```

**If cron job is missing:**
```bash
(crontab -l 2>/dev/null; echo "0 4 * * * cd /var/www/rocket-launches/backend && /home/ubuntu/.bun/bin/bun scripts/dailySync.js >> /var/log/rocket-launches/sync.log 2>&1") | crontab -
```

### High Memory Usage

**Symptoms:** Swap usage consistently > 50%, OOM errors

```bash
# Check what's using memory
ps aux --sort=-%mem | head -10

# Check PM2 memory usage
pm2 status

# Restart backend to clear memory
pm2 restart rocket-launches-api

# If persistent, check for memory leak in logs
pm2 logs rocket-launches-api --lines 100
```

### Disk Space Full

**Symptoms:** Disk > 80% or 90% full

```bash
# Check disk usage
df -h

# Find large files/directories
du -h /var/www/rocket-launches | sort -rh | head -10
du -h /var/log | sort -rh | head -10

# Clear PM2 logs
pm2 flush

# Clear old system logs
sudo journalctl --vacuum-time=7d

# Rotate nginx logs
sudo logrotate -f /etc/logrotate.d/nginx
```

### Database Corruption

**Symptoms:** Backend fails with database errors

```bash
# Check database integrity
cd /var/www/rocket-launches/backend
/home/ubuntu/.bun/bin/bun -e "
import { Database } from 'bun:sqlite';
const db = new Database('data/launches.db');
console.log('Integrity check:', db.query('PRAGMA integrity_check').get());
db.close();
"

# If corrupted, restore from backup (see Backup section)
```

---

## 📊 Monitoring Commands

### PM2 Management

```bash
# View status
pm2 status

# View logs (live tail)
pm2 logs rocket-launches-api

# View last 50 lines of logs
pm2 logs rocket-launches-api --lines 50 --nostream

# View only errors
pm2 logs rocket-launches-api --err --lines 50 --nostream

# Real-time monitoring dashboard
pm2 monit

# Restart application
pm2 restart rocket-launches-api

# Stop application
pm2 stop rocket-launches-api

# Start application
pm2 start rocket-launches-api

# Save PM2 process list (persist across reboots)
pm2 save
```

### Nginx Management

```bash
# Check status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Reload configuration (graceful)
sudo systemctl reload nginx

# Restart nginx (full restart)
sudo systemctl restart nginx

# View access logs
sudo tail -50 /var/log/nginx/rocket-launches-access.log

# View error logs
sudo tail -50 /var/log/nginx/rocket-launches-error.log

# Follow error logs (live)
sudo tail -f /var/log/nginx/rocket-launches-error.log
```

### System Monitoring

```bash
# Memory usage
free -h

# Disk space
df -h

# Top processes by CPU
top -bn1 | head -20

# Top processes by memory
ps aux --sort=-%mem | head -10

# Network connections
sudo netstat -tulpn | grep LISTEN

# Check uptime
uptime

# View system logs
sudo journalctl -xe --no-pager | tail -50
```

---

## 🔄 Daily Sync Management

### Check Sync Status

```bash
# View last sync result
tail -20 /var/log/rocket-launches/sync.log

# View all sync history
cat /var/log/rocket-launches/sync.log

# Check when cron runs next (4 AM UTC)
date -u  # Show current UTC time
```

### Run Sync Manually

```bash
cd /var/www/rocket-launches/backend
/home/ubuntu/.bun/bin/bun scripts/dailySync.js
```

### Verify Cron Job

```bash
# List cron jobs
crontab -l

# Should show:
# 0 4 * * * cd /var/www/rocket-launches/backend && /home/ubuntu/.bun/bin/bun scripts/dailySync.js >> /var/log/rocket-launches/sync.log 2>&1
```

### Update Cron Job

```bash
# Edit crontab
crontab -e

# Or replace entirely
crontab -r  # Remove all
(crontab -l 2>/dev/null; echo "0 4 * * * cd /var/www/rocket-launches/backend && /home/ubuntu/.bun/bin/bun scripts/dailySync.js >> /var/log/rocket-launches/sync.log 2>&1") | crontab -
```

---

## 🔄 Update Procedures

### Update Application Code

```bash
# 1. Connect to server
ssh -i ~/.ssh/LightsailDefaultKey-us-west-2.pem ubuntu@16.148.114.211

# 2. Navigate to app directory
cd /var/www/rocket-launches

# 3. Pull latest code
git pull origin main

# 4. Update backend dependencies
cd backend
/home/ubuntu/.bun/bin/bun install

# 5. Update frontend dependencies
cd ../frontend
/home/ubuntu/.bun/bin/bun install

# 6. Rebuild frontend
/home/ubuntu/.bun/bin/bun run build

# 7. Restart backend
pm2 restart rocket-launches-api

# 8. Check status
pm2 status
curl http://localhost:3005/health

# 9. Test in browser
# Visit: http://16.148.114.211/
```

### Update System Packages

```bash
# Update package list
sudo apt update

# List upgradable packages
sudo apt list --upgradable

# Upgrade all packages
sudo apt upgrade -y

# Reboot if kernel updated
sudo reboot
```

### Update Bun Runtime

```bash
# Update Bun
curl -fsSL https://bun.sh/install | bash

# Verify version
/home/ubuntu/.bun/bin/bun --version

# Restart backend
pm2 restart rocket-launches-api
```

---

## 💾 Backup Procedures

### Database Backup

```bash
# Manual backup
cp /var/www/rocket-launches/backend/data/launches.db \
   /var/www/rocket-launches/backend/data/launches-$(date +%Y%m%d).db

# Download to local machine
scp -i ~/.ssh/LightsailDefaultKey-us-west-2.pem \
    ubuntu@16.148.114.211:/var/www/rocket-launches/backend/data/launches.db \
    ~/backups/rocket-launches-$(date +%Y%m%d).db
```

### Automated Daily Backup (Optional)

```bash
# Add to crontab (runs at 2 AM UTC, before sync)
(crontab -l 2>/dev/null; echo "0 2 * * * cp /var/www/rocket-launches/backend/data/launches.db /var/www/rocket-launches/backend/data/launches-\$(date +\%Y\%m\%d).db && find /var/www/rocket-launches/backend/data/launches-*.db -mtime +7 -delete") | crontab -
```

This:
- Creates daily backup at 2 AM UTC
- Deletes backups older than 7 days

### Configuration Backup

```bash
# Backup important configs
scp -i ~/.ssh/LightsailDefaultKey-us-west-2.pem \
    ubuntu@16.148.114.211:/var/www/rocket-launches/backend/.env \
    ~/backups/rocket-launches-env-$(date +%Y%m%d)

scp -i ~/.ssh/LightsailDefaultKey-us-west-2.pem \
    ubuntu@16.148.114.211:/etc/nginx/sites-available/rocket-launches \
    ~/backups/rocket-launches-nginx-$(date +%Y%m%d).conf
```

---

## 🚑 Emergency Recovery

### Complete Backend Restart

```bash
# Stop everything
pm2 stop rocket-launches-api

# Check nothing is running on port 3005
sudo lsof -i :3005

# Start fresh
pm2 start /var/www/rocket-launches/deploy/ecosystem.config.js
pm2 save
```

### Restore Database from Backup

```bash
# Stop backend
pm2 stop rocket-launches-api

# Restore database
cp /var/www/rocket-launches/backend/data/launches-YYYYMMDD.db \
   /var/www/rocket-launches/backend/data/launches.db

# Or upload from local
scp -i ~/.ssh/LightsailDefaultKey-us-west-2.pem \
    ~/backups/rocket-launches-YYYYMMDD.db \
    ubuntu@16.148.114.211:/tmp/launches.db

sudo mv /tmp/launches.db /var/www/rocket-launches/backend/data/launches.db
sudo chown ubuntu:ubuntu /var/www/rocket-launches/backend/data/launches.db

# Start backend
pm2 start rocket-launches-api
```

### Complete Redeployment

If everything is broken, redeploy from scratch:

```bash
# 1. Backup database first!
scp -i ~/.ssh/LightsailDefaultKey-us-west-2.pem \
    ubuntu@16.148.114.211:/var/www/rocket-launches/backend/data/launches.db \
    ~/backups/emergency-backup-$(date +%Y%m%d).db

# 2. On server, stop and remove
pm2 delete rocket-launches-api
sudo rm -rf /var/www/rocket-launches

# 3. Re-run deployment
cd /var/www
git clone https://github.com/davek42/rocket-launch-tracker.git rocket-launches
cd rocket-launches
sudo ./deploy/setup.sh

# 4. Restore database
scp -i ~/.ssh/LightsailDefaultKey-us-west-2.pem \
    ~/backups/emergency-backup-YYYYMMDD.db \
    ubuntu@16.148.114.211:/tmp/launches.db

sudo mv /tmp/launches.db /var/www/rocket-launches/backend/data/launches.db
sudo chown ubuntu:ubuntu /var/www/rocket-launches/backend/data/launches.db

# 5. Restart
pm2 restart rocket-launches-api
```

---

## 📋 System Information

### Server Details

- **Provider:** AWS Lightsail
- **OS:** Ubuntu 24.04 LTS
- **IP Address:** 16.148.114.211
- **SSH Key:** `~/.ssh/LightsailDefaultKey-us-west-2.pem`
- **SSH User:** ubuntu
- **RAM:** 1GB + 2GB swap
- **Disk:** Check with `df -h`

### Application Details

- **Repository:** https://github.com/davek42/rocket-launch-tracker.git
- **Deploy Path:** `/var/www/rocket-launches/`
- **Backend Port:** 3005 (internal only)
- **Public Ports:**
  - 80 (HTTP)
  - 443 (HTTPS - ready but not configured)
  - 22 (SSH)

### Key Paths

```
/var/www/rocket-launches/                    # Application root
├── backend/
│   ├── .env                                  # Environment config (contains API key)
│   ├── data/launches.db                      # SQLite database
│   ├── src/index.js                          # Backend entry point
│   └── scripts/dailySync.js                  # Daily sync script
├── frontend/
│   └── dist/                                 # Built frontend (served by Nginx)
└── deploy/
    ├── setup.sh                              # Deployment script
    ├── ecosystem.config.js                   # PM2 config
    └── nginx.conf                            # Nginx config

/etc/nginx/sites-available/rocket-launches   # Nginx site config
/etc/nginx/sites-enabled/rocket-launches     # Symlink to above

/var/log/rocket-launches/                     # Application logs
├── pm2-out.log                               # PM2 stdout
├── pm2-error.log                             # PM2 stderr
└── sync.log                                  # Daily sync log

/home/ubuntu/.bun/bin/bun                     # Bun runtime binary
/home/ubuntu/.pm2/                            # PM2 data directory
```

### Important Commands Reference

```bash
# Connect
ssh -i ~/.ssh/LightsailDefaultKey-us-west-2.pem ubuntu@16.148.114.211

# Health check
~/check-health.sh

# PM2 status
pm2 status

# View logs
pm2 logs rocket-launches-api
tail -f /var/log/rocket-launches/sync.log

# Restart backend
pm2 restart rocket-launches-api

# Restart nginx
sudo systemctl restart nginx
```

---

## 📅 Maintenance Schedule

### Daily
- Check PM2 status: `pm2 status`
- Verify site is accessible: http://16.148.114.211/

### Weekly
- Run health check: `~/check-health.sh`
- Review sync logs for patterns
- Check disk space: `df -h`

### Monthly
- Check for system updates: `sudo apt update && sudo apt list --upgradable`
- Review and clean old logs if needed
- Verify backups are working
- Review PM2 logs for any recurring errors

### Quarterly
- Consider updating Bun runtime
- Review security advisories for dependencies
- Test disaster recovery procedure
- Update documentation if procedures changed

---

## 🆘 Emergency Contacts

- **Repository Issues:** https://github.com/davek42/rocket-launch-tracker/issues
- **API Status:** https://thespacedevs.com/llapi (Launch Library 2 API)
- **AWS Lightsail Console:** https://lightsail.aws.amazon.com/

---

## 📚 Additional Resources

- **Deployment Guide:** `deploy/README.md`
- **DevLogs:** `/Users/davidk/dev/docs/projects/web-rocket-launch/rocket-launch-DevLogs/`
  - `2026-01-26 - Deployment.md` (Planning)
  - `2026-01-27 - Deployment Success.md` (Deployment results)
- **Project Plan:** `rocket-launches-plan.md`

---

**Last Updated:** January 27, 2026
**Maintained By:** David K
**Version:** 1.0
