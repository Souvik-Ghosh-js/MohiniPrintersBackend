// migrate.js - Database Migration Script
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const DB_SCHEMA = `
-- Drop existing database if needed
-- DROP DATABASE IF EXISTS canva_db;

-- Create database
CREATE DATABASE IF NOT EXISTS canva_db;
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

-- Assets table (Images, Icons, Stickers)
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

-- Insert default fonts
INSERT IGNORE INTO fonts (name, font_family, category, is_default) VALUES
('Arial', 'Arial, sans-serif', 'sans-serif', TRUE),
('Helvetica', 'Helvetica, sans-serif', 'sans-serif', TRUE),
('Times New Roman', 'Times New Roman, serif', 'serif', TRUE),
('Georgia', 'Georgia, serif', 'serif', TRUE),
('Courier New', 'Courier New, monospace', 'monospace', TRUE),
('Comic Sans', 'Comic Sans MS, cursive', 'cursive', FALSE),
('Verdana', 'Verdana, sans-serif', 'sans-serif', TRUE);

-- Insert default backgrounds
INSERT IGNORE INTO backgrounds (title, is_color, color_code, category, is_featured) VALUES
('White', TRUE, '#FFFFFF', 'solid', TRUE),
('Black', TRUE, '#000000', 'solid', TRUE),
('Light Gray', TRUE, '#F5F5F5', 'solid', TRUE),
('Navy Blue', TRUE, '#001F3F', 'solid', FALSE),
('Coral', TRUE, '#FF6B6B', 'solid', FALSE),
('Purple', TRUE, '#7C3AED', 'solid', FALSE),
('Green', TRUE, '#10B981', 'solid', FALSE);

-- Insert sample template
INSERT IGNORE INTO templates (title, category, description, canvas_data, width, height, is_featured)
VALUES (
  'Blank Canvas',
  'Basics',
  'Start with a blank canvas',
  '[]',
  1920,
  1080,
  TRUE
);
`;

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...');

    // Connect to MySQL without specifying database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    // Execute the schema
    await connection.query(DB_SCHEMA);

    console.log('✓ Database migration completed successfully!');
    console.log('✓ Database: canva_db');
    console.log('✓ User: ' + process.env.DB_USER);
    console.log('✓ Tables created:');
    console.log('  - users');
    console.log('  - projects');
    console.log('  - templates');
    console.log('  - backgrounds');
    console.log('  - assets');
    console.log('  - fonts');

    await connection.end();
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
