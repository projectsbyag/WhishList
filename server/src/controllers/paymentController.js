// Payment controller - simplified for SQLite (subscriptions removed)
// This can be expanded later with a proper payment gateway

const SUBSCRIPTION_TIERS = {
  basic: {
    name: 'Basic',
    price: 4999, // ₦4,999
    maxDeals: 10,
    features: {
      analytics: false,
      customBranding: false,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  professional: {
    name: 'Professional',
    price: 29999, // ₦29,999
    maxDeals: 50,
    features: {
      analytics: true,
      customBranding: true,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 99999, // ₦99,999
    maxDeals: -1, // unlimited
    features: {
      analytics: true,
      customBranding: true,
      prioritySupport: true,
      apiAccess: true,
    },
  },
};

// Get pricing plans
const getPricingPlans = async (req, res) => {
  try {
    const plans = Object.keys(SUBSCRIPTION_TIERS).map((tier) => ({
      tier,
      ...SUBSCRIPTION_TIERS[tier],
    }));
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Initialize payment - stub
const initializePayment = async (req, res) => {
  try {
    res.json({
      message: 'Payment feature coming soon',
      status: 'coming_soon',
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Verify payment - stub
const verifyPayment = async (req, res) => {
  try {
    res.json({
      message: 'Payment feature coming soon',
      status: 'coming_soon',
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get subscription status - stub
const getSubscriptionStatus = async (req, res) => {
  try {
    res.json({
      status: 'free',
      tier: 'basic',
      message: 'Free tier - unlimited deals',
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Cancel subscription - stub
const cancelSubscription = async (req, res) => {
  try {
    res.json({
      message: 'Payment feature coming soon',
      status: 'coming_soon',
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get transaction history - stub
const getTransactionHistory = async (req, res) => {
  try {
    res.json({
      transactions: [],
      message: 'No transaction history',
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  getSubscriptionStatus,
  getPricingPlans,
  cancelSubscription,
  getTransactionHistory,
};
