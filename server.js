// server.js - Enhanced DesignStudio Backend
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Sequelize, DataTypes, Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
// FILE STORAGE SETUP (Lightsail filesystem)
// ========================================
const UPLOAD_BASE = path.join(__dirname, 'uploads');
const ASSET_BUCKETS = ['logos', 'backgrounds', 'schools', 'templates', 'elements'];

// Auto-create upload directories
ASSET_BUCKETS.forEach(bucket => {
  const dir = path.join(UPLOAD_BASE, bucket);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer storage - saves to /uploads/:bucket/
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucket = req.params.bucket;
    if (!ASSET_BUCKETS.includes(bucket)) return cb(new Error('Invalid bucket'));
    const dir = path.join(UPLOAD_BASE, bucket);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const displayName = (req.body.displayName || '').trim();
    const category    = (req.body.category    || '').trim();
    const description = (req.body.description || '').trim();
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitize = s => s.toLowerCase()
      .replace(/[^a-z0-9\u0080-\uFFFF]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    let baseName;
    if (req.params.bucket === 'templates' && displayName && category) {
      const desc = description ? '_' + sanitize(description).substring(0, 40) : '';
      baseName = `${sanitize(category)}_${sanitize(displayName)}${desc}${ext}`;
    } else {
      baseName = displayName
        ? sanitize(displayName) + ext
        : sanitize(path.basename(file.originalname, ext)) + '_' + Date.now() + ext;
    }

    // Prevent overwrite
    const fullPath = path.join(UPLOAD_BASE, req.params.bucket, baseName);
    if (fs.existsSync(fullPath)) {
      baseName = baseName.replace(ext, `_${Date.now()}${ext}`);
    }
    cb(null, baseName);
  }
});

const ALLOWED_TYPES = {
  logos:       ['image/jpeg','image/png','image/webp','image/svg+xml'],
  backgrounds: ['image/jpeg','image/png','image/webp'],
  schools:     ['image/jpeg','image/png','image/webp','image/svg+xml'],
  templates:   ['application/json','image/jpeg','image/png','image/webp'],
  elements:    ['image/jpeg','image/png','image/webp','image/svg+xml','image/gif'],
};

const fileFilter = (req, file, cb) => {
  const allowed = ALLOWED_TYPES[req.params.bucket] || [];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error(`${file.mimetype} not allowed in ${req.params.bucket}`), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: multerStorage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

// ========================================
// DATABASE CONNECTION
// ========================================
const sequelize = new Sequelize(
  process.env.DB_NAME || 'canva_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  }
);

// ========================================
// MIDDLEWARE
// ========================================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files publicly
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
}, express.static(UPLOAD_BASE));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);

// ========================================
// MODELS
// ========================================
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  name: DataTypes.STRING,
  avatar_url: DataTypes.STRING,
  is_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
  subscription_tier: { type: DataTypes.ENUM('free', 'pro', 'enterprise'), defaultValue: 'free' }
}, { timestamps: true, tableName: 'users' });

const Project = sequelize.define('Project', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, defaultValue: 'Untitled Design' },
  description: DataTypes.TEXT,
  thumbnail_url: DataTypes.STRING,
  canvas_data: { type: DataTypes.TEXT('long') },
  width: { type: DataTypes.INTEGER, defaultValue: 794 },
  height: { type: DataTypes.INTEGER, defaultValue: 1123 },
  is_public: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true, tableName: 'projects' });

const Template = sequelize.define('Template', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: DataTypes.STRING,
  category: DataTypes.STRING,
  description: DataTypes.TEXT,
  thumbnail_url: DataTypes.STRING,
  canvas_data: DataTypes.TEXT('long'),
  file_path: DataTypes.STRING,   // path relative to uploads/templates/
  width: { type: DataTypes.INTEGER, defaultValue: 794 },
  height: { type: DataTypes.INTEGER, defaultValue: 1123 },
  is_featured: { type: DataTypes.BOOLEAN, defaultValue: false },
  tags: DataTypes.STRING
}, { timestamps: true, tableName: 'templates' });

const Asset = sequelize.define('Asset', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: DataTypes.STRING,
  type: { type: DataTypes.ENUM('image','icon','sticker','school_name','school_logo'), defaultValue: 'image' },
  url: DataTypes.STRING,
  category: DataTypes.STRING,
  tags: DataTypes.STRING,
  is_featured: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true, tableName: 'assets' });

