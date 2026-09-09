const express = require('express');
const router = express.Router();
const { isVendor } = require('../middleware/vendorAuth');
const {
  initializePayment,
  verifyPayment,
  getSubscriptionStatus,
  getPricingPlans,
  cancelSubscription,
  getTransactionHistory,
} = require('../controllers/paymentController');
const auth = require('../middleware/auth');

// Public routes
router.get('/pricing-plans', getPricingPlans);

// Protected vendor routes
router.post('/initialize', auth, isVendor, initializePayment);
router.post('/verify', auth, isVendor, verifyPayment);
router.get('/subscription-status', auth, isVendor, getSubscriptionStatus);
router.post('/cancel-subscription', auth, isVendor, cancelSubscription);
router.get('/transaction-history', auth, isVendor, getTransactionHistory);

module.exports = router;
