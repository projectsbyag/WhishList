// Check if user is a vendor
const isVendor = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Vendor access required' });
    }
    const Vendor = require('../models/Vendor');
    const profile = await Vendor.findOne({ where: { userId: req.user.id, isActive: true } });
    if (!profile) return res.status(403).json({ message: 'Active vendor profile required' });
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  isVendor,
  isAdmin,
};
