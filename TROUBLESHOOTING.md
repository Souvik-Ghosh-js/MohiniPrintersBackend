# 🔧 Troubleshooting Guide

Common issues and solutions for Canva Backend deployment.

---

## 🚨 Common Issues

### 1. **Error: Unrecognized datatype for attribute "Project.canvas_data"**

**Problem:** Sequelize doesn't recognize `LONGTEXT` datatype.

**Solution:** Already fixed in the provided code. Use `DataTypes.TEXT('long')` instead of `DataTypes.LONGTEXT`.

```javascript
// ✗ Wrong
canvas_data: DataTypes.LONGTEXT

// ✓ Correct
canvas_data: DataTypes.TEXT('long')
```

---

### 2. **Cannot connect to MySQL**

**Symptoms:**
```
SequelizeConnectionError: Access denied for user 'root'@'localhost'
```

**Solutions:**

**A. Check MySQL is running:**
```bash
sudo systemctl status mysql
sudo systemctl start mysql
```

**B. Verify credentials in .env:**
```bash
cat .env
# Make sure DB_USER and DB_PASSWORD match MySQL user
```

**C. Test MySQL connection:**
```bash
mysql -u canva_user -p
# Enter password when prompted
```

**D. Reset MySQL user password:**
```bash
sudo mysql -u root -p
```
```sql
ALTER USER 'canva_user'@'localhost' IDENTIFIED BY 'NewPassword123!';
FLUSH PRIVILEGES;
EXIT;
```

Update `.env` with new password.

---

### 3. **Port 3000 already in use**

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

**A. Find and kill process:**
```bash
sudo lsof -i :3000
# Note the PID, then:
kill -9 PID
```

**B. Use different port:**
Edit `.env`:
```
PORT=3001
```

**C. Restart PM2:**
```bash
pm2 delete canva-backend
pm2 start ecosystem.config.js
```

---

### 4. **Database migration fails**

**Symptoms:**
```
✗ Migration failed: Access denied for user
```

**Solutions:**

**A. Check database exists:**
```bash
mysql -u root -p -e "SHOW DATABASES;"
```

**B. Create database manually:**
```bash
sudo mysql -u root -p
```
```sql
CREATE DATABASE canva_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**C. Grant proper privileges:**
```sql
GRANT ALL PRIVILEGES ON canva_db.* TO 'canva_user'@'localhost';
FLUSH PRIVILEGES;
```

**D. Run migration again:**
```bash
npm run migrate
```

---

### 5. **PM2 application crashes**

**Symptoms:**
```
pm2 status shows: errored or stopped
```

**Solutions:**

**A. Check logs:**
```bash
pm2 logs canva-backend --lines 50
```

**B. Check .env file exists:**
```bash
ls -la .env
cat .env
```

**C. Restart with error details:**
```bash
pm2 delete canva-backend
pm2 start server.js --name canva-backend
pm2 logs canva-backend
```

**D. Run directly to see errors:**
```bash
node server.js
```

---

### 6. **GitHub Actions deployment fails**

**Symptoms:**
- Deployment workflow shows red ❌
- SSH connection timeout
- Permission denied

**Solutions:**

**A. Verify GitHub Secrets:**
1. Go to GitHub repo → Settings → Secrets
2. Check these exist:
   - `EC2_HOST` (your EC2 public IP)
   - `EC2_USER` (ubuntu)
   - `EC2_SSH_KEY` (private key content)

**B. Test SSH connection:**
```bash
# From your local machine
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

**C. Check EC2 security group:**
- Allow SSH (port 22) from GitHub Actions IPs
- Or allow from 0.0.0.0/0 (less secure)

**D. Verify SSH key on EC2:**
```bash
# On EC2 instance
cat ~/.ssh/authorized_keys
# Should contain the public key
```

**E. Check repository path:**
In GitHub Actions workflow, verify:
```yaml
cd /home/ubuntu/canva-backend  # Correct path?
```

---

### 7. **CORS errors from frontend**

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions:**

**A. Update FRONTEND_URL in .env:**
```env
FRONTEND_URL=http://your-frontend-domain.com
```

**B. Restart application:**
```bash
pm2 restart canva-backend
```

**C. For development, allow multiple origins:**
Edit `server.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://your-domain.com',
    process.env.FRONTEND_URL
  ],
  credentials: true
}));
```

---

### 8. **JWT token invalid errors**

**Symptoms:**
```json
{"success": false, "message": "Invalid token"}
```

**Solutions:**

**A. Check JWT_SECRET:**
```bash
cat .env | grep JWT_SECRET
```

**B. Ensure JWT_SECRET is at least 32 characters:**
```env
JWT_SECRET=your_secure_random_32_character_secret_key_here_change_this
```

**C. Clear browser localStorage:**
```javascript
// In browser console
localStorage.clear()
```

**D. Generate new token by logging in again**

---

### 9. **Socket.io not connecting**

**Symptoms:**
- Real-time updates not working
- WebSocket connection failed

