const { Op } = require('sequelize');
const Subscription = require('../models/Subscription');

async function expireEndedSubscriptions(userId, now = new Date()) {
  await Subscription.update(
    { status: 'expired' },
    { where: { userId, status: 'active', currentPeriodEnd: { [Op.lte]: now } } }
  );
}

module.exports = { expireEndedSubscriptions };