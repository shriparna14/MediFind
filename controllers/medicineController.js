const Medicine = require('../models/Medicine');
const User = require('../models/User');
const localDb = require('../utils/localDb');
const { calculateDistance } = require('../utils/distance');
const { logAudit } = require('../utils/auditLogger');

/**
 * @desc    Search medicines with filters, pagination, and populate optimization (N+1 query fix)
 * @route   GET /api/medicines/search
 * @access  Public
 */
const searchMedicines = async (req, res, next) => {
  try {
    const {
      keyword = '',
      category = '',
      minPrice,
      maxPrice,
      inStockOnly = 'false',
      sortBy = '',
      userLat = 12.9716,
      userLng = 77.5946,
      page = 1,
      limit = 50
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    let medicines = [];
    let totalCount = 0;

    if (localDb.isUsingMongo()) {
      const query = {};

      if (category && category !== 'All') {
        query.category = category;
      }

      if (inStockOnly === 'true') {
        query.stock = { $gt: 0 };
      }

      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
      }

      if (keyword && keyword.trim()) {
        const regex = new RegExp(keyword.trim(), 'i');
        query.$or = [
          { name: regex },
          { genericName: regex },
          { brand: regex },
          { alternatives: regex }
        ];

        // Increment search count for popular searches analytics
        await Medicine.updateMany({ name: regex }, { $inc: { searchCount: 1 } });
      }

      // Populate pharmacy in a single optimized query (Fixing N+1 issue)
      const rawMedicines = await Medicine.find(query)
        .populate('pharmacy', 'name shopName address latitude longitude rating reviewCount phone openingHours isApproved')
        .lean();

      // Filter for approved pharmacies only
      let approvedMedicines = rawMedicines.filter(m => m.pharmacy && m.pharmacy.isApproved !== false);

      // Attach distance
      approvedMedicines = approvedMedicines.map(m => {
        const pLat = Number(m.pharmacy.latitude || 12.9716);
        const pLng = Number(m.pharmacy.longitude || 77.5946);
        const dist = calculateDistance(Number(userLat), Number(userLng), pLat, pLng);
        return {
          ...m,
          pharmacy: {
            ...m.pharmacy,
            distance: Number(dist.toFixed(1))
          }
        };
      });

      // Sorting
      if (sortBy === 'price_asc' || sortBy === 'cheapest') {
        approvedMedicines.sort((a, b) => a.price - b.price);
      } else if (sortBy === 'price_desc') {
        approvedMedicines.sort((a, b) => b.price - a.price);
      } else if (sortBy === 'rating' || sortBy === 'highest_rated') {
        approvedMedicines.sort((a, b) => (b.pharmacy.rating || 0) - (a.pharmacy.rating || 0));
      } else if (sortBy === 'best_match') {
        approvedMedicines.sort((a, b) => {
          const scoreA = (100 - ((a.pharmacy.distance || 0) * 3) - (a.price * 0.1) + (((a.pharmacy.rating || 4)) * 5));
          const scoreB = (100 - ((b.pharmacy.distance || 0) * 3) - (b.price * 0.1) + (((b.pharmacy.rating || 4)) * 5));
          return scoreB - scoreA;
        });
      } else if (sortBy === 'stock') {
        approvedMedicines.sort((a, b) => b.stock - a.stock);
      } else {
        // Default: nearest distance first
        approvedMedicines.sort((a, b) => (a.pharmacy.distance || 0) - (b.pharmacy.distance || 0));
      }

      totalCount = approvedMedicines.length;
      medicines = approvedMedicines.slice(skip, skip + limitNum);
    } else {
      let allMeds = (await localDb.Medicine.find({})) || [];
      const allUsers = (await localDb.User.find({})) || [];
      const userMap = new Map(allUsers.map(u => [String(u._id || u.id), u]));
      allMeds = allMeds.map(m => {
        const ph = userMap.get(String(m.pharmacy)) || {};
        const pLat = Number(ph?.latitude || 12.9716);
        const pLng = Number(ph?.longitude || 77.5946);
        const dist = calculateDistance(Number(userLat), Number(userLng), pLat, pLng);
        return {
          ...m,
          pharmacy: { ...ph, distance: Number(dist.toFixed(1)) }
        };
      });

      if (category && category !== 'All') {
        allMeds = allMeds.filter(m => m.category === category);
      }
      if (keyword && keyword.trim()) {
        const regex = new RegExp(keyword.trim(), 'i');
        allMeds = allMeds.filter(m => regex.test(m.name) || regex.test(m.genericName) || regex.test(m.brand));
      }

      totalCount = allMeds.length;
      medicines = allMeds.slice(skip, skip + limitNum);
    }

    // Generic alternatives suggestion lookup
    let alternatives = [];
    if (keyword && medicines.length > 0 && medicines[0].genericName) {
      const gName = medicines[0].genericName;
      if (localDb.isUsingMongo()) {
        const altMeds = await Medicine.find({
          genericName: new RegExp(gName, 'i'),
          name: { $ne: medicines[0].name },
          stock: { $gt: 0 }
        })
          .populate('pharmacy', 'shopName address')
          .limit(4)
          .lean();

        alternatives = altMeds.map(a => ({
          id: a._id,
          name: a.name,
          genericName: a.genericName,
          price: a.price,
          pharmacyName: a.pharmacy?.shopName || 'Partner Pharmacy'
        }));
      }
    }

    res.json({
      success: true,
      count: medicines.length,
      pagination: {
        total: totalCount,
        page: pageNum,
        pages: Math.ceil(totalCount / limitNum),
        limit: limitNum
      },
      data: medicines,
      alternatives
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single medicine details
 * @route   GET /api/medicines/:id
 * @access  Public
 */
const getMedicineById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let medicine = null;

    if (localDb.isUsingMongo()) {
      medicine = await Medicine.findById(id).populate('pharmacy', 'shopName address phone rating reviewCount');
    } else {
      medicine = await localDb.Medicine.findById(id);
      if (medicine) {
        medicine.pharmacy = await localDb.User.findById(medicine.pharmacy);
      }
    }

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    res.json({ success: true, data: medicine });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new medicine (Pharmacy owner)
 * @route   POST /api/medicines
 * @access  Private (Pharmacy)
 */
const createMedicine = async (req, res, next) => {
  try {
    const pharmacyId = req.user.id || req.user._id;

    const medicineData = {
      ...req.body,
      pharmacy: pharmacyId,
      price: Number(req.body.price),
      discount: Number(req.body.discount || 0),
      stock: Number(req.body.stock || 0),
      lowStockThreshold: Number(req.body.lowStockThreshold || 10),
      expiryDate: new Date(req.body.expiryDate || '2028-12-31')
    };

    let medicine = null;
    if (localDb.isUsingMongo()) {
      medicine = await Medicine.create(medicineData);
    } else {
      medicine = await localDb.Medicine.create(medicineData);
    }

    await logAudit('MEDICINE_CREATED', {
      pharmacyId,
      targetId: medicine._id || medicine.id,
      targetModel: 'Medicine',
      details: { name: medicine.name, stock: medicine.stock, price: medicine.price }
    }, req);

    res.status(201).json({
      success: true,
      message: 'Medicine added to pharmacy inventory successfully!',
      data: medicine
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update medicine stock and details (Pharmacy owner)
 * @route   PUT /api/medicines/:id
 * @access  Private (Pharmacy)
 */
const updateMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pharmacyId = req.user.id || req.user._id;

    let medicine = null;
    if (localDb.isUsingMongo()) {
      medicine = await Medicine.findOne({ _id: id, pharmacy: pharmacyId });
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found or unauthorized.' });
      }

      Object.assign(medicine, req.body);
      if (req.body.stock !== undefined) medicine.stock = Number(req.body.stock);
      if (req.body.price !== undefined) medicine.price = Number(req.body.price);

      await medicine.save();
    } else {
      medicine = await localDb.Medicine.findById(id);
      if (medicine) {
        Object.assign(medicine, req.body);
      }
    }

    // Broadcast stock update via Socket.IO if attached to req.app
    const io = req.app.get('socketio');
    if (io) {
      io.emit('stock_update', { medicineId: id, stock: medicine.stock });
    }

    await logAudit('STOCK_UPDATED', {
      pharmacyId,
      targetId: id,
      targetModel: 'Medicine',
      details: { newStock: medicine.stock }
    }, req);

    res.json({
      success: true,
      message: 'Medicine inventory updated successfully!',
      data: medicine
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete medicine (Pharmacy owner)
 * @route   DELETE /api/medicines/:id
 * @access  Private (Pharmacy)
 */
const deleteMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pharmacyId = req.user.id || req.user._id;

    if (localDb.isUsingMongo()) {
      const result = await Medicine.findOneAndDelete({ _id: id, pharmacy: pharmacyId });
      if (!result) {
        return res.status(404).json({ success: false, message: 'Medicine not found or unauthorized.' });
      }
    } else {
      await localDb.Medicine.findByIdAndDelete(id);
    }

    await logAudit('MEDICINE_DELETED', {
      pharmacyId,
      targetId: id,
      targetModel: 'Medicine'
    }, req);

    res.json({ success: true, message: 'Medicine deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  searchMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine
};
