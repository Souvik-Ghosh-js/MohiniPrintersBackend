# 🚀 AWS EC2 Deployment Guide for Canva Backend

This guide walks you through setting up a fresh AWS EC2 instance and deploying your backend with automated GitHub CI/CD.

---

## 📋 Prerequisites

- AWS Account
- GitHub Account
- SSH key pair for EC2 access
- Domain name (optional but recommended)

---

## 🛠️ Part 1: AWS EC2 Setup (Fresh Instance)

### Step 1: Launch EC2 Instance

1. **Log into AWS Console** → EC2 Dashboard
2. Click **"Launch Instance"**
3. **Configure Instance:**
   - **Name:** `canva-backend-prod`
   - **AMI:** Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance Type:** `t2.micro` (Free tier) or `t2.small` (Recommended)
   - **Key pair:** Create new or use existing `.pem` file
   - **Network Settings:**
     - ✅ Allow SSH (port 22) - Your IP only
     - ✅ Allow HTTP (port 80) - Anywhere
     - ✅ Allow HTTPS (port 443) - Anywhere
     - ✅ Custom TCP (port 3000) - Anywhere (Backend API)
     - ✅ Custom TCP (port 3001) - Anywhere (Frontend if hosted)
4. **Storage:** 20 GB gp3 (minimum)
5. Click **"Launch Instance"**

### Step 2: Connect to EC2

```bash
# Change permission of your key
chmod 400 your-key.pem

# Connect to EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## 🔧 Part 2: Server Configuration

### Step 1: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Node.js 18.x

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v18.x
npm --version
```

### Step 3: Install MySQL 8.0

```bash
# Install MySQL
sudo apt install -y mysql-server

# Start MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure installation
sudo mysql_secure_installation
# Answer prompts:
# - Set root password: YES (use a strong password)
# - Remove anonymous users: YES
# - Disallow root login remotely: YES
# - Remove test database: YES
# - Reload privilege tables: YES
```

### Step 4: Create Database & User

```bash
sudo mysql -u root -p
```

Run these SQL commands:

```sql
-- Create database
CREATE DATABASE canva_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated user
CREATE USER 'canva_user'@'localhost' IDENTIFIED BY 'SecurePassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON canva_db.* TO 'canva_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
SELECT User, Host FROM mysql.user;

-- Exit
EXIT;
```

### Step 5: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
pm2 startup
# Copy and run the command PM2 outputs
```

### Step 6: Install Git

```bash
sudo apt install -y git
git --version
```

---

## 📦 Part 3: Deploy Backend Application

### Step 1: Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone your backend repo
git clone https://github.com/YOUR_USERNAME/canva-backend.git

# Enter directory
cd canva-backend
```

### Step 2: Configure Environment

```bash
# Create .env file
nano .env
```

Paste and update these values:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=canva_user
DB_PASSWORD=SecurePassword123!
DB_NAME=canva_db

# Server Configuration
PORT=3000
NODE_ENV=production
FRONTEND_URL=http://YOUR_EC2_PUBLIC_IP:3001

# JWT Secret (Generate a secure random string)
JWT_SECRET=your_secure_random_32_character_secret_key_here_change_this
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

### Step 3: Install Dependencies

```bash
npm install --production
```

### Step 4: Run Database Migration

```bash
npm run migrate
```

You should see:
```
✓ Old database dropped (canva_db)
✓ New database created: canva_db
✓ Tables: users, projects, templates, backgrounds, assets, fonts
✓ Seeded: 10 fonts, 10 backgrounds, 5 starter templates
✅ Migration complete!
```

### Step 5: Start Application with PM2

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs canva-backend

# Save PM2 configuration
pm2 save
```

### Step 6: Test API

```bash
curl http://localhost:3000/health
```

Should return: `{"status":"OK","timestamp":"..."}`

**Test from browser:**
```
http://YOUR_EC2_PUBLIC_IP:3000/health
```

---

## 🔄 Part 4: GitHub CI/CD Setup

### Step 1: Generate SSH Key for GitHub Actions

On your **EC2 instance**:

```bash
# Generate new SSH key
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github_actions_key -N ""

# Add public key to authorized_keys
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys

