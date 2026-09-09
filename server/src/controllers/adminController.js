const Vendor = require('../models/Vendor');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Get all vendors (admin only)
const getAllVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, tier, search } = req.query;

    const skip = (page - 1) * limit;
    const filter = {};

    if (status) {
      filter.subscriptionStatus = status;
    }

    if (tier) {
      filter.subscriptionTier = tier;
    }

    if (search) {
      filter.$or = [
        { storeName: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const vendors = await Vendor.find(filter)
      .populate('user', 'email name')
      .populate('currentSubscription', 'tier status currentPeriodEnd')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Vendor.countDocuments(filter);

    res.json({
      vendors: vendors.map((vendor) => ({
        id: vendor._id,
        storeName: vendor.storeName,
        storeDescription: vendor.storeDescription,
        category: vendor.category,
        contactEmail: vendor.contactEmail,
        contactPhone: vendor.contactPhone,
        address: vendor.address,
        website: vendor.website,
        subscriptionStatus: vendor.subscriptionStatus,
        subscriptionTier: vendor.subscriptionTier,
        dealsCount: vendor.dealsCount,
        isActive: vendor.isActive,
        verificationStatus: vendor.verificationStatus,
        user: vendor.user,
        currentSubscription: vendor.currentSubscription,
        createdAt: vendor.createdAt,
      })),
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

// Get vendor details
const getVendorDetails = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId)
      .populate('user', 'email name createdAt')
      .populate('currentSubscription')
      .lean();

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Get recent transactions
    const transactions = await Transaction.find({ vendor: vendorId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      vendor,
      recentTransactions: transactions,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Deactivate vendor
const deactivateVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    vendor.isActive = false;
    vendor.subscriptionStatus = 'suspended';
    await vendor.save();

    // Create transaction record for deactivation
    const transaction = new Transaction({
      vendor: vendorId,
      type: 'manual',
      amount: 0,
      status: 'completed',
      description: `Vendor account deactivated by admin. Reason: ${reason || 'No reason provided'}`,
    });

    await transaction.save();

    res.json({
      message: 'Vendor deactivated successfully',
      vendor: {
        id: vendor._id,
        storeName: vendor.storeName,
        isActive: vendor.isActive,
        subscriptionStatus: vendor.subscriptionStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Activate vendor
const activateVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Check if vendor has active subscription
    if (vendor.currentSubscription) {
      const subscription = await Subscription.findById(vendor.currentSubscription);
      if (subscription && subscription.status === 'active') {
        vendor.isActive = true;
        vendor.subscriptionStatus = 'active';
        await vendor.save();

        return res.json({
          message: 'Vendor activated successfully',
          vendor: {
            id: vendor._id,
            storeName: vendor.storeName,
            isActive: vendor.isActive,
            subscriptionStatus: vendor.subscriptionStatus,
          },
        });
      }
    }

    return res.status(400).json({
      message: 'Cannot activate vendor without active subscription',
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete vendor
const deleteVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Store vendor info before deletion
    const vendorInfo = {
      id: vendor._id,
      storeName: vendor.storeName,
      email: vendor.contactEmail,
    };

    // Delete vendor deals
    await require('../models/Deal').deleteMany({ vendor: vendorId });

    // Delete transactions
    await Transaction.deleteMany({ vendor: vendorId });

    // Delete subscriptions
    await Subscription.deleteMany({ vendor: vendorId });

    // Delete vendor
    await Vendor.findByIdAndDelete(vendorId);

    res.json({
      message: 'Vendor and all associated data deleted successfully',
      deletedVendor: vendorInfo,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Edit vendor details
const editVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const {
      storeName,
      storeDescription,
      category,
      contactEmail,
      contactPhone,
      address,
      website,
      verificationStatus,
    } = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Update fields
    if (storeName) vendor.storeName = storeName;
    if (storeDescription) vendor.storeDescription = storeDescription;
    if (category) vendor.category = category;
    if (contactEmail) vendor.contactEmail = contactEmail;
    if (contactPhone) vendor.contactPhone = contactPhone;
    if (address) vendor.address = address;
    if (website) vendor.website = website;
    if (verificationStatus) vendor.verificationStatus = verificationStatus;

    await vendor.save();

    res.json({
      message: 'Vendor updated successfully',
      vendor,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get admin dashboard stats
const getAdminStats = async (req, res) => {
  try {
    const totalVendors = await Vendor.countDocuments();
    const activeVendors = await Vendor.countDocuments({ subscriptionStatus: 'active' });
    const inactiveVendors = await Vendor.countDocuments({ subscriptionStatus: 'inactive' });
    const suspendedVendors = await Vendor.countDocuments({ subscriptionStatus: 'suspended' });

    const basicVendors = await Vendor.countDocuments({ subscriptionTier: 'basic' });
    const professionalVendors = await Vendor.countDocuments({ subscriptionTier: 'professional' });
    const enterpriseVendors = await Vendor.countDocuments({ subscriptionTier: 'enterprise' });

    // Get total revenue
    const revenueData = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = revenueData[0]?.totalRevenue || 0;
    const totalTransactions = revenueData[0]?.totalTransactions || 0;

    res.json({
      vendors: {
        total: totalVendors,
        active: activeVendors,
        inactive: inactiveVendors,
        suspended: suspendedVendors,
      },
      subscriptionTiers: {
        basic: basicVendors,
        professional: professionalVendors,
        enterprise: enterpriseVendors,
      },
      revenue: {
        total: totalRevenue / 100, // Convert cents to dollars
        transactions: totalTransactions,
        averagePerTransaction: totalTransactions > 0 ? totalRevenue / totalTransactions / 100 : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get vendor transactions
const getVendorTransactions = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({ vendor: vendorId })
      .populate('subscription', 'tier status')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Transaction.countDocuments({ vendor: vendorId });

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
  getAllVendors,
  getVendorDetails,
  deactivateVendor,
  activateVendor,
  deleteVendor,
  editVendor,
  getAdminStats,
  getVendorTransactions,
};
