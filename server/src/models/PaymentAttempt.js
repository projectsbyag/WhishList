const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PaymentAttempt = sequelize.define('PaymentAttempt', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reference: { type: DataTypes.STRING, allowNull: false, unique: true },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  tier: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.INTEGER, allowNull: false },
  currency: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
}, { tableName: 'paymentAttempts', timestamps: true });

module.exports = PaymentAttempt;