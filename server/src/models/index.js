const User = require('./User');
const Deal = require('./Deal');
const WishlistItem = require('./WishlistItem');

// Define associations
Deal.belongsTo(User, { foreignKey: 'vendorId', as: 'vendor' });
User.hasMany(Deal, { foreignKey: 'vendorId', as: 'deals' });

WishlistItem.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(WishlistItem, { foreignKey: 'userId', as: 'wishlistItems' });

WishlistItem.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });
Deal.hasMany(WishlistItem, { foreignKey: 'dealId', as: 'wishlistItems' });

module.exports = { User, Deal, WishlistItem };
