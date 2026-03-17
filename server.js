// server.js - Main Backend Server
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ========================================
// DATABASE CONNECTION
// ========================================
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// ========================================
// MIDDLEWARE
// ========================================
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// ========================================
// DATABASE MODELS
// ========================================
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: DataTypes.STRING,
  avatar_url: DataTypes.STRING,
  is_admin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  subscription_tier: {
    type: DataTypes.ENUM('free', 'pro', 'enterprise'),
    defaultValue: 'free'
  }
}, { timestamps: true, tableName: 'users' });

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: DataTypes.INTEGER,
  title: {
    type: DataTypes.STRING,
    defaultValue: 'Untitled Design'
  },
  description: DataTypes.TEXT,
  thumbnail_url: DataTypes.STRING,
  canvas_data: DataTypes.TEXT,
  width: {
    type: DataTypes.INTEGER,
    defaultValue: 1920
  },
  height: {
    type: DataTypes.INTEGER,
    defaultValue: 1080
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, { timestamps: true, tableName: 'projects' });

const Template = sequelize.define('Template', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: DataTypes.STRING,
  category: DataTypes.STRING,
  description: DataTypes.TEXT,
  thumbnail_url: DataTypes.STRING,
  canvas_data: DataTypes.TEXT,
  width: {
    type: DataTypes.INTEGER,
    defaultValue: 1920
  },
  height: {
    type: DataTypes.INTEGER,
    defaultValue: 1080
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, { timestamps: true, tableName: 'templates' });

const Background = sequelize.define('Background', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: DataTypes.STRING,
  image_url: DataTypes.STRING,
  is_color: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  color_code: DataTypes.STRING,
  category: DataTypes.STRING,
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, { timestamps: true, tableName: 'backgrounds' });

const Asset = sequelize.define('Asset', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: DataTypes.STRING,
  type: {
    type: DataTypes.ENUM('image', 'icon', 'sticker', 'school_name', 'school_logo'),
    defaultValue: 'image'
  },
  url: DataTypes.STRING,
  category: DataTypes.STRING,
  tags: DataTypes.STRING,
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, { timestamps: true, tableName: 'assets' });

const Font = sequelize.define('Font', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    unique: true
  },
  font_family: DataTypes.STRING,
  font_url: DataTypes.STRING,
  category: DataTypes.STRING,
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, { timestamps: true, tableName: 'fonts' });

// ========================================
// JWT MIDDLEWARE
// ========================================
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const adminCheck = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// ========================================
// AUTH ROUTES
// ========================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    let user = await User.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = await User.create({
      email,
      password_hash: hashedPassword,
      name
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========================================
// PROJECT ROUTES
// ========================================
app.get('/api/projects', authMiddleware, async (req, res) => {
  try {
    const projects = await Project.findAll({
      where: { user_id: req.user.id },
      order: [['updatedAt', 'DESC']],
      limit: 100
    });
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/projects', authMiddleware, async (req, res) => {
  try {
    const { title, templateId, width, height } = req.body;

    let canvasData = null;
    if (templateId) {
      const template = await Template.findByPk(templateId);
      if (template) {
        canvasData = template.canvas_data;
      }
    }

    const project = await Project.create({
      user_id: req.user.id,
      title: title || 'Untitled Design',
      canvas_data: canvasData,
      width: width || 1920,
      height: height || 1080
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const { title, canvas_data, thumbnail_url } = req.body;
    await project.update({
      title: title !== undefined ? title : project.title,
      canvas_data: canvas_data !== undefined ? canvas_data : project.canvas_data,
      thumbnail_url: thumbnail_url !== undefined ? thumbnail_url : project.thumbnail_url
    });

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    await project.destroy();
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========================================
// TEMPLATE ROUTES
// ========================================
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await Template.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/templates/:id', async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========================================
// BACKGROUND ROUTES
// ========================================
app.get('/api/backgrounds', async (req, res) => {
  try {
    const backgrounds = await Background.findAll({
      order: [['is_featured', 'DESC']]
    });
    res.json({ success: true, data: backgrounds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========================================
// ASSET ROUTES
// ========================================
app.get('/api/assets', async (req, res) => {
  try {
    const { type, category } = req.query;
    const where = {};
    if (type) where.type = type;
    if (category) where.category = category;

    const assets = await Asset.findAll({
      where,
      order: [['is_featured', 'DESC']],
      limit: 100
    });
    res.json({ success: true, data: assets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========================================
// FONT ROUTES
// ========================================
app.get('/api/fonts', async (req, res) => {
  try {
    const fonts = await Font.findAll();
    res.json({ success: true, data: fonts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========================================
// ADMIN ROUTES
// ========================================
app.get('/api/admin/dashboard', authMiddleware, adminCheck, async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalProjects = await Project.count();
    const totalTemplates = await Template.count();
    const totalAssets = await Asset.count();

    res.json({
      success: true,
      data: {
        totalUsers,
        totalProjects,
        totalTemplates,
        totalAssets
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========================================
// SOCKET.IO - Real-time Collaboration
// ========================================
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
  });

  socket.on('element-updated', (data) => {
    io.to(`project-${data.projectId}`).emit('element-updated', data);
  });

  socket.on('element-deleted', (data) => {
    io.to(`project-${data.projectId}`).emit('element-deleted', data);
  });

  socket.on('element-added', (data) => {
    io.to(`project-${data.projectId}`).emit('element-added', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ========================================
// ERROR HANDLING
// ========================================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ========================================
// SERVER START
// ========================================
const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: false }).then(() => {
  console.log('✓ Database synced');
  server.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ Socket.io ready for real-time collaboration`);
    console.log(`✓ Frontend URL: ${process.env.FRONTEND_URL}`);
  });
}).catch(err => {
  console.error('✗ Database connection failed:', err);
  process.exit(1);
});

module.exports = app;