# Display private key (copy this for GitHub Secrets)
cat ~/.ssh/github_actions_key
```

**Copy the ENTIRE private key output** (including `-----BEGIN` and `-----END` lines)

### Step 2: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** and add these three secrets:

| Secret Name | Value |
|------------|-------|
| `EC2_HOST` | Your EC2 Public IP (e.g., `54.123.45.67`) |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Paste the private key from previous step |

### Step 3: Test CI/CD

1. Make a small change to your code
2. Commit and push to `main` branch:

```bash
git add .
git commit -m "Test CI/CD deployment"
git push origin main
```

3. Go to **GitHub** → **Actions** tab
4. Watch the deployment workflow run
5. Check if deployment succeeded

---

## 🔐 Part 5: Security Hardening (Recommended)

### 1. Configure Firewall (UFW)

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # Backend API
sudo ufw allow 3001/tcp    # Frontend (if needed)
sudo ufw enable
sudo ufw status
```

### 2. Setup Nginx Reverse Proxy (Optional but Recommended)

```bash
# Install Nginx
sudo apt install -y nginx

# Create configuration
sudo nano /etc/nginx/sites-available/canva-backend
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support for Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/canva-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Setup SSL with Let's Encrypt (If you have a domain)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo systemctl restart nginx
```

---

## 📊 Part 6: Monitoring & Maintenance

### Check Application Status

```bash
pm2 status
pm2 logs canva-backend --lines 100
pm2 monit  # Real-time monitoring
```

### Check Database

```bash
mysql -u canva_user -p canva_db -e "SHOW TABLES;"
```

### View System Resources

```bash
htop  # Install with: sudo apt install htop
df -h  # Disk usage
free -h  # Memory usage
```

### Restart Application

```bash
pm2 restart canva-backend
```

### View Nginx Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔄 Update Application

When you push code to GitHub, it automatically deploys. To manually update:

```bash
cd ~/canva-backend
git pull origin main
npm install --production
pm2 restart canva-backend
```

---

## 🆘 Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs canva-backend --lines 50

# Check if port is in use
sudo lsof -i :3000

# Restart PM2
pm2 delete canva-backend
pm2 start ecosystem.config.js
```

### Database connection issues

```bash
# Test MySQL connection
mysql -u canva_user -p -e "SELECT 1;"

# Check MySQL status
sudo systemctl status mysql

# Restart MySQL
sudo systemctl restart mysql
```

### GitHub Actions failing

1. Check **Actions** tab for error messages
2. Verify GitHub Secrets are correct
3. Ensure EC2 security group allows SSH from GitHub IPs
4. Test SSH connection manually:
   ```bash
   ssh -i github_actions_key ubuntu@YOUR_EC2_IP
   ```

---

## 🎯 Quick Reference Commands

```bash
# Application
pm2 start ecosystem.config.js
pm2 restart canva-backend
pm2 stop canva-backend
pm2 logs canva-backend
pm2 monit

# Database
mysql -u canva_user -p canva_db
npm run migrate

# System
sudo systemctl status mysql
sudo systemctl restart nginx
sudo ufw status
htop

# Updates
cd ~/canva-backend && git pull && npm install && pm2 restart canva-backend
```

---

## 📝 Environment URLs

After deployment, your backend will be available at:

- **Direct API:** `http://YOUR_EC2_IP:3000`
- **With Nginx:** `http://YOUR_EC2_IP` or `https://your-domain.com`
- **Health Check:** `http://YOUR_EC2_IP:3000/health`

---

## ✅ Deployment Checklist

- [ ] EC2 instance launched and accessible
- [ ] Node.js 18.x installed
- [ ] MySQL 8.0 installed and secured
- [ ] Database and user created
- [ ] PM2 installed and configured
- [ ] Repository cloned
- [ ] .env file configured
- [ ] Dependencies installed
- [ ] Database migrated
- [ ] Application started with PM2
- [ ] Health check passing
- [ ] GitHub secrets configured
- [ ] CI/CD pipeline tested
- [ ] Firewall configured
- [ ] Nginx configured (optional)
- [ ] SSL certificate installed (optional)

---

## 🎉 Success!

Your backend is now deployed and auto-updates via GitHub Actions. Every push to `main` branch triggers automatic deployment to your EC2 instance.

**Need help?** Check logs with `pm2 logs canva-backend`
