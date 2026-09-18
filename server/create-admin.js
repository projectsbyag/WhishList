require('dotenv').config();
const bcrypt = require('bcryptjs');
const path = require('path');
const { sequelize, connectDB } = require('./src/config/db');
const User = require('./src/models/User');

async function createAdmin() {
  try {
    await connectDB();
    console.log('Connected to SQLite database');

    const email = 'admin@wishlist.com';
    const password = 'admin123';
    const name = 'Admin User';

    // Check if admin already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      console.log('Admin user already exists');
      // Update to admin role
      await existing.update({ role: 'admin' });
      console.log('User updated to admin role');
    } else {
      // Create new admin user
      const hash = await bcrypt.hash(password, 10);
      await User.create({
        name,
        email,
        password: hash,
        role: 'admin',
      });
      console.log('Admin user created successfully!');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createAdmin();
