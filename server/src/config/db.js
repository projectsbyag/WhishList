const { Sequelize } = require('sequelize');
const path = require('path');

// Create SQLite database instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../wishlist.db'),  // Database file location
  logging: false,  // Disable SQL logging (set to console.log to debug)
});

const connectDB = async () => {
  try {
    console.log('Connecting to SQLite database...');
    await sequelize.authenticate();
    console.log('✅ SQLite database connected successfully');
    
    // Load models
    require('../models/index');
    
    // Sync models with database (creates tables if they don't exist)
    await sequelize.sync({ alter: false });
    console.log('✅ Database tables synced');
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    throw err;
  }
};

module.exports = { sequelize, connectDB };
