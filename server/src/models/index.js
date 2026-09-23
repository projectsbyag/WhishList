const User = require('./User');
const Deal = require('./Deal');
const WishlistItem = require('./WishlistItem');
const Subscription = require('./Subscription');

// Define associations
Deal.belongsTo(User, { foreignKey: 'vendorId', as: 'vendor' });
User.hasMany(Deal, { foreignKey: 'vendorId', as: 'deals' });

WishlistItem.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(WishlistItem, { foreignKey: 'userId', as: 'wishlistItems' });

WishlistItem.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });
Deal.hasMany(WishlistItem, { foreignKey: 'dealId', as: 'wishlistItems' });

Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });

module.exports = { User, Deal, WishlistItem, Subscription };