const Background = sequelize.define('Background', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: DataTypes.STRING,
  image_url: DataTypes.STRING,
  is_color: { type: DataTypes.BOOLEAN, defaultValue: false },
  color_code: DataTypes.STRING,
  category: DataTypes.STRING,
  is_featured: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true, tableName: 'backgrounds' });

const Font = sequelize.define('Font', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, unique: true },
  font_family: DataTypes.STRING,
  font_url: DataTypes.STRING,
  category: DataTypes.STRING,
  is_default: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true, tableName: 'fonts' });

// ========================================
// AUTH MIDDLEWARE
// ========================================
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_change_in_prod');
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const adminCheck = (req, res, next) => {
  if (!req.user?.is_admin) return res.status(403).json({ success: false, message: 'Admin access required' });
  next();
};

// Optional auth — passes through even without token
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_change_in_prod'); } catch {}
  }
  next();
};

// ========================================
// AUTH ROUTES
// ========================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ success: false, message: 'User already exists' });
    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, password_hash, name: name || email.split('@')[0] });
    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET || 'fallback_secret_change_in_prod',
      { expiresIn: '7d' }
    );
    res.status(201).json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET || 'fallback_secret_change_in_prod',
      { expiresIn: '7d' }
    );
    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password_hash'] } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================================
