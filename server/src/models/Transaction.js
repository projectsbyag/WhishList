const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    paystackReference: {
      type: String,
      unique: true,
      sparse: true,
    },
    type: {
      type: String,
      enum: ['subscription', 'upgrade', 'refund', 'manual'],
      default: 'subscription',
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    description: {
      type: String,
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'bank_transfer', 'other'],
      default: 'card',
    },
    invoiceUrl: {
      type: String,
    },
    receiptUrl: {
      type: String,
    },
    failureReason: {
      type: String,
    },
    billingPeriodStart: {
      type: Date,
    },
    billingPeriodEnd: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
