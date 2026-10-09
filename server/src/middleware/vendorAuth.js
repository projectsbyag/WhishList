// Check if user is a vendor
const isVendor = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Vendor access required' });
    }
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
