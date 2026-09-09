const Vendor = require('../models/Vendor');
const Deal = require('../models/Deal');
const Subscription = require('../models/Subscription');

// Register as vendor
const registerVendor = async (req, res) => {
  try {
    const { storeName, storeDescription, category, contactEmail, contactPhone, address, website } = req.body;
    const userId = req.user.id;

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ user: userId });
    if (existingVendor) {
      return res.status(400).json({ message: 'Vendor profile already exists for this user' });
    }

    // Validate required fields
    if (!storeName || !contactEmail) {
      return res.status(400).json({ message: 'Store name and contact email are required' });
    }

    // Create vendor
    const vendor = new Vendor({
      user: userId,
      storeName,
      storeDescription: storeDescription || '',
      category: category || 'other',
      contactEmail,
      contactPhone: contactPhone || '',
      address: address || '',
      website: website || '',
      subscriptionStatus: 'inactive',
      isActive: false,
    });

    await vendor.save();

    res.status(201).json({
      message: 'Vendor profile created successfully',
      vendor: {
        id: vendor._id,
        storeName: vendor.storeName,
        subscriptionStatus: vendor.subscriptionStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get vendor profile
const getVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user.id })
      .populate('currentSubscription')
      .lean();

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update vendor profile
const updateVendorProfile = async (req, res) => {
  try {
    const { storeName, storeDescription, category, contactEmail, contactPhone, address, website, logo } =
      req.body;

    const vendor = await Vendor.findOne({ user: req.user.id });
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    // Update fields
    if (storeName) vendor.storeName = storeName;
    if (storeDescription) vendor.storeDescription = storeDescription;
    if (category) vendor.category = category;
    if (contactEmail) vendor.contactEmail = contactEmail;
    if (contactPhone) vendor.contactPhone = contactPhone;
    if (address) vendor.address = address;
    if (website) vendor.website = website;
    if (logo) vendor.logo = logo;

    await vendor.save();

    res.json({
      message: 'Vendor profile updated successfully',
      vendor,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Create deal (vendor only)
const createDeal = async (req, res) => {
  try {
    const vendor = req.vendor;

    // Check if vendor has active subscription
    if (vendor.subscriptionStatus !== 'active') {
      return res.status(403).json({
        message: 'Active subscription required to create deals',
        subscriptionStatus: vendor.subscriptionStatus,
      });
    }

    // Check deal limit
    const subscription = await Subscription.findById(vendor.currentSubscription);
    if (subscription && subscription.maxDeals > 0) {
      const dealsCount = await Deal.countDocuments({ vendor: vendor._id });
      if (dealsCount >= subscription.maxDeals) {
        return res.status(403).json({
          message: `Deal limit reached. Your subscription allows ${subscription.maxDeals} deals`,
          currentCount: dealsCount,
          maxAllowed: subscription.maxDeals,
        });
      }
    }

    const { title, description, category, discount, originalPrice, discountedPrice, productLink, imageUrl, location } =
      req.body;

    // Validate required fields
    if (!title || !category || !discount) {
      return res.status(400).json({ message: 'Title, category, and discount are required' });
    }

    const deal = new Deal({
      vendor: vendor._id,
      title,
      description,
      category,
      discount,
      originalPrice,
      discountedPrice,
      productLink,
      imageUrl,
      location,
      store: vendor.storeName,
      isActive: true,
      available: 1,
    });

    await deal.save();

    // Update vendor deals count
    vendor.dealsCount = await Deal.countDocuments({ vendor: vendor._id });
    await vendor.save();

    res.status(201).json({
      message: 'Deal created successfully',
      deal,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get vendor's deals
const getVendorDeals = async (req, res) => {
  try {
    const vendor = req.vendor;
    const { page = 1, limit = 10, isActive } = req.query;

    const skip = (page - 1) * limit;
    const filter = { vendor: vendor._id };

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const deals = await Deal.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Deal.countDocuments(filter);

    res.json({
      deals,
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

// Update deal
const updateDeal = async (req, res) => {
  try {
    const vendor = req.vendor;
    const { dealId } = req.params;
    const { title, description, category, discount, originalPrice, discountedPrice, productLink, imageUrl, location, isActive } =
      req.body;

    const deal = await Deal.findOne({ _id: dealId, vendor: vendor._id });
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Update fields
    if (title) deal.title = title;
    if (description) deal.description = description;
    if (category) deal.category = category;
    if (discount) deal.discount = discount;
    if (originalPrice) deal.originalPrice = originalPrice;
    if (discountedPrice) deal.discountedPrice = discountedPrice;
    if (productLink) deal.productLink = productLink;
    if (imageUrl) deal.imageUrl = imageUrl;
    if (location) deal.location = location;
    if (isActive !== undefined) deal.isActive = isActive;

    await deal.save();

    res.json({
      message: 'Deal updated successfully',
      deal,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete deal
const deleteDeal = async (req, res) => {
  try {
    const vendor = req.vendor;
    const { dealId } = req.params;

    const deal = await Deal.findOneAndDelete({ _id: dealId, vendor: vendor._id });
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Update vendor deals count
    vendor.dealsCount = await Deal.countDocuments({ vendor: vendor._id });
    await vendor.save();

    res.json({ message: 'Deal deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get vendor dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const vendor = req.vendor;

    const totalDeals = await Deal.countDocuments({ vendor: vendor._id });
    const activeDeals = await Deal.countDocuments({ vendor: vendor._id, isActive: true });
    const inactiveDeals = await Deal.countDocuments({ vendor: vendor._id, isActive: false });

    const subscription = await Subscription.findById(vendor.currentSubscription).lean();

    res.json({
      storeName: vendor.storeName,
      subscriptionStatus: vendor.subscriptionStatus,
      subscriptionTier: vendor.subscriptionTier,
      stats: {
        totalDeals,
        activeDeals,
        inactiveDeals,
        maxDeals: subscription?.maxDeals || 'unlimited',
        totalSavings: vendor.totalSavings || 0,
      },
      subscription: subscription
        ? {
            tier: subscription.tier,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            maxDeals: subscription.maxDeals,
            features: subscription.features,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  registerVendor,
  getVendorProfile,
  updateVendorProfile,
  createDeal,
  getVendorDeals,
  updateDeal,
  deleteDeal,
  getDashboardStats,
};