// PROJECT ROUTES
// ========================================
app.get('/api/projects', authMiddleware, async (req, res) => {
  try {
    const projects = await Project.findAll({
      where: { user_id: req.user.id },
      attributes: { exclude: ['canvas_data'] },
      order: [['updatedAt', 'DESC']],
      limit: 200
    });
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/projects', authMiddleware, async (req, res) => {
  try {
    const { title, templateId, width, height } = req.body;
    let canvas_data = null;
    if (templateId) {
      const tpl = await Template.findByPk(templateId);
      if (tpl) canvas_data = tpl.canvas_data;
    }
    const project = await Project.create({
      user_id: req.user.id,
      title: title || 'Untitled Design',
      canvas_data,
      width: width || 794,
      height: height || 1123
    });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project || project.user_id !== req.user.id) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project || project.user_id !== req.user.id) return res.status(404).json({ success: false, message: 'Project not found' });
    const { title, canvas_data, thumbnail_url, width, height } = req.body;
    await project.update({
      ...(title !== undefined && { title }),
      ...(canvas_data !== undefined && { canvas_data }),
      ...(thumbnail_url !== undefined && { thumbnail_url }),
      ...(width !== undefined && { width }),
      ...(height !== undefined && { height }),
    });
    res.json({ success: true, data: { id: project.id, title: project.title, updatedAt: project.updatedAt } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project || project.user_id !== req.user.id) return res.status(404).json({ success: false, message: 'Project not found' });
    await project.destroy();
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/projects/:id/duplicate', authMiddleware, async (req, res) => {
  try {
    const original = await Project.findByPk(req.params.id);
    if (!original || original.user_id !== req.user.id) return res.status(404).json({ success: false, message: 'Not found' });
    const copy = await Project.create({
      user_id: req.user.id,
      title: original.title + ' (copy)',
      canvas_data: original.canvas_data,
      width: original.width,
      height: original.height
    });
    res.status(201).json({ success: true, data: copy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================================
// FILE-BASED ASSET ROUTES (uploads on disk)
// GET    /api/assets/:bucket         — list files
// POST   /api/assets/:bucket         — upload file (admin)
// DELETE /api/assets/:bucket/:file   — delete file (admin)
// ========================================
const MIME_MAP = {
  '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.gif': 'image/gif',
};

const cap = s => s.replace(/\b\w/g, l => l.toUpperCase());

app.get('/api/assets/:bucket', (req, res) => {
  const { bucket } = req.params;
  if (!ASSET_BUCKETS.includes(bucket)) return res.status(400).json({ error: 'Invalid bucket' });

  const dir = path.join(UPLOAD_BASE, bucket);
  if (!fs.existsSync(dir)) return res.json({ files: [] });

  try {
    const host = `${req.protocol}://${req.get('host')}`;
    const names = fs.readdirSync(dir).filter(f => !f.startsWith('.'));

    const files = names.map(name => {
      const stat = fs.statSync(path.join(dir, name));
      const ext = path.extname(name).toLowerCase();
      const withoutExt = name.replace(/\.[^/.]+$/, '');
      const parts = withoutExt.split('_');

      let displayName, category, description;
      if (bucket === 'templates' && parts.length >= 2) {
        category    = cap(parts[0].replace(/-/g, ' '));
        displayName = cap(parts.slice(1, parts.length > 2 ? -1 : undefined).join(' ').replace(/-/g, ' '));
        description = parts.length > 2 ? cap(parts[parts.length - 1].replace(/-/g, ' ')) : '';
      } else {
        displayName = cap(withoutExt.replace(/[_-]/g, ' '));
        category = ''; description = '';
      }

      return {
        name,
        url: `${host}/uploads/${bucket}/${encodeURIComponent(name)}`,
        displayName,
        category,
        description,
        size: stat.size,
        type: MIME_MAP[ext] || 'application/octet-stream',
        createdAt: stat.birthtime.toISOString(),
      };
    });

    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ files });
  } catch (err) {
    console.error('[assets GET]', err);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

app.post('/api/assets/:bucket', authMiddleware, adminCheck, (req, res) => {
  if (!ASSET_BUCKETS.includes(req.params.bucket))
    return res.status(400).json({ message: 'Invalid bucket' });

  upload.single('file')(req, res, err => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File too large (max 15MB)' });
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) return res.status(400).json({ message: 'No file provided' });

    const host = `${req.protocol}://${req.get('host')}`;
    const name = req.file.filename;
    const ext = path.extname(name).toLowerCase();

    res.status(201).json({
      file: {
        name,
        url: `${host}/uploads/${req.params.bucket}/${encodeURIComponent(name)}`,
        displayName: cap(req.body.displayName || name.replace(/\.[^/.]+$/, '')),
        category: cap(req.body.category || ''),
        description: req.body.description || '',
        size: req.file.size,
        type: MIME_MAP[ext] || req.file.mimetype,
        createdAt: new Date().toISOString(),
      }
    });
  });
});

app.delete('/api/assets/:bucket/:filename', authMiddleware, adminCheck, (req, res) => {
  const { bucket, filename } = req.params;
  if (!ASSET_BUCKETS.includes(bucket)) return res.status(400).json({ error: 'Invalid bucket' });

  const decoded = decodeURIComponent(filename);
  if (decoded.includes('..') || decoded.includes('/') || decoded.includes('\\'))
    return res.status(400).json({ error: 'Invalid filename' });

  const filePath = path.join(UPLOAD_BASE, bucket, decoded);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  try {
    fs.unlinkSync(filePath);
    res.json({ success: true, deleted: decoded });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// ========================================
// TEMPLATE ROUTES (file-based JSON templates)
// GET  /api/templates/files           — list .json templates from disk
// POST /api/templates/files/upload    — admin upload JSON template to disk
// ========================================
app.get('/api/templates/files', (req, res) => {
  const dir = path.join(UPLOAD_BASE, 'templates');
  if (!fs.existsSync(dir)) return res.json({ files: [] });

  const host = `${req.protocol}://${req.get('host')}`;
  const names = fs.readdirSync(dir).filter(f => !f.startsWith('.'));

  const files = names.map(name => {
    const stat = fs.statSync(path.join(dir, name));
    const ext = path.extname(name).toLowerCase();
    const withoutExt = name.replace(/\.[^/.]+$/, '');
    const parts = withoutExt.split('_');

    const category    = parts.length >= 2 ? cap(parts[0].replace(/-/g,' ')) : 'Other';
    const displayName = parts.length >= 2 ? cap(parts.slice(1).join(' ').replace(/-/g,' ')) : cap(withoutExt.replace(/[_-]/g,' '));

    return {
      name,
      url: `${host}/uploads/templates/${encodeURIComponent(name)}`,
      displayName,
      category,
      size: stat.size,
      type: MIME_MAP[ext] || 'application/octet-stream',
      createdAt: stat.birthtime.toISOString(),
    };
  });

  files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ files });
});

// ========================================
// OLD DB TEMPLATE ROUTES (kept for backward compat)
// ========================================
app.get('/api/templates', async (req, res) => {
  try {
    const { category, featured } = req.query;
    const where = {};
    if (category) where.category = category;
    if (featured === 'true') where.is_featured = true;
    const templates = await Template.findAll({ where, attributes: { exclude: ['canvas_data'] }, order: [['is_featured', 'DESC'], ['createdAt', 'DESC']] });
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/templates/:id', async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/templates', authMiddleware, adminCheck, async (req, res) => {
  try {
    const template = await Template.create(req.body);
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/templates/:id', authMiddleware, adminCheck, async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Not found' });
    await template.update(req.body);
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/templates/:id', authMiddleware, adminCheck, async (req, res) => {
  try {
    await Template.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================================
// BACKGROUND / ASSET / FONT ROUTES (DB)
// ========================================
app.get('/api/backgrounds', async (req, res) => {
  try {
    const { category } = req.query;
    const where = {};
    if (category) where.category = category;
    const backgrounds = await Background.findAll({ where, order: [['is_featured', 'DESC']] });
    res.json({ success: true, data: backgrounds });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/assets', async (req, res) => {
  try {
    const { type, category, search } = req.query;
    const where = {};
    if (type) where.type = type;
    if (category) where.category = category;
    if (search) where.name = { [Op.like]: `%${search}%` };
    const assets = await Asset.findAll({ where, order: [['is_featured', 'DESC']], limit: 200 });
    res.json({ success: true, data: assets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/assets', authMiddleware, adminCheck, async (req, res) => {
  try {
    const asset = await Asset.create(req.body);
    res.status(201).json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/fonts', async (req, res) => {
  try {
    const fonts = await Font.findAll({ order: [['is_default', 'DESC'], ['name', 'ASC']] });
    res.json({ success: true, data: fonts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================================
// ADMIN ROUTES
// ========================================
app.get('/api/admin/dashboard', authMiddleware, adminCheck, async (req, res) => {
  try {
    // Count files on disk too
    const countFiles = bucket => {
      const dir = path.join(UPLOAD_BASE, bucket);
      return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => !f.startsWith('.')).length : 0;
    };

    const [totalUsers, totalProjects, recentUsers] = await Promise.all([
      User.count(),
      Project.count(),
      User.findAll({ limit: 5, order: [['createdAt', 'DESC']], attributes: ['id', 'name', 'email', 'createdAt'] })
    ]);

    const totalTemplates = countFiles('templates');
    const totalAssets = ASSET_BUCKETS.reduce((sum, b) => sum + countFiles(b), 0);

    res.json({ success: true, data: { totalUsers, totalProjects, totalTemplates, totalAssets, recentUsers } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/users', authMiddleware, adminCheck, async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password_hash'] }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, adminCheck, async (req, res) => {
  try {
    if (req.params.id == req.user.id) return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    await User.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================================
// SOCKET.IO
// ========================================
const activeRooms = new Map();

io.on('connection', (socket) => {
  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
    if (!activeRooms.has(projectId)) activeRooms.set(projectId, new Set());
    activeRooms.get(projectId).add(socket.id);
    io.to(`project-${projectId}`).emit('collaborators-update', { count: activeRooms.get(projectId).size });
  });
  socket.on('element-updated', data => socket.to(`project-${data.projectId}`).emit('element-updated', data));
  socket.on('element-deleted', data => socket.to(`project-${data.projectId}`).emit('element-deleted', data));
  socket.on('element-added',   data => socket.to(`project-${data.projectId}`).emit('element-added', data));
  socket.on('background-updated', data => socket.to(`project-${data.projectId}`).emit('background-updated', data));
  socket.on('cursor-move', data => socket.to(`project-${data.projectId}`).emit('cursor-move', { ...data, socketId: socket.id }));
  socket.on('disconnect', () => {
    activeRooms.forEach((members, projectId) => {
      if (members.has(socket.id)) {
        members.delete(socket.id);
        io.to(`project-${projectId}`).emit('collaborators-update', { count: members.size });
        if (members.size === 0) activeRooms.delete(projectId);
      }
    });
  });
});

// ========================================
// HEALTH & ERROR
// ========================================
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.use(cors({
  origin: ['http://localhost:3000', 'http://13.126.144.58' , 'https://mohiniprinters.netlify.app' , 'https://mohini.gobt.in', 'https://mohiniprintshop.org/'],
  credentials: true
}));
// ========================================
// START
// ========================================
const PORT =  3000;

sequelize.sync({ alter: process.env.NODE_ENV === 'development' }).then(() => {
  console.log('✓ Database synced');
  console.log('✓ Upload folders:', ASSET_BUCKETS.map(b => `uploads/${b}`).join(', '));
  server.listen(PORT, () => {
    console.log(`✓ Server: http://localhost:${PORT}`);
    console.log(`✓ Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
    console.log(`✓ Files served at: http://localhost:${PORT}/uploads/`);
  });
}).catch(err => {
  console.error('✗ Database error:', err.message);
  process.exit(1);
});

module.exports = app;
