# 🚀 Canva Backend - Setup & Installation

Complete backend for Canva clone application with MySQL database migrations included.

## 📋 Prerequisites

- **Node.js** 18+ (https://nodejs.org/)
- **MySQL** 8.0+ (https://dev.mysql.com/downloads/)
- **npm** (comes with Node.js)

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database
Edit `.env` file:
```env
DB_HOST=localhost
DB_USER=canva_user
DB_PASSWORD=your_password
DB_NAME=canva_db
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:3001
```

### 3. Create Database User (MySQL)
```bash
# Open MySQL
mysql -u root -p

# Run these commands:
CREATE USER 'canva_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON canva_db.* TO 'canva_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Run Database Migration
```bash
npm run migrate
```

You should see:
```
✓ Database migration completed successfully!
✓ Database: canva_db
✓ User: canva_user
✓ Tables created:
  - users
  - projects
  - templates
  - backgrounds
  - assets
  - fonts
```

### 5. Start Backend Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Backend will run on: **http://localhost:3000**

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register    - Register new user
POST   /api/auth/login       - Login user
```

### Projects
```
GET    /api/projects         - Get all user projects
POST   /api/projects         - Create new project
GET    /api/projects/:id     - Get project details
PUT    /api/projects/:id     - Update project
DELETE /api/projects/:id     - Delete project
```

### Templates
```
GET    /api/templates        - Get all templates
GET    /api/templates/:id    - Get template details
```

### Backgrounds
```
GET    /api/backgrounds      - Get all backgrounds
```

### Assets
```
GET    /api/assets           - Get assets by type/category
```

### Fonts
```
GET    /api/fonts            - Get all available fonts
```

### Admin
```
GET    /api/admin/dashboard  - Admin dashboard stats
```

## 📁 Project Structure

```
canva-backend/
├── server.js              # Main server & routes
├── migrate.js             # Database migration script
├── package.json           # Dependencies
├── .env                   # Environment variables
└── README.md              # This file
```

## 🔌 Real-time Features (Socket.io)

The server includes Socket.io for real-time collaboration:

```javascript
// Join project room
socket.emit('join-project', projectId);

// Element events
socket.emit('element-updated', { projectId, element });
socket.emit('element-added', { projectId, element });
socket.emit('element-deleted', { projectId, elementId });

// Listen for updates
socket.on('element-updated', (data) => {});
socket.on('element-added', (data) => {});
socket.on('element-deleted', (data) => {});
```

## 🗄️ Database Schema

### Users
- id, email, password_hash, name, avatar_url, is_admin, subscription_tier

### Projects
- id, user_id, title, description, thumbnail_url, canvas_data, width, height

### Templates
- id, title, category, description, thumbnail_url, canvas_data, is_featured

### Backgrounds
- id, title, image_url, is_color, color_code, category, is_featured

### Assets
- id, name, type, url, category, tags, is_featured

### Fonts
- id, name, font_family, font_url, category, is_default

## 🔐 Authentication

Uses JWT (JSON Web Tokens):

1. User registers or logs in
2. Server returns JWT token
3. Client includes token in Authorization header
4. Server validates token on protected routes

```
Authorization: Bearer <token>
```

Token expires in 7 days.

## 🧪 Test API

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Get All Templates
```bash
curl http://localhost:3000/api/templates
```

## 🆘 Troubleshooting

### Port 3000 Already in Use
```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>
```

### MySQL Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306

Solution:
1. Make sure MySQL is running
2. Check credentials in .env
3. Verify user exists in MySQL
```

### Migration Fails
```
Error: Access denied for user 'canva_user'

Solution:
1. Create user in MySQL first
2. Grant privileges
3. Flush privileges
```

### Dependencies Issues
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📦 Deployment

### Docker
```bash
# Build image
docker build -t canva-backend .

# Run container
docker run -p 3000:3000 --env-file .env canva-backend
```

### AWS Lightsail
1. Create Ubuntu instance
2. Install Node.js and MySQL
3. Clone repository
4. Set .env file
5. npm install
6. npm run migrate
7. npm start

### Environment Variables for Production
```env
NODE_ENV=production
JWT_SECRET=generate_a_strong_random_secret
DB_PASSWORD=generate_a_strong_password
FRONTEND_URL=https://yourdomain.com
```

## 📝 Scripts

```bash
# Development
npm run dev

# Production
npm start

# Database migration
npm run migrate
```

## 🤝 Dependencies

- **express** - Web framework
- **mysql2** - MySQL client
- **sequelize** - ORM
- **jsonwebtoken** - JWT authentication
- **bcryptjs** - Password hashing
- **socket.io** - Real-time communication
- **cors** - Cross-origin requests
- **dotenv** - Environment variables
- **helmet** - Security headers
- **morgan** - Request logging

## 💬 Support

- Check logs: `npm run dev`
- Verify .env configuration
- Ensure MySQL is running
- Test API with curl

## 📄 License

MIT License

## 🎯 Next Steps

1. **Migrate Database**: `npm run migrate`
2. **Start Server**: `npm run dev`
3. **Test Endpoints**: Use Postman or curl
4. **Connect Frontend**: Update FRONTEND_URL
5. **Deploy**: Follow deployment guide

---

**Status**: ✅ Ready to use
**Version**: 1.0.0
**Last Updated**: 2024
