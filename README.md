# 🎨 Canva Backend API

Production-ready backend API for design studio application with MySQL, Socket.io real-time collaboration, and JWT authentication.

## ✨ Features

- **Authentication:** JWT-based user auth with bcrypt password hashing
- **Real-time Collaboration:** Socket.io for live design updates
- **RESTful API:** Complete CRUD operations for projects, templates, assets
- **Database:** MySQL with Sequelize ORM
- **Security:** Helmet, rate limiting, CORS protection
- **Production Ready:** PM2 clustering, error handling, logging

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js 18.x or higher
- MySQL 8.0
- npm

### Installation

```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/canva-backend.git
cd canva-backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 4. Create database and seed data
npm run migrate

# 5. Start development server
npm run dev
```

Server runs at: **http://localhost:3000**

Test health endpoint: **http://localhost:3000/health**

## 📦 Production Deployment to AWS

See **[AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md)** for complete step-by-step instructions including:

- ✅ EC2 setup from scratch
- ✅ MySQL configuration
- ✅ PM2 process management
- ✅ GitHub Actions CI/CD automation
- ✅ Nginx reverse proxy
- ✅ SSL certificate setup
- ✅ Security hardening

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/duplicate` - Duplicate project

### Templates
- `GET /api/templates` - List templates
- `GET /api/templates/:id` - Get template details
- `POST /api/templates` - Create template (admin)
- `PUT /api/templates/:id` - Update template (admin)
- `DELETE /api/templates/:id` - Delete template (admin)

### Assets
- `GET /api/assets` - List assets (supports filters)
- `POST /api/assets` - Upload asset (admin)

### Backgrounds
- `GET /api/backgrounds` - List backgrounds

### Fonts
- `GET /api/fonts` - List available fonts

### Admin
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/users` - List all users
- `DELETE /api/admin/users/:id` - Delete user

## 🔌 Socket.io Events

### Client → Server
- `join-project` - Join project room
- `element-updated` - Element was modified
- `element-added` - New element added
- `element-deleted` - Element removed
- `background-updated` - Background changed
- `cursor-move` - Cursor position update

### Server → Client
- `collaborators-update` - Active user count changed
- `element-updated` - Broadcast element update
- `element-added` - Broadcast new element
- `element-deleted` - Broadcast element deletion
- `background-updated` - Broadcast background change
- `cursor-move` - Broadcast cursor position

## 🗂️ Project Structure

```
canva-backend/
├── server.js              # Main application file
├── migrate.js             # Database migration script
├── package.json           # Dependencies
├── ecosystem.config.js    # PM2 configuration
├── .env.example           # Environment template
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions CI/CD
└── AWS_DEPLOYMENT_GUIDE.md # Deployment instructions
```

## 🛠️ Scripts

```bash
npm start           # Start production server
npm run dev         # Start development server (nodemon)
npm run migrate     # Run database migration
npm test            # Run tests (placeholder)
```

## 🔐 Environment Variables

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=canva_db

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

# Security
JWT_SECRET=your_jwt_secret_min_32_chars
```

## 🔄 CI/CD with GitHub Actions

Automatic deployment to AWS EC2 on push to `main` branch.

**Setup:**
1. Add GitHub Secrets: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`
2. Push to main branch
3. GitHub Actions automatically deploys to EC2
4. PM2 restarts application with zero downtime

## 📊 Database Schema

### Users
- Authentication and profile information
- Subscription tiers (free, pro, enterprise)
- Admin permissions

### Projects
- User-created designs
- Canvas data stored as JSON
- Thumbnail URLs
- Dimensions (width/height)

### Templates
- Pre-designed templates
- Categories and tags
- Featured templates

### Assets
- Images, icons, stickers
- School names and logos
- Categorized and searchable

### Backgrounds
- Solid colors
- Image backgrounds
- Categorized library

### Fonts
- System and custom fonts
- Font family definitions
- Default fonts

## 🔒 Security Features

- **Helmet:** Security headers
- **CORS:** Cross-origin protection
- **Rate Limiting:** API request throttling
- **JWT:** Secure authentication tokens
- **Bcrypt:** Password hashing (12 rounds)
- **SQL Injection Protection:** Sequelize ORM
- **Input Validation:** Request validation

## 🐛 Debugging

### View Logs
```bash
pm2 logs canva-backend
```

### Check Database
```bash
mysql -u canva_user -p canva_db
SHOW TABLES;
```

### Test Endpoints
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/templates
```

## 📈 Performance

- **PM2 Clustering:** Multiple worker processes
- **Database Pooling:** Connection reuse
- **Rate Limiting:** Prevents abuse
- **Gzip Compression:** Reduced bandwidth (via Nginx)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues:** GitHub Issues
- **Logs:** `pm2 logs canva-backend`
- **Health:** `http://your-server/health`

## 🎯 Roadmap

- [ ] Redis caching
- [ ] S3 file uploads
- [ ] WebRTC video collaboration
- [ ] Email notifications
- [ ] Analytics dashboard
- [ ] CDN integration
- [ ] Docker support

---

Made with ❤️ for designers
