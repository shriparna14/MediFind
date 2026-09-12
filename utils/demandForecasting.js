const Order = require('../models/Order');
const Reservation = require('../models/Reservation');
const Medicine = require('../models/Medicine');
const localDb = require('./localDb');

/**
 * Demand Forecasting Utility
 * Computes daily sales velocity and restock recommendations from order transactions
 * without claiming machine learning.
 */
const calculateDemandForecast = async (pharmacyId = null) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const filter = pharmacyId ? { pharmacy: pharmacyId } : {};

    let medicines = [];
    if (localDb.isUsingMongo()) {
      medicines = await Medicine.find(filter).lean();
    } else {
      medicines = (await localDb.Medicine.find(filter)) || [];
    }

    // Aggregate orders in last 30 days
    let orders = [];
    let reservations = [];
    if (localDb.isUsingMongo()) {
      orders = await Order.find({
        createdAt: { $gte: thirtyDaysAgo },
        status: { $ne: 'CANCELLED' }
      }).lean();

      reservations = await Reservation.find({
        createdAt: { $gte: thirtyDaysAgo },
        status: { $in: ['accepted', 'ready_for_pickup', 'completed'] }
      }).lean();
    } else {
      orders = (await localDb.Order.find({})) || [];
      reservations = (await localDb.Reservation.find({})) || [];
    }

    const demandMap = {};

    // Count order quantities
    orders.forEach(ord => {
      (ord.items || []).forEach(item => {
        const mId = String(item.medicineId || item.medicine);
        demandMap[mId] = (demandMap[mId] || 0) + Number(item.quantity || 1);
      });
    });

    // Count reservation quantities
    reservations.forEach(resrv => {
      const mId = String(resrv.medicineId || resrv.medicine);
      demandMap[mId] = (demandMap[mId] || 0) + Number(resrv.quantity || 1);
    });

    const results = medicines.map(med => {
      const medId = String(med._id || med.id);
      const totalUnitsSold = demandMap[medId] || 0;
      const dailySalesVelocity = Number((totalUnitsSold / 30).toFixed(2));
      const currentStock = Number(med.stock || 0);

      // Days until stockout
      let daysUntilStockout = 999;
      if (dailySalesVelocity > 0) {
        daysUntilStockout = Math.ceil(currentStock / dailySalesVelocity);
      } else if (currentStock === 0) {
        daysUntilStockout = 0;
      }

      // 14-day safety restock target
      const targetCoverDays = 14;
      const targetStock = Math.ceil(dailySalesVelocity * targetCoverDays) + 10;
      const suggestedReorderQuantity = Math.max(0, targetStock - currentStock);

      let urgency = 'NORMAL';
      if (daysUntilStockout <= 3 || currentStock === 0) {
        urgency = 'CRITICAL';
      } else if (daysUntilStockout <= 7 || currentStock <= (med.lowStockThreshold || 10)) {
        urgency = 'HIGH';
      }

      return {
        medicineId: medId,
        name: med.name,
        genericName: med.genericName,
        category: med.category,
        currentStock,
        totalUnitsSold30d: totalUnitsSold,
        dailySalesVelocity,
        daysUntilStockout,
        suggestedReorderQuantity,
        urgency
      };
    });

    // Sort by most urgent first
    return results.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
  } catch (err) {
    console.error('Demand forecasting calculation error:', err);
    return [];
  }
};

module.exports = { calculateDemandForecast };
