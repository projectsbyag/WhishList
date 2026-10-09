const User = require('../models/User');
const Deal = require('../models/Deal');
const Subscription = require('../models/Subscription');
const { Op } = require('sequelize');

// Latest subscription state for a vendor, derived from real data
const getVendorSubscriptionInfo = async (userId) => {
  const sub = await Subscription.findOne({
    where: { userId },
    order: [['currentPeriodEnd', 'DESC'], ['createdAt', 'DESC']],
  });

  if (!sub) return { subscriptionStatus: 'inactive', subscriptionTier: 'free' };
  if (sub.status === 'cancelled') {
    return { subscriptionStatus: 'cancelled', subscriptionTier: sub.tier };
  }
  const isActive = sub.status === 'active' && new Date(sub.currentPeriodEnd).getTime() > Date.now();
  return {
    subscriptionStatus: isActive ? 'active' : 'inactive',
    subscriptionTier: sub.tier,
  };
};

// Get all vendors (admin only)
const getAllVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, tier } = req.query;

    const filter = { role: 'vendor' };

    if (search) {
      const like = { [Op.like]: `%${search}%` };
      filter[Op.or] = [
        { name: like },
        { email: like },
        { storeName: like },
      ];
    }

    const vendors = await User.findAll({
      where: filter,
      order: [['createdAt', 'DESC']],
    });

    let rows = await Promise.all(
      vendors.map(async (vendor) => {
        const dealsCount = await Deal.count({ where: { vendorId: vendor.id } });
        const subInfo = await getVendorSubscriptionInfo(vendor.id);
        return {
          id: vendor.id,
          storeName: vendor.storeName || vendor.name || 'Vendor Store',
          contactEmail: vendor.contactEmail || vendor.email,
          category: vendor.category || 'general',
          contactPhone: vendor.contactPhone || '',
          address: vendor.address || '',
          website: vendor.website || '',
          ...subInfo,
          dealsCount,
          createdAt: vendor.createdAt,
        };
      })
    );

    if (status) rows = rows.filter((row) => row.subscriptionStatus === status);
    if (tier) rows = rows.filter((row) => row.subscriptionTier === tier);

    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const total = rows.length;
    const paged = rows.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      vendors: paged,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
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

    const vendor = await User.findByPk(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Get vendor's deals (recent ones)
    const deals = await Deal.findAll({
      where: { vendorId },
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    // Get deal count
    const dealsCount = await Deal.count({ where: { vendorId } });

    const subInfo = await getVendorSubscriptionInfo(vendor.id);

    res.json({
      vendor: {
        id: vendor.id,
        storeName: vendor.storeName || vendor.name || 'Vendor Store',
        contactEmail: vendor.contactEmail || vendor.email,
        category: vendor.category || 'general',
        contactPhone: vendor.contactPhone || '',
        address: vendor.address || '',
        website: vendor.website || '',
        ...subInfo,
        dealsCount: dealsCount,
        createdAt: vendor.createdAt,
        verificationStatus: 'verified',
      },
      recentTransactions: [],
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Deactivate vendor (set role back to user)
const deactivateVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await User.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    await vendor.update({ role: 'user' });

    res.json({
      message: 'Vendor deactivated successfully',
      vendor: {
        id: vendor.id,
        name: vendor.name,
        role: vendor.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Activate vendor (set role to vendor)
const activateVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await User.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    await vendor.update({ role: 'vendor' });

    res.json({
      message: 'Vendor activated successfully',
      vendor: {
        id: vendor.id,
        name: vendor.name,
        role: vendor.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete vendor and their deals
const deleteVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await User.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Delete vendor's deals
    await Deal.destroy({ where: { vendorId } });

    // Delete vendor user
    await vendor.destroy();

    res.json({
      message: 'Vendor and all associated deals deleted successfully',
      deletedVendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Edit vendor details
const editVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { storeName, contactEmail, email, category, contactPhone, address, website, verificationStatus } = req.body;

    const vendor = await User.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const updates = {};
    if (storeName !== undefined) updates.storeName = storeName;
    if (category !== undefined) updates.category = category;
    if (contactPhone !== undefined) updates.contactPhone = contactPhone;
    if (address !== undefined) updates.address = address;
    if (website !== undefined) updates.website = website;
    if (contactEmail) updates.email = contactEmail;
    if (email) updates.email = email;

    if (Object.keys(updates).length > 0) {
      await vendor.update(updates);
    }

    const subInfo = await getVendorSubscriptionInfo(vendor.id);

    res.json({
      message: 'Vendor updated successfully',
      vendor: {
        id: vendor.id,
        storeName: vendor.storeName || vendor.name,
        contactEmail: vendor.contactEmail || vendor.email,
        category: vendor.category || 'general',
        contactPhone: vendor.contactPhone || '',
        address: vendor.address || '',
        website: vendor.website || '',
        ...subInfo,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get admin dashboard stats
const TIER_PRICES = { basic: 4999, professional: 29999, enterprise: 99999 };

const getAdminStats = async (req, res) => {
  try {
    const totalVendors = await User.count({ where: { role: 'vendor' } });
    const totalUsers = await User.count({ where: { role: 'user' } });
    const totalDeals = await Deal.count();
    const activeDeals = await Deal.count({ where: { isActive: true } });

    const activeSubs = await Subscription.count({
      where: { status: 'active', currentPeriodEnd: { [Op.gt]: new Date() } },
    });

    const subs = await Subscription.findAll({ attributes: ['tier'] });
    const revenue = subs.reduce((sum, sub) => sum + (TIER_PRICES[sub.tier] || 0), 0);

    res.json({
      vendors: {
        total: totalVendors,
        active: activeSubs,
        inactive: Math.max(totalVendors - activeSubs, 0),
        suspended: 0,
      },
      users: {
        total: totalUsers,
        vendors: totalVendors,
        admins: await User.count({ where: { role: 'admin' } }),
      },
      deals: {
        total: totalDeals,
        active: activeDeals,
        inactive: totalDeals - activeDeals,
      },
      revenue: {
        total: revenue,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get vendor deals
const getVendorTransactions = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const deals = await Deal.findAll({
      where: { vendorId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: skip,
    });

    const total = await Deal.count({ where: { vendorId } });

    res.json({
      transactions: deals,
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

// Get every deal, including inactive and expired ones (admin only)
const getAllDeals = async (req, res) => {
  try {
    const deals = await Deal.findAll({
      order: [['createdAt', 'DESC']],
      limit: 500,
    });
    res.json(deals);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  getAllVendors,
  getAllDeals,
  getVendorDetails,
  deactivateVendor,
  activateVendor,
  deleteVendor,
  editVendor,
  getAdminStats,
  getVendorTransactions,
};
