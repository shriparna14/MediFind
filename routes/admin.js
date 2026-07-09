const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Order = require('../models/Order');
const SearchLog = require('../models/SearchLog');
const { protect, authorize } = require('../middleware/auth');

// Apply admin access control to all routes below
router.use(protect, authorize('admin'));

// @desc    Get dashboard metrics & analytics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalPharmacies = await User.countDocuments({ role: 'pharmacy' });
    const totalMedicines = await Medicine.countDocuments();
    
    // Popular medicines searched
    const searchLogs = await SearchLog.find({});
    // Group and sort search logs
    const popularMedicines = searchLogs
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(log => ({ name: log.medicineName, count: log.count }));

    // Active deliveries count
    const activeDeliveries = await Order.countDocuments({
      deliveryType: 'emergency',
      status: { $in: ['pending', 'accepted', 'out-for-delivery'] }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalPharmacies,
        totalMedicines,
        activeDeliveries,
        popularMedicines
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving analytics' });
  }
});

// @desc    Get all pharmacies (approved and pending)
// @route   GET /api/admin/pharmacies
// @access  Private (Admin only)
router.get('/pharmacies', async (req, res) => {
  try {
    const pharmacies = await User.find({ role: 'pharmacy' });
    
    const cleaned = pharmacies.map(p => ({
      id: p._id || p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      address: p.address,
      shopName: p.shopName,
      license: p.license,
      isApproved: p.isApproved,
      latitude: p.latitude,
      longitude: p.longitude,
      createdAt: p.createdAt
    }));

    res.json({ success: true, count: cleaned.length, data: cleaned });
  } catch (error) {
    console.error('Admin get pharmacies error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Approve a pharmacy license
// @route   PUT /api/admin/pharmacies/:id/approve
// @access  Private (Admin only)
router.put('/pharmacies/:id/approve', async (req, res) => {
  try {
    const pharmacy = await User.findById(req.params.id);
    if (!pharmacy || pharmacy.role !== 'pharmacy') {
      return res.status(404).json({ success: false, message: 'Pharmacy not found' });
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );

    res.json({
      success: true,
      message: `${updated.shopName || updated.name} has been approved successfully!`,
      data: {
        id: updated._id,
        isApproved: true
      }
    });
  } catch (error) {
    console.error('Approve pharmacy error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Remove/Reject a pharmacy
// @route   DELETE /api/admin/pharmacies/:id
// @access  Private (Admin only)
router.delete('/pharmacies/:id', async (req, res) => {
  try {
    const pharmacy = await User.findById(req.params.id);
    if (!pharmacy || pharmacy.role !== 'pharmacy') {
      return res.status(404).json({ success: false, message: 'Pharmacy not found' });
    }

    // Optional: Delete all medicines owned by this pharmacy
    await Medicine.deleteOne({ pharmacyId: req.params.id });
    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Pharmacy license rejected and record removed.' });
  } catch (error) {
    console.error('Delete pharmacy error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get all customers/users
// @route   GET /api/admin/users
// @access  Private (Admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'customer' });
    const cleaned = users.map(u => ({
      id: u._id || u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      address: u.address,
      createdAt: u.createdAt
    }));

    res.json({ success: true, count: cleaned.length, data: cleaned });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Delete a customer user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'admin') {
      return res.status(404).json({ success: false, message: 'User not found or cannot be deleted' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User profile deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Monitor active delivery requests
// @route   GET /api/admin/deliveries
// @access  Private (Admin only)
router.get('/deliveries', async (req, res) => {
  try {
    const activeOrders = await Order.find({ deliveryType: 'emergency' });

    const enriched = await Promise.all(
      activeOrders.map(async (ord) => {
        const customer = await User.findById(ord.userId);
        const pharmacy = await User.findById(ord.pharmacyId);
        const ordObj = { ...ord };
        if (customer) {
          ordObj.customer = {
            name: customer.name,
            phone: customer.phone,
            address: customer.address
          };
        }
        if (pharmacy) {
          ordObj.pharmacy = {
            shopName: pharmacy.shopName,
            address: pharmacy.address,
            phone: pharmacy.phone,
            latitude: pharmacy.latitude,
            longitude: pharmacy.longitude
          };
        }
        return ordObj;
      })
    );

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    console.error('Admin deliveries lookup error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving delivery tracking status' });
  }
});

module.exports = router;
