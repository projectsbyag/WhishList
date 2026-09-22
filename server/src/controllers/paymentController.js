const paystack = require('../config/paystack');

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

const initializePayment = async (req, res) => {
  try {
    const { tier, email } = req.body;
    const plan = SUBSCRIPTION_TIERS[tier];

    if (!plan || !email) {
      return res.status(400).json({ message: 'A valid tier and email are required' });
    }

    const { data } = await paystack.post('/transaction/initialize', {
      email,
      amount: plan.price * 100,
      currency: 'NGN',
      metadata: { userId: req.user.id, tier },
    });

    if (!data.status || !data.data) {
      return res.status(502).json({ message: data.message || 'Payment initialization failed' });
    }

    res.json({
      status: true,
      data: {
        publicKey: process.env.PAYSTACK_PUBLIC_KEY,
        access_code: data.data.access_code,
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
        email,
        amount: plan.price * 100,
      },
    });
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    if (message.toLowerCase().includes('integration has been deactivated')) {
      return res.status(503).json({
        message: 'Paystack integration is deactivated. Replace PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY in server/.env, then restart the server.',
      });
    }
    res.status(502).json({ message: `Payment initialization failed: ${message}` });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ message: 'Payment reference is required' });
    }

    const { data } = await paystack.get(`/transaction/verify/${encodeURIComponent(reference)}`);
    const paid = data.status && data.data?.status === 'success';

    if (!paid) {
      return res.status(400).json({ message: data.data?.gateway_response || 'Payment was not successful' });
    }

    res.json({ status: true, message: 'Payment verified successfully', data: data.data });
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    res.status(502).json({ message: `Payment verification failed: ${message}` });
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
