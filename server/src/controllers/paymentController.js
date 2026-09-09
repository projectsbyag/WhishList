const paystack = require('../config/paystack');
const Vendor = require('../models/Vendor');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');

// Subscription pricing tiers (in naira)
const SUBSCRIPTION_TIERS = {
  basic: {
    name: 'Basic',
    price: parseInt(process.env.BASIC_PRICE_MONTHLY || 9999), // ₦9,999
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
    price: parseInt(process.env.PROFESSIONAL_PRICE_MONTHLY || 29999), // ₦29,999
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
    price: parseInt(process.env.ENTERPRISE_PRICE_MONTHLY || 99999), // ₦99,999
    maxDeals: -1, // unlimited
    features: {
      analytics: true,
      customBranding: true,
      prioritySupport: true,
      apiAccess: true,
    },
  },
};

// Initialize payment
const initializePayment = async (req, res) => {
  try {
    const { tier, email } = req.body;
    const vendor = req.vendor;

    if (!tier || !SUBSCRIPTION_TIERS[tier]) {
      return res.status(400).json({ message: 'Invalid subscription tier' });
    }

    const amount = SUBSCRIPTION_TIERS[tier].price;

    // Initialize Paystack transaction
    const response = await paystack.post('/transaction/initialize', {
      email: email || req.user.email,
      amount: amount * 100, // Paystack expects amount in kobo
      metadata: {
        vendorId: vendor._id.toString(),
        userId: req.user.id,
        tier,
        planName: SUBSCRIPTION_TIERS[tier].name,
      },
    });

    if (!response.data.status) {
      throw new Error(response.data.message || 'Failed to initialize payment');
    }

    res.json({
      status: true,
      data: response.data.data,
      message: 'Payment initialized successfully',
    });
  } catch (err) {
    console.error('Payment initialization error:', err.response?.data || err.message);
    res.status(500).json({
      status: false,
      message: err.response?.data?.message || err.message,
    });
  }
};

// Verify payment and create subscription
const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    const vendor = req.vendor;

    if (!reference) {
      return res.status(400).json({ message: 'Reference is required' });
    }

    // Verify payment with Paystack
    const response = await paystack.get(`/transaction/verify/${reference}`);

    if (!response.data.status) {
      return res.status(400).json({
        status: false,
        message: 'Payment verification failed',
      });
    }

    const data = response.data.data;

    if (data.status !== 'success') {
      return res.status(400).json({
        status: false,
        message: 'Payment was not successful',
      });
    }

    const { tier, vendorId } = data.metadata;

    // Verify vendor ID matches
    if (vendorId !== vendor._id.toString()) {
      return res.status(403).json({
        status: false,
        message: 'Vendor mismatch',
      });
    }

    // Create subscription in database
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = new Subscription({
      vendor: vendor._id,
      tier,
      price: SUBSCRIPTION_TIERS[tier].price,
      paystackReference: reference,
      paystackCustomerId: data.customer.id,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      maxDeals: SUBSCRIPTION_TIERS[tier].maxDeals,
      features: SUBSCRIPTION_TIERS[tier].features,
    });

    await subscription.save();

    // Update vendor
    vendor.subscriptionStatus = 'active';
    vendor.subscriptionTier = tier;
    vendor.currentSubscription = subscription._id;
    vendor.isActive = true;
    await vendor.save();

    // Create transaction record
    const transaction = new Transaction({
      vendor: vendor._id,
      subscription: subscription._id,
      paystackReference: reference,
      type: 'subscription',
      amount: SUBSCRIPTION_TIERS[tier].price,
      status: 'completed',
      description: `Initial ${tier} subscription payment`,
      billingPeriodStart: now,
      billingPeriodEnd: nextMonth,
    });

    await transaction.save();

    res.json({
      status: true,
      message: 'Payment verified and subscription created successfully',
      subscription: {
        id: subscription._id,
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (err) {
    console.error('Payment verification error:', err.response?.data || err.message);
    res.status(500).json({
      status: false,
      message: err.response?.data?.message || err.message,
    });
  }
};

// Get subscription status
const getSubscriptionStatus = async (req, res) => {
  try {
    const vendor = req.vendor;

    const subscription = await Subscription.findById(vendor.currentSubscription).lean();

    if (!subscription) {
      return res.json({
        hasSubscription: false,
        message: 'No active subscription found',
      });
    }

    res.json({
      hasSubscription: true,
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        maxDeals: subscription.maxDeals,
        features: subscription.features,
        autoRenew: subscription.autoRenew,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get subscription pricing plans
const getPricingPlans = (req, res) => {
  res.json({
    plans: Object.entries(SUBSCRIPTION_TIERS).map(([key, value]) => ({
      tier: key,
      name: value.name,
      price: value.price,
      currency: 'NGN',
      maxDeals: value.maxDeals,
      features: value.features,
    })),
  });
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const vendor = req.vendor;

    const subscription = await Subscription.findById(vendor.currentSubscription);
    if (!subscription) {
      return res.status(404).json({ message: 'No subscription found' });
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancelReason = req.body.reason || 'User requested cancellation';
    await subscription.save();

    vendor.subscriptionStatus = 'cancelled';
    vendor.isActive = false;
    await vendor.save();

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get transaction history
const getTransactionHistory = async (req, res) => {
  try {
    const vendor = req.vendor;
    const { limit = 10, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({ vendor: vendor._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Transaction.countDocuments({ vendor: vendor._id });

    res.json({
      transactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
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
