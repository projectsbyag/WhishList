const User = require('./User');
const Deal = require('./Deal');
const WishlistItem = require('./WishlistItem');
const Subscription = require('./Subscription');
const Vendor = require('./Vendor');
const Report = require('./Report');
const PaymentAttempt = require('./PaymentAttempt');

// Define associations
Deal.belongsTo(User, { foreignKey: 'vendorId', as: 'owner' });
User.hasMany(Deal, { foreignKey: 'vendorId', as: 'deals' });

WishlistItem.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(WishlistItem, { foreignKey: 'userId', as: 'wishlistItems' });

WishlistItem.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });
Deal.hasMany(WishlistItem, { foreignKey: 'dealId', as: 'wishlistItems' });

Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });

Vendor.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Vendor, { foreignKey: 'userId', as: 'vendor' });
Deal.belongsTo(Vendor, { foreignKey: 'vendorId', targetKey: 'userId', as: 'vendor' });
Vendor.hasMany(Deal, { foreignKey: 'vendorId', sourceKey: 'userId', as: 'deals' });

Report.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Report, { foreignKey: 'userId', as: 'reports' });
Report.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });
Deal.hasMany(Report, { foreignKey: 'dealId', as: 'reports' });

PaymentAttempt.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(PaymentAttempt, { foreignKey: 'userId', as: 'paymentAttempts' });

module.exports = { User, Deal, WishlistItem, Subscription, Vendor, Report, PaymentAttempt };
