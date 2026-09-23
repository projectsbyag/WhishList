const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Subscription = sequelize.define('Subscription', {
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
    index: true,
  },
  tier: {
    type: DataTypes.ENUM('basic', 'professional', 'enterprise'),
    allowNull: false,
  },
  paystackReference: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'expired'),
    defaultValue: 'active',
  },
  currentPeriodStart: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  currentPeriodEnd: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  maxDeals: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'subscriptions',
});

module.exports = Subscription;