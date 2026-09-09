const Vendor = require('../models/Vendor');

// Check if user is a vendor
const isVendor = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Vendor access required' });
    }

    // Fetch vendor data
    const vendor = await Vendor.findOne({ user: req.user.id });
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    // Attach vendor to request
    req.vendor = vendor;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Check if vendor has active subscription
const hasActiveSubscription = async (req, res, next) => {
  try {
    if (!req.vendor) {
      return res.status(403).json({ message: 'Vendor profile required' });
    }

    if (req.vendor.subscriptionStatus !== 'active') {
      return res.status(403).json({
        message: 'Your subscription is not active. Please renew your subscription to continue.',
        subscriptionStatus: req.vendor.subscriptionStatus,
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  isVendor,
  hasActiveSubscription,
};
