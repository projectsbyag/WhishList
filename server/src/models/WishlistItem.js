const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const WishlistItem = sequelize.define('WishlistItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  dealId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'deals',
      key: 'id',
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,  // Adds createdAt and updatedAt automatically
  tableName: 'wishlistItems',
});

module.exports = WishlistItem;
