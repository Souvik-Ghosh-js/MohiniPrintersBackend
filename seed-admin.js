/**
 * Standalone migration: seed admin user
 * Run: node seed-admin.js
 */
require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  const connection = await mysql.createConnection({
    host    : process.env.DB_HOST     || 'localhost',
    user    : process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'canva_db',
  });

  try {
    const email    = 'mohini.palash@gmail.com';
    const password = 'Designadmin@123';
    const name     = 'Mohini Admin';
    const hash     = await bcrypt.hash(password, 12);

    await connection.execute(
      `INSERT INTO users (email, password_hash, name, is_admin, createdAt, updatedAt)
       VALUES (?, ?, ?, TRUE, NOW(), NOW())
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_admin = TRUE, updatedAt = NOW()`,
      [email, hash, name]
    );

    console.log('✅ Admin user ready');
    console.log('   Email   :', email);
    console.log('   Password: Designadmin@123');
    console.log('   is_admin: true');
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedAdmin();
