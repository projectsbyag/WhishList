const crypto = require('crypto');
const paystack = require('../config/paystack');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { Op } = require('sequelize');

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

// Create (or renew) the 30-day subscription for a paid reference. Idempotent.
const activateSubscriptionForReference = async ({ userId, tier, reference }) => {
  const plan = SUBSCRIPTION_TIERS[tier];
  if (!plan) throw new Error('Unknown subscription tier');

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Ensure the paying user is a vendor
  await User.update({ role: 'vendor' }, { where: { id: userId } });

  const fields = {
    userId,
    tier,
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    maxDeals: plan.maxDeals,
    features: plan.features,
    paystackReference: reference,
  };

  const existing = await Subscription.findOne({ where: { paystackReference: reference } });
  if (existing) {
    await existing.update(fields);
    return existing;
  }
  return Subscription.create(fields);
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

    // Determine which tier was paid for (from the metadata captured at initialization)
    let tier = 'basic';
    let metadataUserId = null;
    const metadata = data.data?.metadata;
    if (metadata) {
      const raw = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      if (raw && raw.tier) tier = raw.tier;
      if (raw && raw.userId) metadataUserId = raw.userId;
    }

    const plan = SUBSCRIPTION_TIERS[tier];
    if (!plan) {
      return res.status(400).json({ message: 'Unknown subscription tier' });
    }

    // The reference must belong to the logged-in user
    if (metadataUserId && Number(metadataUserId) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'This payment reference belongs to another account' });
    }

    // The amount actually charged must match the plan price
    if (data.data.amount !== plan.price * 100) {
      return res.status(400).json({ message: 'Paid amount does not match the selected plan' });
    }

    const subscription = await activateSubscriptionForReference({
      userId: req.user.id,
      tier,
      reference,
    });

    res.json({
      status: true,
      message: 'Payment verified and subscription activated',
      data: data.data,
      subscription: subscription.toJSON(),
      plan: {
        tier,
        name: plan.name,
        price: plan.price,
        maxDeals: plan.maxDeals,
        nextBilling: subscription.currentPeriodEnd.toISOString(),
      },
    });
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    res.status(502).json({ message: `Payment verification failed: ${message}` });
  }
};

// Paystack webhook: activates subscriptions even if the browser never calls /verify.
// Requires the raw request body, so this route must be registered before express.json().
const handleWebhook = async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '', 'utf8');
  const signature = req.headers['x-paystack-signature'];

  if (!isValidWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ message: 'Invalid webhook signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  // Always acknowledge so Paystack stops retrying
  res.status(200).json({ received: true });

  try {
    if (event.event !== 'charge.success') return;

    const charge = event.data || {};
    const reference = charge.reference;
    if (!reference || charge.status !== 'success') return;

    let tier = 'basic';
    let userId = null;
    const metadata = charge.metadata;
    if (metadata) {
      const raw = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      if (raw && raw.tier) tier = raw.tier;
      if (raw && raw.userId) userId = raw.userId;
    }
    if (!userId || !SUBSCRIPTION_TIERS[tier]) return;

    await activateSubscriptionForReference({ userId, tier, reference });
    console.log(`✅ Webhook activated subscription for reference ${reference}`);
  } catch (err) {
    console.error('Webhook processing error:', err.message);
  }
};

function isValidWebhookSignature(rawBody, signature) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;

  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Get subscription status
const getSubscriptionStatus = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      where: {
        userId: req.user.id,
        status: 'active',
        currentPeriodEnd: { [Op.gt]: new Date() },
      },
      order: [['currentPeriodEnd', 'DESC']],
    });

    if (!subscription) {
      return res.json({
        hasSubscription: false,
        subscriptionStatus: 'inactive',
        tier: 'basic',
        subscription: null,
      });
    }

    res.json({
      hasSubscription: true,
      subscriptionStatus: 'active',
      tier: subscription.tier,
      subscription: subscription.toJSON(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      where: { userId: req.user.id, status: 'active' },
      order: [['currentPeriodEnd', 'DESC']],
    });

    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    await subscription.update({ status: 'cancelled', currentPeriodEnd: new Date() });

    res.json({
      message: 'Subscription cancelled successfully',
      status: 'cancelled',
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get transaction history
const getTransactionHistory = async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    const transactions = subscriptions.map((sub) => ({
      id: sub.id,
      reference: sub.paystackReference,
      type: 'subscription',
      status: sub.status,
      tier: sub.tier,
      amount: (SUBSCRIPTION_TIERS[sub.tier]?.price || 0),
      currency: 'NGN',
      createdAt: sub.createdAt,
      currentPeriodEnd: sub.currentPeriodEnd,
    }));

    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  handleWebhook,
  getSubscriptionStatus,
  getPricingPlans,
  cancelSubscription,
  getTransactionHistory,
};
