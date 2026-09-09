const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getAllVendors,
  getVendorDetails,
  deactivateVendor,
  activateVendor,
  deleteVendor,
  editVendor,
  getAdminStats,
  getVendorTransactions,
} = require('../controllers/adminController');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Admin stats
router.get('/stats', auth, isAdmin, getAdminStats);

// Vendor management
router.get('/vendors', auth, isAdmin, getAllVendors);
router.get('/vendors/:vendorId', auth, isAdmin, getVendorDetails);
router.put('/vendors/:vendorId', auth, isAdmin, editVendor);
router.post('/vendors/:vendorId/deactivate', auth, isAdmin, deactivateVendor);
router.post('/vendors/:vendorId/activate', auth, isAdmin, activateVendor);
router.delete('/vendors/:vendorId', auth, isAdmin, deleteVendor);

// Vendor transactions
router.get('/vendors/:vendorId/transactions', auth, isAdmin, getVendorTransactions);

module.exports = router;
