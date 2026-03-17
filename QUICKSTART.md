# ⚡ Quick Start Guide - 10 Minutes to Production

Get your backend running on AWS in just 10 minutes!

---

## 🎯 What You'll Need

1. AWS account
2. GitHub account  
3. 10 minutes of time

---

## 🚀 Step 1: Launch EC2 (2 minutes)

1. Go to **AWS Console** → **EC2**
2. Click **"Launch Instance"**
3. Choose:
   - **Name:** `canva-backend`
   - **AMI:** Ubuntu 22.04 LTS
   - **Instance:** t2.micro (free tier) or t2.small
   - **Key pair:** Create new, download `.pem` file
4. **Security Group** - Add these ports:
   - SSH (22)
   - HTTP (80) 
   - Custom TCP (3000)
5. **Launch!**

Note your **Public IP:** `_____________`

---

## 🔌 Step 2: Connect to EC2 (1 minute)

```bash
# Make key usable
chmod 400 your-key.pem

# Connect
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

You're now in your server! 🎉

---

## 🛠️ Step 3: Run Auto-Setup Script (5 minutes)

Copy and paste this ONE command:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/canva-backend/main/setup-aws.sh | bash
```

OR manually:

```bash
# Clone this repo
git clone https://github.com/YOUR_USERNAME/canva-backend.git
cd canva-backend

# Run setup
bash setup-aws.sh
```

The script will:
- ✅ Update system
- ✅ Install Node.js, MySQL, PM2
- ✅ Configure firewall
- ✅ Guide you through database setup

**Follow the prompts!** The script tells you exactly what to do.

---

## 🗄️ Step 4: Database Quick Setup (1 minute)

When prompted by the script, run:

```bash
sudo mysql -u root -p
```

Press Enter (no password yet), then:

```sql
CREATE DATABASE canva_db;
CREATE USER 'canva_user'@'localhost' IDENTIFIED BY 'YourPassword123!';
GRANT ALL PRIVILEGES ON canva_db.* TO 'canva_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

✅ Done!

---

## ⚙️ Step 5: Configure Environment (30 seconds)

Still in the `canva-backend` directory:

```bash
nano .env
```

Update these 3 things:
1. `DB_PASSWORD=YourPassword123!` (from Step 4)
2. `FRONTEND_URL=http://YOUR_EC2_IP:3001`
3. `JWT_SECRET=make_this_a_long_random_string_32_chars_minimum`

Save: `Ctrl+X`, `Y`, `Enter`

---

## 🚀 Step 6: Launch Application (1 minute)

```bash
# Install dependencies
npm install --production

# Setup database
npm run migrate

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

---

## ✅ Step 7: Test It! (30 seconds)

```bash
# Test locally
curl http://localhost:3000/health

# Get your server's IP
curl http://169.254.169.254/latest/meta-data/public-ipv4
```

Visit in browser: `http://YOUR_EC2_IP:3000/health`

Should see: `{"status":"OK","timestamp":"..."}`

🎉 **Your API is live!**

---

## 🔄 Step 8: Setup Auto-Deploy (1 minute)

### Get SSH Key for GitHub

```bash
cat ~/.ssh/github_actions_key
```

Copy the **entire output** (including BEGIN/END lines).

### Add to GitHub

1. Go to your repo on GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Add 3 secrets:

| Name | Value |
|------|-------|
| `EC2_HOST` | Your EC2 IP |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Paste the key from above |

### Test It

```bash
# Make a change
echo "# Test" >> README.md
git add .
git commit -m "Test auto-deploy"
git push
```

Check **GitHub → Actions** tab. Should deploy automatically! ✅

---

## 🎯 Your Backend URLs

- **API Base:** `http://YOUR_EC2_IP:3000`
- **Health Check:** `http://YOUR_EC2_IP:3000/health`
- **Templates:** `http://YOUR_EC2_IP:3000/api/templates`
- **Fonts:** `http://YOUR_EC2_IP:3000/api/fonts`

---

## 💡 Useful Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs canva-backend

# Restart app
pm2 restart canva-backend

# Test database
mysql -u canva_user -p canva_db -e "SHOW TABLES;"
```

---

## 🆘 Something Wrong?

### App won't start?
```bash
pm2 logs canva-backend --lines 50
```

### Database issues?
```bash
mysql -u canva_user -p
# Try connecting with your password
```

### Port blocked?
```bash
sudo ufw status
sudo ufw allow 3000/tcp
```

**Full troubleshooting:** See `TROUBLESHOOTING.md`

---

## 🎉 Success!

You now have:
- ✅ Backend running on AWS
- ✅ MySQL database configured
- ✅ Auto-deploy from GitHub
- ✅ PM2 process management
- ✅ Production-ready API

---

## 🔜 Next Steps

1. **Connect Your Frontend**
   ```javascript
   const API_URL = 'http://YOUR_EC2_IP:3000';
   ```

2. **Optional: Setup Nginx** (for custom domain)
   ```bash
   sudo apt install nginx
   # See AWS_DEPLOYMENT_GUIDE.md for config
   ```

3. **Optional: Add SSL** (if you have domain)
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

4. **Monitor:** Check `pm2 monit` regularly

---

## 📚 Full Documentation

- **Complete AWS Setup:** `AWS_DEPLOYMENT_GUIDE.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`
- **Deployment Checklist:** `DEPLOYMENT_CHECKLIST.md`
- **API Documentation:** `README.md`

---

**Total Time:** ~10 minutes  
**Cost:** $0 - $10/month (t2.micro is free tier)  
**Difficulty:** Easy ⭐

**Questions?** Check the troubleshooting guide or create an issue!

---

**Pro Tip:** Star ⭐ this repo for future reference!
