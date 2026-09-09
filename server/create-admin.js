require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wishlist-app';

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'admin@wishlist.com';
    const password = 'admin123'; // Change this!
    const name = 'Admin User';

    // Check if admin already exists
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('Admin user already exists');
      // Update to admin role without invoking mongoose save middlewares
      await User.updateOne({ _id: existing._id }, { $set: { role: 'admin' } });
      console.log('User updated to admin role');
    } else {
      // Create new admin user without invoking mongoose save middlewares
      const hash = await bcrypt.hash(password, 10);
      // Use the native collection insert to avoid pre-save hooks in the model
      await User.collection.insertOne({
        name,
        email,
        password: hash,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Admin user created successfully!');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createAdmin();
