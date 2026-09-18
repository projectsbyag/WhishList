const User = require('../models/User');
const Deal = require('../models/Deal');
const { Op } = require('sequelize');

// Get all vendors (admin only)
const getAllVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const skip = (page - 1) * limit;
    const filter = { role: 'vendor' };

    if (search) {
      filter[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const vendors = await User.findAll({
      where: filter,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: skip,
    });

    // Count deals for each vendor
    const vendorsWithStats = await Promise.all(
      vendors.map(async (vendor) => {
        const dealsCount = await Deal.count({ where: { vendorId: vendor.id } });
        return {
          id: vendor.id,
          storeName: vendor.name || 'Vendor Store',
          contactEmail: vendor.email,
          category: 'general',  // Default category
          subscriptionStatus: 'active',  // All vendors active in free tier
          subscriptionTier: 'free',
          dealsCount: dealsCount,
          createdAt: vendor.createdAt,
        };
      })
    );

    const total = await User.count({ where: filter });

    res.json({
      vendors: vendorsWithStats,
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

    res.json({
      vendor: {
        id: vendor.id,
        storeName: vendor.name || 'Vendor Store',
        contactEmail: vendor.email,
        category: 'general',
        contactPhone: '',
        address: '',
        website: '',
        subscriptionStatus: 'active',
        subscriptionTier: 'free',
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
    if (storeName) updates.name = storeName;
    if (contactEmail) updates.email = contactEmail;
    if (email) updates.email = email;

    await vendor.update(updates);

    res.json({
      message: 'Vendor updated successfully',
      vendor: {
        id: vendor.id,
        storeName: vendor.name,
        contactEmail: vendor.email,
        category: 'general',
        subscriptionStatus: 'active',
        subscriptionTier: 'free',
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get admin dashboard stats
const getAdminStats = async (req, res) => {
  try {
    const totalVendors = await User.count({ where: { role: 'vendor' } });
    const totalUsers = await User.count({ where: { role: 'user' } });
    const totalDeals = await Deal.count();
    const activeDeals = await Deal.count({ where: { isActive: true } });

    res.json({
      vendors: {
        total: totalVendors,
        active: totalVendors,  // All vendors are considered active in SQLite version
        inactive: 0,
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
        total: 0,  // No payment system in SQLite version
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
