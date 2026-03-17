// migrate.js - Database Migration Script
const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_SCHEMA = `
-- ============================================================
-- DROP old database completely and recreate fresh
-- ============================================================
DROP DATABASE IF EXISTS canva_db;
CREATE DATABASE canva_db;
USE canva_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  is_admin BOOLEAN DEFAULT FALSE,
  subscription_tier ENUM('free', 'pro', 'enterprise') DEFAULT 'free',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_email (email)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled Design',
  description TEXT,
  thumbnail_url VARCHAR(500),
  canvas_data LONGTEXT,
  width INT DEFAULT 1920,
  height INT DEFAULT 1080,
  is_public BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_user_id (user_id),
  KEY idx_updated_at (updatedAt)
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  thumbnail_url VARCHAR(500),
  canvas_data LONGTEXT,
  width INT DEFAULT 1920,
  height INT DEFAULT 1080,
  is_featured BOOLEAN DEFAULT FALSE,
  tags VARCHAR(500),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_category (category),
  KEY idx_featured (is_featured)
);

-- Backgrounds table
CREATE TABLE IF NOT EXISTS backgrounds (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  image_url VARCHAR(500),
  is_color BOOLEAN DEFAULT FALSE,
  color_code VARCHAR(7),
  category VARCHAR(100),
  is_featured BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_category (category),
  KEY idx_featured (is_featured)
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  type ENUM('image', 'icon', 'sticker', 'school_name', 'school_logo') NOT NULL DEFAULT 'image',
  url VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  tags VARCHAR(500),
  is_featured BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_type (type),
  KEY idx_category (category),
  KEY idx_featured (is_featured)
);

-- Fonts table
CREATE TABLE IF NOT EXISTS fonts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  font_family VARCHAR(150),
  font_url VARCHAR(500),
  category VARCHAR(50),
  is_default BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Seed: Fonts
-- ============================================================
INSERT INTO fonts (name, font_family, category, is_default) VALUES
('Arial', 'Arial, sans-serif', 'sans-serif', TRUE),
('Helvetica', 'Helvetica, sans-serif', 'sans-serif', TRUE),
('Times New Roman', "'Times New Roman', serif", 'serif', TRUE),
('Georgia', 'Georgia, serif', 'serif', TRUE),
('Courier New', "'Courier New', monospace", 'monospace', TRUE),
('Verdana', 'Verdana, sans-serif', 'sans-serif', TRUE),
('Trebuchet MS', "'Trebuchet MS', sans-serif", 'sans-serif', FALSE),
('Impact', 'Impact, fantasy', 'display', FALSE),
('Comic Sans MS', "'Comic Sans MS', cursive", 'cursive', FALSE),
('Tahoma', 'Tahoma, sans-serif', 'sans-serif', FALSE);

-- ============================================================
-- Seed: Backgrounds
-- ============================================================
INSERT INTO backgrounds (title, is_color, color_code, category, is_featured) VALUES
('White', TRUE, '#FFFFFF', 'solid', TRUE),
('Black', TRUE, '#000000', 'solid', TRUE),
('Light Gray', TRUE, '#F5F5F5', 'solid', TRUE),
('Dark Gray', TRUE, '#374151', 'solid', FALSE),
('Navy Blue', TRUE, '#001F3F', 'solid', FALSE),
('Coral', TRUE, '#FF6B6B', 'solid', FALSE),
('Purple', TRUE, '#7C3AED', 'solid', FALSE),
('Teal', TRUE, '#0D9488', 'solid', FALSE),
('Green', TRUE, '#10B981', 'solid', FALSE),
('Orange', TRUE, '#F97316', 'solid', FALSE);

-- ============================================================
-- Seed: Starter templates (with proper canvas_data JSON)
-- ============================================================
INSERT INTO templates (title, category, description, canvas_data, width, height, is_featured) VALUES
('Blank Presentation', 'Basics', 'Clean 1920x1080 canvas', '{"elements":[],"background":{"type":"solid","solid":{"color":"#ffffff","opacity":100}}}', 1920, 1080, TRUE),
('Blank Instagram Post', 'Social Media', 'Square canvas for Instagram', '{"elements":[],"background":{"type":"solid","solid":{"color":"#ffffff","opacity":100}}}', 1080, 1080, TRUE),
('Blank Instagram Story', 'Social Media', 'Vertical canvas for Stories and Reels', '{"elements":[],"background":{"type":"solid","solid":{"color":"#ffffff","opacity":100}}}', 1080, 1920, FALSE),
('Blank YouTube Thumbnail', 'Social Media', '1280x720 thumbnail canvas', '{"elements":[],"background":{"type":"solid","solid":{"color":"#1a1d2e","opacity":100}}}', 1280, 720, FALSE),
('Blank Business Card', 'Print', 'Standard business card size', '{"elements":[],"background":{"type":"solid","solid":{"color":"#ffffff","opacity":100}}}', 420, 240, FALSE);
`;

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...');
    console.log('⚠️  This will DROP and recreate canva_db entirely.\n');

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    await connection.query(DB_SCHEMA);

    console.log('✓ Old database dropped (canva_db)');
    console.log('✓ New database created: canva_db');
    console.log('✓ Tables: users, projects, templates, backgrounds, assets, fonts');
    console.log('✓ Seeded: 10 fonts, 10 backgrounds, 5 starter templates');
    console.log('\n✅ Migration complete! Run: npm start\n');

    await connection.end();
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Is MySQL running?');
    console.error('  2. Are DB_HOST / DB_USER / DB_PASSWORD correct in .env?');
    console.error('  3. Does your MySQL user have CREATE/DROP privileges?');
    process.exit(1);
  }
}

runMigration();
