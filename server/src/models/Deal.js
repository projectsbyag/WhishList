const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Deal = sequelize.define('Deal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  vendorId: {
    type: DataTypes.INTEGER,
    allowNull: true,  // Optional for demo/sample deals
    references: {
      model: 'users',
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  discount: {
    type: DataTypes.STRING,  // Can be "30%" or "30% OFF"
    allowNull: false,
  },
  originalPrice: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  discountedPrice: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: true,  // Legacy field
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dealLink: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  productLink: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  available: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  store: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,  // Legacy field
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,  // Adds createdAt and updatedAt automatically
  tableName: 'deals',
});

module.exports = Deal;
