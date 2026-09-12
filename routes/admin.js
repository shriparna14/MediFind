const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Order = require('../models/Order');
const Reservation = require('../models/Reservation');
const Prescription = require('../models/Prescription');
const localDb = require('../utils/localDb');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// Apply admin protection to all routes in this file
router.use(protect);
router.use(authorize('admin'));

/**
 * @desc    Get central administrative platform analytics
 * @route   GET /api/admin/stats
 * @access  Private (Admin)
 */
router.get('/stats', async (req, res, next) => {
  try {
    if (localDb.isUsingMongo()) {
      const [
        totalUsers,
        totalPharmacies,
        approvedPharmacies,
        pendingPharmacies,
        totalMedicines,
        lowStockMedicinesCount,
        outOfStockMedicinesCount,
        totalReservations,
        completedReservations,
        activeReservations,
        totalOrders,
        emergencyOrders,
        activeDeliveries
      ] = await Promise.all([
        User.countDocuments({ role: 'customer' }),
        User.countDocuments({ role: 'pharmacy' }),
        User.countDocuments({ role: 'pharmacy', isApproved: true }),
        User.countDocuments({ role: 'pharmacy', isApproved: false }),
        Medicine.countDocuments({}),
        Medicine.countDocuments({ stock: { $lte: 10, $gt: 0 } }),
        Medicine.countDocuments({ stock: 0 }),
        Reservation.countDocuments({}),
        Reservation.countDocuments({ status: 'completed' }),
        Reservation.countDocuments({ status: { $in: ['pending', 'accepted', 'ready_for_pickup'] } }),
        Order.countDocuments({}),
        Order.countDocuments({ deliveryType: 'emergency' }),
        Order.countDocuments({ status: { $in: ['PLACED', 'PHARMACY_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } })
      ]);

      // Popular searched medicines
      const popularMedicines = await Medicine.find({})
        .sort({ searchCount: -1 })
        .limit(5)
        .select('name searchCount');

      const formattedPopular = popularMedicines.map(m => ({
        name: m.name,
        count: m.searchCount || 10
      }));

      // Pharmacy Analytics
      const pharmacies = await User.find({ role: 'pharmacy', isApproved: true }).lean();
      const pharmacyAnalytics = await Promise.all(
        pharmacies.map(async p => {
          const [invCount, resCount, ordCount] = await Promise.all([
            Medicine.countDocuments({ pharmacy: p._id }),
            Reservation.countDocuments({ pharmacyId: p._id }),
            Order.countDocuments({ pharmacyId: p._id })
          ]);
          return {
            id: p._id,
            shopName: p.shopName || p.name,
            address: p.address,
            inventoryCount: invCount,
            totalReservations: resCount,
            totalOrders: ordCount,
            rating: p.rating || 4.8
          };
        })
      );

      res.json({
        success: true,
        data: {
          totalUsers,
          totalPharmacies,
          approvedPharmacies,
          pendingPharmacies,
          totalMedicines,
          lowStockMedicinesCount,
          outOfStockMedicinesCount,
          totalSearches: 680,
          popularMedicines: formattedPopular,
          totalReservations,
          completedReservations,
          activeReservations,
          totalOrders,
          emergencyOrders,
          activeDeliveries,
          pharmacyAnalytics
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          totalUsers: 14,
          totalPharmacies: 6,
          approvedPharmacies: 5,
          pendingPharmacies: 1,
          totalMedicines: 48,
          lowStockMedicinesCount: 6,
          outOfStockMedicinesCount: 2,
          totalSearches: 420,
          popularMedicines: [
            { name: 'Dolo 650', count: 120 },
            { name: 'Pantocid 40', count: 95 },
            { name: 'Cetirizine 10mg', count: 80 }
          ],
          totalReservations: 18,
          completedReservations: 12,
          activeReservations: 4,
          totalOrders: 24,
          emergencyOrders: 6,
          activeDeliveries: 3,
          pharmacyAnalytics: []
        }
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * @desc    Get all pharmacies for admin
 * @route   GET /api/admin/pharmacies
 * @access  Private (Admin)
 */
router.get('/pharmacies', async (req, res, next) => {
  try {
    const pharmacies = await User.find({ role: 'pharmacy' }).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: pharmacies.length, data: pharmacies });
  } catch (err) {
    next(err);
  }
});

/**
 * @desc    Approve pharmacy license
 * @route   PUT /api/admin/pharmacies/:id/approve
 * @access  Private (Admin)
 */
router.put('/pharmacies/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pharmacy = await User.findByIdAndUpdate(id, { isApproved: true }, { new: true });
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: 'Pharmacy not found.' });
    }

    await logAudit('PHARMACY_APPROVED', {
      targetId: id,
      targetModel: 'User',
      details: { shopName: pharmacy.shopName, license: pharmacy.license }
    }, req);

    res.json({ success: true, message: `License approved for ${pharmacy.shopName || pharmacy.name}.`, data: pharmacy });
  } catch (err) {
    next(err);
  }
});

/**
 * @desc    Delete pharmacy and its medicines permanently
 * @route   DELETE /api/admin/pharmacies/:id
 * @access  Private (Admin)
 */
router.delete('/pharmacies/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await Promise.all([
      User.findByIdAndDelete(id),
      Medicine.deleteMany({ pharmacy: id })
    ]);

    await logAudit('PHARMACY_REJECTED', {
      targetId: id,
      targetModel: 'User'
    }, req);

    res.json({ success: true, message: 'Pharmacy and associated catalog records removed.' });
  } catch (err) {
    next(err);
  }
});

/**
 * @desc    Get all customer users
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find({ role: 'customer' }).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
});

/**
 * @desc    Delete customer user profile
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin)
 */
router.delete('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ success: true, message: 'User account removed.' });
  } catch (err) {
    next(err);
  }
});

/**
 * @desc    Get live delivery dispatches monitor
 * @route   GET /api/admin/deliveries
 * @access  Private (Admin)
 */
router.get('/deliveries', async (req, res, next) => {
  try {
    const deliveries = await Order.find({})
      .populate('pharmacyId', 'shopName address latitude longitude')
      .populate('userId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(30);

    const formatted = deliveries.map(d => ({
      ...d.toObject(),
      pharmacy: d.pharmacyId
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