**Solutions:**

**A. Check Socket.io URL in frontend:**
```javascript
const socket = io('http://YOUR_EC2_IP:3000');
```

**B. If using Nginx, configure WebSocket:**
```nginx
location /socket.io/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
}
```

**C. Check firewall allows WebSocket:**
```bash
sudo ufw allow 3000/tcp
```

---

### 10. **Out of memory errors**

**Symptoms:**
```
JavaScript heap out of memory
FATAL ERROR: Reached heap limit
```

**Solutions:**

**A. Increase Node.js memory:**
Edit `ecosystem.config.js`:
```javascript
node_args: '--max-old-space-size=2048'
```

**B. Upgrade EC2 instance:**
- t2.micro → t2.small or t2.medium

**C. Check memory usage:**
```bash
free -h
htop
```

**D. Restart PM2:**
```bash
pm2 restart canva-backend
```

---

### 11. **Nginx 502 Bad Gateway**

**Symptoms:**
- Frontend shows 502 error
- API not accessible through domain

**Solutions:**

**A. Check backend is running:**
```bash
pm2 status
curl http://localhost:3000/health
```

**B. Check Nginx configuration:**
```bash
sudo nginx -t
```

**C. Check Nginx error logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```

**D. Restart Nginx:**
```bash
sudo systemctl restart nginx
```

**E. Verify proxy_pass URL:**
```nginx
proxy_pass http://localhost:3000;  # Port must match
```

---

### 12. **Database connection pool exhausted**

**Symptoms:**
```
SequelizeConnectionAcquireTimeoutError
```

**Solutions:**

**A. Increase pool size:**
Edit `server.js`:
```javascript
pool: { 
  max: 20,      // Increase from 10
  min: 0, 
  acquire: 60000,  // Increase timeout
  idle: 10000 
}
```

**B. Check for connection leaks:**
Look for queries without proper error handling.

**C. Restart application:**
```bash
pm2 restart canva-backend
```

---

## 🔍 Diagnostic Commands

### Check Application Status
```bash
pm2 status
pm2 logs canva-backend --lines 100
pm2 monit
```

### Check System Resources
```bash
free -h                    # Memory usage
df -h                      # Disk usage
top                        # CPU usage
htop                       # Better process viewer
```

### Check Network
```bash
sudo netstat -tulpn | grep 3000   # Check port 3000
curl http://localhost:3000/health  # Test API locally
sudo ufw status                    # Check firewall
```

### Check Database
```bash
mysql -u canva_user -p canva_db -e "SHOW TABLES;"
mysql -u canva_user -p canva_db -e "SELECT COUNT(*) FROM users;"
```

### Check Logs
```bash
pm2 logs canva-backend
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
journalctl -u mysql -f
```

---

## 🆘 Emergency Recovery

### Complete Reset

```bash
# Stop everything
pm2 delete canva-backend

# Drop and recreate database
sudo mysql -u root -p
```
```sql
DROP DATABASE canva_db;
CREATE DATABASE canva_db;
EXIT;
```

```bash
# Reinstall dependencies
cd ~/canva-backend
rm -rf node_modules
npm install --production

# Run migration
npm run migrate

# Start fresh
pm2 start ecosystem.config.js
pm2 save
```

### Backup Database

```bash
# Backup
mysqldump -u canva_user -p canva_db > backup_$(date +%Y%m%d).sql

# Restore
mysql -u canva_user -p canva_db < backup_20240101.sql
```

---

## 📊 Performance Issues

### High CPU Usage

```bash
# Check what's consuming CPU
top
pm2 monit

# Reduce PM2 instances
pm2 scale canva-backend 1
```

### High Memory Usage

```bash
# Check memory
free -h
pm2 monit

# Restart to clear memory
pm2 restart canva-backend
```

### Slow Database Queries

```bash
# Enable MySQL slow query log
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Add:
```
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 2
```

```bash
sudo systemctl restart mysql
```

---

## 📞 Getting Help

1. **Check logs first:**
   ```bash
   pm2 logs canva-backend --lines 100
   ```

2. **Search for error message** in this guide

3. **Check GitHub Issues**

4. **Enable debug mode:**
   ```env
   NODE_ENV=development
   ```
   
5. **Create detailed issue report with:**
   - Error message
   - Steps to reproduce
   - Logs output
   - Environment details

---

## ✅ Health Checklist

Run these commands to verify everything is working:

```bash
# 1. System
uname -a
node --version
npm --version
pm2 --version

# 2. Database
mysql -u canva_user -p -e "SELECT 1;"

# 3. Application
pm2 status
curl http://localhost:3000/health

# 4. API Endpoints
curl http://localhost:3000/api/templates
curl http://localhost:3000/api/fonts

# 5. Network
sudo ufw status
sudo netstat -tulpn | grep 3000
```

All should return success! ✓

---

**Remember:** Most issues are solved by checking logs first! 

```bash
pm2 logs canva-backend
```
