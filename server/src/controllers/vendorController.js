const User = require('../models/User');
const Deal = require('../models/Deal');
const { Op } = require('sequelize');

// Register as vendor
const registerVendor = async (req, res) => {
  try {
    const userId = req.user.id;

    // Update user role to 'vendor'
    await User.update({ role: 'vendor' }, { where: { id: userId } });

    const user = await User.findByPk(userId);

    res.status(201).json({
      message: 'Vendor profile created successfully',
      vendor: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get vendor profile
const getVendorProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update vendor profile
const updateVendorProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    await User.update(
      { name, email },
      { where: { id: req.user.id } }
    );

    const user = await User.findByPk(req.user.id);

    res.json({
      message: 'Vendor profile updated successfully',
      user,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Create deal (vendor only)
const createDeal = async (req, res) => {
  try {
    const { title, description, category, discount, originalPrice, discountedPrice, productLink, imageUrl, location } = req.body;

    // Validate required fields
    if (!title || !category || !discount) {
      return res.status(400).json({ message: 'Title, category, and discount are required' });
    }

    const user = await User.findByPk(req.user.id);

    const deal = await Deal.create({
      vendorId: req.user.id,
      title,
      description,
      category,
      discount,
      originalPrice,
      discountedPrice,
      productLink,
      imageUrl,
      location,
      store: user.name || 'Vendor Store',
      isActive: true,
      available: 1,
    });

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
    const { page = 1, limit = 10, isActive } = req.query;

    const skip = (page - 1) * limit;
    const filter = { vendorId: req.user.id };

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const deals = await Deal.findAll({
      where: filter,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: skip,
    });

    const total = await Deal.count({ where: filter });

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
    const { dealId } = req.params;
    const { title, description, category, discount, originalPrice, discountedPrice, productLink, imageUrl, location, isActive } = req.body;

    const deal = await Deal.findOne({
      where: { id: dealId, vendorId: req.user.id }
    });

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Update fields
    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (category) updates.category = category;
    if (discount) updates.discount = discount;
    if (originalPrice) updates.originalPrice = originalPrice;
    if (discountedPrice) updates.discountedPrice = discountedPrice;
    if (productLink) updates.productLink = productLink;
    if (imageUrl) updates.imageUrl = imageUrl;
    if (location) updates.location = location;
    if (isActive !== undefined) updates.isActive = isActive;

    await deal.update(updates);

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
    const { dealId } = req.params;

    const deal = await Deal.findOne({
      where: { id: dealId, vendorId: req.user.id }
    });

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    await deal.destroy();

    res.json({ message: 'Deal deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get vendor dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const totalDeals = await Deal.count({ where: { vendorId: req.user.id } });
    const activeDeals = await Deal.count({ where: { vendorId: req.user.id, isActive: true } });
    const inactiveDeals = await Deal.count({ where: { vendorId: req.user.id, isActive: false } });

    const user = await User.findByPk(req.user.id);

    res.json({
      storeName: user.name || 'Vendor Store',
      stats: {
        totalDeals,
        activeDeals,
        inactiveDeals,
      },
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
