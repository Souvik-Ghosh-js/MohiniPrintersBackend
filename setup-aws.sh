#!/bin/bash

# ============================================================
# Canva Backend - AWS EC2 Automated Setup Script
# ============================================================
# Run this script on a fresh Ubuntu 22.04 EC2 instance
# Usage: bash setup-aws.sh
# ============================================================

set -e  # Exit on error

echo "🚀 Starting Canva Backend Setup..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${YELLOW}ℹ${NC} $1"; }

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   print_error "Please do not run as root. Run as ubuntu user."
   exit 1
fi

# ============================================================
# Step 1: System Update
# ============================================================
print_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

# ============================================================
# Step 2: Install Node.js 18.x
# ============================================================
print_info "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
print_success "Node.js $(node --version) installed"
print_success "npm $(npm --version) installed"

# ============================================================
# Step 3: Install MySQL 8.0
# ============================================================
print_info "Installing MySQL 8.0..."
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
print_success "MySQL installed and started"

# ============================================================
# Step 4: Install PM2
# ============================================================
print_info "Installing PM2..."
sudo npm install -g pm2
pm2 startup | tail -n 1 | sudo bash
print_success "PM2 installed"

# ============================================================
# Step 5: Install Git
# ============================================================
print_info "Installing Git..."
sudo apt install -y git
print_success "Git $(git --version) installed"

# ============================================================
# Step 6: Configure Firewall
# ============================================================
print_info "Configuring UFW firewall..."
sudo ufw --force enable
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 3000/tcp # Backend API
sudo ufw allow 3001/tcp # Frontend
print_success "Firewall configured"

# ============================================================
# Step 7: Install Nginx (Optional)
# ============================================================
read -p "Install Nginx reverse proxy? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Installing Nginx..."
    sudo apt install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    print_success "Nginx installed"
fi

# ============================================================
# Step 8: Database Setup
# ============================================================
print_info "Database setup required..."
echo ""
echo "Please run these MySQL commands manually:"
echo "----------------------------------------"
echo "sudo mysql -u root -p"
echo ""
echo "CREATE DATABASE canva_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "CREATE USER 'canva_user'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';"
echo "GRANT ALL PRIVILEGES ON canva_db.* TO 'canva_user'@'localhost';"
echo "FLUSH PRIVILEGES;"
echo "EXIT;"
echo "----------------------------------------"
echo ""
read -p "Press Enter after completing database setup..."

# ============================================================
# Step 9: Clone Repository
# ============================================================
print_info "Repository setup..."
echo "Please clone your repository:"
echo "git clone https://github.com/YOUR_USERNAME/canva-backend.git"
echo ""
read -p "Press Enter after cloning repository..."

# Check if repository exists
if [ ! -d "canva-backend" ]; then
    print_error "canva-backend directory not found. Please clone the repository first."
    exit 1
fi

cd canva-backend

# ============================================================
# Step 10: Environment Configuration
# ============================================================
print_info "Creating .env file..."
if [ ! -f .env ]; then
    cat > .env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_USER=canva_user
DB_PASSWORD=CHANGE_THIS_PASSWORD
DB_NAME=canva_db

# Server Configuration
PORT=3000
NODE_ENV=production
FRONTEND_URL=http://localhost:3001

# JWT Secret (CHANGE THIS!)
JWT_SECRET=change_this_to_a_secure_random_32_character_string_minimum
EOF
    print_success ".env file created"
    print_error "IMPORTANT: Edit .env file with your actual credentials!"
    echo "nano .env"
    read -p "Press Enter after editing .env file..."
else
    print_info ".env file already exists"
fi

# ============================================================
# Step 11: Install Dependencies
# ============================================================
print_info "Installing Node.js dependencies..."
npm install --production
print_success "Dependencies installed"

# ============================================================
# Step 12: Database Migration
# ============================================================
print_info "Running database migration..."
read -p "Run database migration now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run migrate
    print_success "Database migrated"
fi

# ============================================================
# Step 13: Start Application
# ============================================================
print_info "Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save
print_success "Application started"

# ============================================================
# Step 14: Setup GitHub Actions SSH Key
# ============================================================
print_info "Generating SSH key for GitHub Actions..."
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github_actions_key -N ""
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

echo ""
print_success "Setup complete!"
echo ""
echo "=========================================="
echo "📋 NEXT STEPS:"
echo "=========================================="
echo ""
echo "1. Test your API:"
echo "   curl http://localhost:3000/health"
echo ""
echo "2. Copy this SSH private key for GitHub Secrets:"
echo "   cat ~/.ssh/github_actions_key"
echo ""
echo "3. Add GitHub Secrets (Settings → Secrets):"
echo "   - EC2_HOST: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "   - EC2_USER: ubuntu"
echo "   - EC2_SSH_KEY: [paste private key from above]"
echo ""
echo "4. View application logs:"
echo "   pm2 logs canva-backend"
echo ""
echo "5. Check application status:"
echo "   pm2 status"
echo ""
echo "=========================================="
echo "🎉 Your backend is ready!"
echo "=========================================="
echo ""
echo "API URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
echo ""
