const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Create SQLite database instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_STORAGE || path.join(__dirname, '../../wishlist.db'),  // Database file location
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
    await ensureVendorStoreColumns();
    await ensureDealContactLinkColumn();
    console.log('✅ Database tables synced');
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    throw err;
  }
};

// Add vendor store columns to the users table when upgrading an existing database
const ensureVendorStoreColumns = async () => {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('users');
  const columns = {
    storeName: DataTypes.STRING,
    storeDescription: DataTypes.TEXT,
    category: DataTypes.STRING,
    contactEmail: DataTypes.STRING,
    contactPhone: DataTypes.STRING,
    address: DataTypes.STRING,
    website: DataTypes.STRING,
  };

  for (const [name, type] of Object.entries(columns)) {
    if (!table[name]) {
      await qi.addColumn('users', name, { type, allowNull: true });
      console.log(`➕ Added column users.${name}`);
    }
  }
};

const ensureDealContactLinkColumn = async () => {
  const qi = sequelize.getQueryInterface();
  const columns = await qi.describeTable('deals');

  if (!columns.contactLink) {
    await qi.addColumn('deals', 'contactLink', { type: DataTypes.STRING, allowNull: true });
    console.log('➕ Added column deals.contactLink');
  }
};

module.exports = { sequelize, connectDB };
