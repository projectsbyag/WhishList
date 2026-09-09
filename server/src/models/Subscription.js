const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ['basic', 'professional', 'enterprise'],
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    // Paystack payment reference and customer ID
    paystackReference: {
      type: String,
      unique: true,
      sparse: true,
    },
    paystackCustomerId: {
      type: Number,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'past_due', 'cancelled', 'expired'],
      default: 'active',
    },
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    maxDeals: {
      type: Number,
      default: 10, // Basic: 10, Professional: 50, Enterprise: unlimited
    },
    features: {
      analytics: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    renewalDate: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
