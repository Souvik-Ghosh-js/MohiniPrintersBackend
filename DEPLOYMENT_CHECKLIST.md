# ✅ AWS Deployment Checklist

Complete this checklist to ensure successful deployment.

---

## 📋 Pre-Deployment

### AWS Account Setup
- [ ] AWS account created and verified
- [ ] Billing alerts configured (optional but recommended)
- [ ] IAM user created with appropriate permissions (optional)

### Local Preparation
- [ ] Git repository created on GitHub
- [ ] All code committed and pushed to main branch
- [ ] .env.example file present (don't commit actual .env!)
- [ ] README.md and documentation reviewed

---

## 🖥️ EC2 Instance Setup

### Launch Instance
- [ ] EC2 instance launched (Ubuntu 22.04 LTS)
- [ ] Instance type selected (t2.micro or better)
- [ ] Key pair downloaded (.pem file saved securely)
- [ ] Security group configured:
  - [ ] SSH (22) - Your IP
  - [ ] HTTP (80) - 0.0.0.0/0
  - [ ] HTTPS (443) - 0.0.0.0/0
  - [ ] Custom TCP (3000) - 0.0.0.0/0
  - [ ] Custom TCP (3001) - 0.0.0.0/0 (if needed)

### Connect to Instance
- [ ] Can SSH into instance successfully
- [ ] Instance public IP noted: `_________________`

---

## 🔧 Server Configuration

### System Setup
- [ ] System updated: `sudo apt update && sudo apt upgrade -y`
- [ ] Node.js 18.x installed
- [ ] npm working correctly
- [ ] MySQL 8.0 installed
- [ ] MySQL running: `sudo systemctl status mysql`
- [ ] Git installed

### Security
- [ ] MySQL root password set
- [ ] MySQL secure installation completed
- [ ] UFW firewall configured and enabled
- [ ] SSH keys configured
- [ ] PM2 installed globally

---

## 🗄️ Database Configuration

### Database Setup
- [ ] canva_db database created
- [ ] canva_user created with password
- [ ] Privileges granted to canva_user
- [ ] Can connect to database: `mysql -u canva_user -p`
- [ ] Test query successful: `SELECT 1;`

### Database Details
```
Database: canva_db
User: canva_user
Password: [Saved securely]
```

---

## 📦 Application Deployment

### Repository
- [ ] Repository cloned to: `~/canva-backend`
- [ ] In correct directory: `cd ~/canva-backend`
- [ ] Latest code pulled: `git pull origin main`

### Configuration
- [ ] .env file created
- [ ] DB_HOST set correctly (usually localhost)
- [ ] DB_USER set correctly
- [ ] DB_PASSWORD set correctly
- [ ] DB_NAME set correctly (canva_db)
- [ ] PORT set (default 3000)
- [ ] NODE_ENV set to production
- [ ] FRONTEND_URL configured
- [ ] JWT_SECRET generated (32+ characters)

### Installation
- [ ] Dependencies installed: `npm install --production`
- [ ] No npm errors
- [ ] node_modules directory created

### Database Migration
- [ ] Migration script run: `npm run migrate`
- [ ] Migration successful (no errors)
- [ ] Tables created:
  - [ ] users
  - [ ] projects
  - [ ] templates
  - [ ] backgrounds
  - [ ] assets
  - [ ] fonts
- [ ] Seed data inserted

---

## 🚀 Application Launch

### PM2 Setup
- [ ] PM2 startup configured: `pm2 startup`
- [ ] Application started: `pm2 start ecosystem.config.js`
- [ ] Application status: `pm2 status` (shows online)
- [ ] Configuration saved: `pm2 save`
- [ ] No errors in logs: `pm2 logs canva-backend`

### Testing
- [ ] Health endpoint works: `curl http://localhost:3000/health`
- [ ] Templates endpoint works: `curl http://localhost:3000/api/templates`
- [ ] External access works: `http://YOUR_EC2_IP:3000/health`
- [ ] Can create user via API
- [ ] Can login via API

---

## 🔄 CI/CD Configuration

### GitHub Repository
- [ ] Repository settings → Secrets configured:
  - [ ] EC2_HOST (EC2 public IP)
  - [ ] EC2_USER (ubuntu)
  - [ ] EC2_SSH_KEY (private key content)

### SSH Keys
- [ ] GitHub Actions SSH key generated on EC2
- [ ] Public key added to authorized_keys
- [ ] Private key copied for GitHub Secret
- [ ] Can SSH using the key

### Testing CI/CD
- [ ] Made test commit to main branch
- [ ] GitHub Actions workflow triggered
- [ ] Workflow completed successfully (green ✓)
- [ ] Changes reflected on EC2 instance
- [ ] Application restarted automatically

---

## 🔒 Security Hardening (Recommended)

### Nginx Setup (Optional)
- [ ] Nginx installed
- [ ] Reverse proxy configured
- [ ] Nginx configuration tested: `sudo nginx -t`
- [ ] Nginx restarted
- [ ] Can access via port 80

### SSL Certificate (If domain configured)
- [ ] Domain DNS configured to point to EC2 IP
- [ ] Certbot installed
- [ ] SSL certificate obtained
- [ ] HTTPS working
- [ ] Auto-renewal configured

### Additional Security
- [ ] Changed default SSH port (optional)
- [ ] Configured fail2ban (optional)
- [ ] Set up monitoring (optional)
- [ ] Configured backups (optional)

---

## 📊 Monitoring & Maintenance

### Logs
- [ ] Know how to check PM2 logs: `pm2 logs canva-backend`
- [ ] Know how to check Nginx logs (if used)
- [ ] Know how to check MySQL logs

### Monitoring
- [ ] PM2 monitoring configured: `pm2 monit`
- [ ] CloudWatch configured (optional)
- [ ] Uptime monitoring (optional)

### Backups
- [ ] Database backup strategy in place
- [ ] Know how to backup: `mysqldump -u canva_user -p canva_db > backup.sql`
- [ ] Know how to restore

---

## 🧪 Final Verification

### Functionality Tests
- [ ] User registration works
- [ ] User login works
- [ ] JWT authentication works
- [ ] Projects CRUD operations work
- [ ] Templates can be fetched
- [ ] Assets can be fetched
- [ ] Backgrounds can be fetched
- [ ] Fonts can be fetched
- [ ] Real-time collaboration works (Socket.io)

### Performance Tests
- [ ] API response times acceptable (<1s)
- [ ] Database queries fast
- [ ] No memory leaks (check after 24hrs)
- [ ] CPU usage normal

### Integration Tests
- [ ] Frontend can connect to backend
- [ ] CORS configured correctly
- [ ] WebSocket connection works
- [ ] File uploads work (if applicable)

---

## 📝 Documentation

### Internal Documentation
- [ ] EC2 IP address documented
- [ ] Database credentials saved securely
- [ ] API endpoints documented
- [ ] Deployment process documented

### Team Knowledge
- [ ] Team knows how to access logs
- [ ] Team knows how to restart application
- [ ] Team knows how to deploy updates
- [ ] Emergency contacts established

---

## 🎯 Post-Deployment

### Day 1
- [ ] Monitor application for errors
- [ ] Check logs regularly
- [ ] Verify all features working
- [ ] Test under load (if possible)

### Week 1
- [ ] No memory leaks detected
- [ ] No unexpected crashes
- [ ] Performance metrics acceptable
- [ ] User feedback positive

### Month 1
- [ ] Database backup tested
- [ ] Disaster recovery plan tested
- [ ] Performance optimizations identified
- [ ] Security audit completed (optional)

---

## 🆘 Emergency Contacts

**AWS Support:** [Link to AWS Support]
**On-Call Developer:** [Name/Contact]
**Database Admin:** [Name/Contact]

---

## 📋 Quick Reference

### Essential Commands
```bash
# Check status
pm2 status
pm2 logs canva-backend

# Restart application
pm2 restart canva-backend

# Check health
curl http://localhost:3000/health

# Database access
mysql -u canva_user -p canva_db

# View system resources
htop
free -h
df -h
```

### Important Files
- Application: `~/canva-backend/`
- Environment: `~/canva-backend/.env`
- PM2 Config: `~/canva-backend/ecosystem.config.js`
- Logs: `~/.pm2/logs/`

### Important URLs
- API: `http://YOUR_EC2_IP:3000`
- Health: `http://YOUR_EC2_IP:3000/health`
- Frontend: `http://YOUR_EC2_IP:3001` (if applicable)

---

## ✅ Sign-Off

- [ ] All checklist items completed
- [ ] Application running smoothly
- [ ] CI/CD working
- [ ] Team trained
- [ ] Documentation complete

**Deployed by:** _________________
**Date:** _________________
**EC2 Instance ID:** _________________
**Public IP:** _________________

---

## 🎉 Congratulations!

Your Canva backend is successfully deployed and running in production!

**Next Steps:**
1. Monitor for 24 hours
2. Set up alerts
3. Plan for scaling
4. Gather user feedback
5. Optimize performance

---

**Pro Tip:** Keep this checklist and refer to it for future deployments!
