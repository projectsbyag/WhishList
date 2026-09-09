const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    storeDescription: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['restaurants', 'hotels', 'airlines', 'groceries', 'electronics', 'fashion', 'other'],
      default: 'other',
    },
    logo: {
      type: String,
    },
    website: {
      type: String,
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
    },
    address: {
      type: String,
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'suspended'],
      default: 'inactive',
    },
    subscriptionTier: {
      type: String,
      enum: ['basic', 'professional', 'enterprise'],
      default: 'basic',
    },
    currentSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    dealsCount: {
      type: Number,
      default: 0,
    },
    totalSavings: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
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

module.exports = mongoose.model('Vendor', vendorSchema);
