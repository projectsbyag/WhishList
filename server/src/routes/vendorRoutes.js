const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { isVendor, hasActiveSubscription } = require('../middleware/vendorAuth');
const {
  registerVendor,
  getVendorProfile,
  updateVendorProfile,
  createDeal,
  getVendorDeals,
  updateDeal,
  deleteDeal,
  getDashboardStats,
} = require('../controllers/vendorController');

// Register as vendor
router.post('/register', auth, registerVendor);

// Get vendor profile
router.get('/profile', auth, getVendorProfile);

// Update vendor profile
router.put('/profile', auth, isVendor, updateVendorProfile);

// Dashboard stats
router.get('/dashboard-stats', auth, isVendor, getDashboardStats);

// Deal management
router.post('/deals', auth, isVendor, createDeal);  // Allow all vendors to create deals
router.get('/deals', auth, isVendor, getVendorDeals);
router.put('/deals/:dealId', auth, isVendor, updateDeal);
router.delete('/deals/:dealId', auth, isVendor, deleteDeal);

module.exports = router;
