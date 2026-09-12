const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Reservation = require('../models/Reservation');
const Order = require('../models/Order');
const Prescription = require('../models/Prescription');
const localDb = require('../utils/localDb');
const { calculateDistance } = require('../utils/distance');
const { calculateDemandForecast } = require('../utils/demandForecasting');

/**
 * @desc    Get nearby approved pharmacies with live inventory counts
 * @route   GET /api/pharmacies/nearby
 * @access  Public
 */
const getNearbyPharmacies = async (req, res, next) => {
  try {
    const { lat = 12.9716, lng = 77.5946, radius = 25, emergency = 'false' } = req.query;

    const userLat = Number(lat);
    const userLng = Number(lng);
    const maxRadius = Number(radius);

    let pharmacies = [];

    if (localDb.isUsingMongo()) {
      pharmacies = await User.find({ role: 'pharmacy', isApproved: true })
        .select('-password')
        .lean();
    } else {
      pharmacies = (await localDb.User.find({ role: 'pharmacy', isApproved: true })) || [];
    }

    const results = [];

    for (const p of pharmacies) {
      const pLat = Number(p.latitude || 12.9716);
      const pLng = Number(p.longitude || 77.5946);
      const distance = calculateDistance(userLat, userLng, pLat, pLng);

      if (distance <= maxRadius) {
        let medicineCount = 0;
        if (localDb.isUsingMongo()) {
          medicineCount = await Medicine.countDocuments({ pharmacy: p._id || p.id, stock: { $gt: 0 } });
        }

        results.push({
          ...p,
          id: p._id || p.id,
          distance: Number(distance.toFixed(1)),
          medicineCount
        });
      }
    }

    // Sort by distance ascending
    results.sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Compare availability, price, and distance of a medicine across all pharmacies
 * @route   GET /api/pharmacies/compare
 * @access  Public
 */
const compareMedicineAcrossPharmacies = async (req, res, next) => {
  try {
    const { name, lat = 12.9716, lng = 77.5946 } = req.query;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Medicine name query parameter is required.' });
    }

    const regex = new RegExp(name.trim(), 'i');

    let matchingMedicines = [];
    if (localDb.isUsingMongo()) {
      matchingMedicines = await Medicine.find({
        $or: [{ name: regex }, { genericName: regex }]
      })
        .populate('pharmacy', 'shopName name address latitude longitude rating reviewCount phone openingHours isApproved')
        .lean();
    } else {
      const allMeds = (await localDb.Medicine.find({})) || [];
      const allUsers = (await localDb.User.find({})) || [];
      const userMap = new Map(allUsers.map(u => [String(u._id || u.id), u]));
      matchingMedicines = allMeds
        .filter(m => regex.test(m.name) || regex.test(m.genericName))
        .map(m => ({
          ...m,
          pharmacy: userMap.get(String(m.pharmacy)) || {}
        }));
    }

    const comparisonList = matchingMedicines
      .filter(m => m.pharmacy && m.pharmacy.isApproved !== false)
      .map(m => {
        const pLat = Number(m.pharmacy.latitude || 12.9716);
        const pLng = Number(m.pharmacy.longitude || 77.5946);
        const distance = calculateDistance(Number(lat), Number(lng), pLat, pLng);

        return {
          medicineId: m._id || m.id,
          name: m.name,
          genericName: m.genericName,
          dosageForm: m.dosageForm,
          strength: m.strength,
          price: m.price,
          discount: m.discount,
          stock: m.stock,
          inStock: m.stock > 0,
          pharmacy: {
            id: m.pharmacy._id || m.pharmacy.id,
            shopName: m.pharmacy.shopName || m.pharmacy.name,
            address: m.pharmacy.address,
            phone: m.pharmacy.phone,
            rating: m.pharmacy.rating || 4.5,
            reviewCount: m.pharmacy.reviewCount || 0,
            openingHours: m.pharmacy.openingHours || '8:00 AM - 11:00 PM',
            distance: Number(distance.toFixed(1))
          }
        };
      });

    // Default sort: in stock first, then distance
    comparisonList.sort((a, b) => {
      if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
      return a.pharmacy.distance - b.pharmacy.distance;
    });

    res.json({
      success: true,
      medicineQueried: name,
      count: comparisonList.length,
      data: comparisonList
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get pharmacy inventory with pagination and filters
 * @route   GET /api/pharmacies/:id/inventory
 * @access  Public
 */
const getPharmacyInventory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, filter = 'all' } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    let query = { pharmacy: id };
    if (filter === 'low_stock') {
      query.stock = { $lte: 10, $gt: 0 };
    } else if (filter === 'out_of_stock') {
      query.stock = 0;
    }

    let medicines = [];
    let total = 0;

    if (localDb.isUsingMongo()) {
      total = await Medicine.countDocuments(query);
      medicines = await Medicine.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);
    } else {
      medicines = (await localDb.Medicine.find({ pharmacy: id })) || [];
      total = medicines.length;
    }

    res.json({
      success: true,
      count: medicines.length,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
      data: medicines
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get pharmacy operational stats
 * @route   GET /api/pharmacies/stats
 * @access  Private (Pharmacy)
 */
const getPharmacyStats = async (req, res, next) => {
  try {
    const pharmacyId = req.user.id || req.user._id;

    if (localDb.isUsingMongo()) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [totalInventory, todayReservations, emergencyOrders, pendingPrescriptions] = await Promise.all([
        Medicine.countDocuments({ pharmacy: pharmacyId }),
        Reservation.countDocuments({ pharmacyId, createdAt: { $gte: todayStart } }),
        Order.countDocuments({ pharmacyId, deliveryType: 'emergency', status: { $ne: 'DELIVERED' } }),
        Prescription.countDocuments({ pharmacyId, status: 'pending' })
      ]);

      res.json({
        success: true,
        data: {
          totalInventoryItems: totalInventory,
          todayReservations,
          emergencyOrders,
          pendingPrescriptions
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          totalInventoryItems: 25,
          todayReservations: 3,
          emergencyOrders: 1,
          pendingPrescriptions: 2
        }
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get pharmacy demand forecast and restock calculations
 * @route   GET /api/pharmacies/demand-prediction
 * @access  Private (Pharmacy)
 */
const getDemandPrediction = async (req, res, next) => {
  try {
    const pharmacyId = req.user.id || req.user._id;
    const forecast = await calculateDemandForecast(pharmacyId);

    res.json({
      success: true,
      count: forecast.length,
      data: forecast
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all approved pharmacies
 * @route   GET /api/pharmacies
 * @access  Public
 */
const getAllPharmacies = async (req, res, next) => {
  try {
    if (localDb.isUsingMongo()) {
      const pharmacies = await User.find({ role: 'pharmacy', isApproved: true })
        .select('name shopName address latitude longitude phone openingHours rating reviewCount')
        .sort({ shopName: 1 });

      res.json({ success: true, count: pharmacies.length, data: pharmacies });
    } else {
      const pharmacies = (await localDb.User.find({ role: 'pharmacy', isApproved: true })) || [];
      res.json({ success: true, count: pharmacies.length, data: pharmacies });
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNearbyPharmacies,
  compareMedicineAcrossPharmacies,
  getPharmacyInventory,
  getPharmacyStats,
  getDemandPrediction,
  getAllPharmacies
};
