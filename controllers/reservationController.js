const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const Notification = require('../models/Notification');
const localDb = require('../utils/localDb');
const { logAudit } = require('../utils/auditLogger');

/**
 * Generate unique 6-character alphanumeric pickup code
 */
const generatePickupCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MED-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * @desc    Create a 30-minute hold reservation with MongoDB transaction
 * @route   POST /api/reservations
 * @access  Private (Customer)
 */
const createReservation = async (req, res, next) => {
  let session = null;
  if (localDb.isUsingMongo()) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (e) {
      session = null;
    }
  }

  try {
    const { medicineId, quantity = 1 } = req.body;
    const userId = req.user.id || req.user._id;

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      if (session) await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
    }

    let medicine = null;
    if (localDb.isUsingMongo()) {
      medicine = session
        ? await Medicine.findById(medicineId).session(session)
        : await Medicine.findById(medicineId);
    } else {
      medicine = await localDb.Medicine.findById(medicineId);
    }

    if (!medicine) {
      if (session) await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    if (medicine.isExpired) {
      if (session) await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Cannot reserve expired medicine.' });
    }

    if (medicine.stock < qty) {
      if (session) await session.abortTransaction();
      return res.status(409).json({
        success: false,
        status: 409,
        message: `Insufficient stock to hold. Available: ${medicine.stock}, requested: ${qty}.`
      });
    }

    // Atomically decrement stock
    if (session) {
      medicine.stock -= qty;
      await medicine.save({ session });
    } else if (localDb.isUsingMongo()) {
      const updated = await Medicine.findOneAndUpdate(
        { _id: medicineId, stock: { $gte: qty }, isExpired: false },
        { $inc: { stock: -qty } },
        { new: true }
      );
      if (!updated) {
        return res.status(409).json({
          success: false,
          status: 409,
          message: 'Stock was claimed by another customer moments ago. Please refresh.'
        });
      }
      medicine.stock = updated.stock;
    } else {
      medicine.stock -= qty;
      await localDb.Medicine.update(medicineId, { stock: medicine.stock });
    }

    const pickupCode = generatePickupCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minute hold

    const reservationData = {
      userId,
      pharmacyId: medicine.pharmacy,
      medicineId: medicine._id || medicine.id,
      quantity: qty,
      pickupCode,
      status: 'pending',
      expiresAt
    };

    let reservation = null;
    if (localDb.isUsingMongo()) {
      if (session) {
        const created = await Reservation.create([reservationData], { session });
        reservation = created[0];
        await session.commitTransaction();
      } else {
        reservation = await Reservation.create(reservationData);
      }
    } else {
      reservation = await localDb.Reservation.create(reservationData);
    }

    const populated = await Reservation.findById(reservation._id || reservation.id)
      .populate('pharmacyId', 'shopName address phone')
      .populate('medicineId', 'name genericName price strength')
      .populate('userId', 'name phone');

    // Notify pharmacy via Socket.io
    const io = req.app.get('socketio');
    if (io) {
      io.to(String(medicine.pharmacy)).emit('new_reservation', populated || reservation);
      io.emit('stock_update', { medicineId: medicine._id, stock: medicine.stock });
    }

    if (localDb.isUsingMongo()) {
      await Notification.create({
        userId: medicine.pharmacy,
        title: '📋 New 30-Min Pickup Hold',
        message: `Pickup Code: ${pickupCode} for ${medicine.name} (Qty: ${qty})`,
        type: 'RESERVATION',
        referenceId: reservation._id,
        referenceModel: 'Reservation'
      });
    }

    await logAudit('RESERVATION_CREATED', {
      userId,
      pharmacyId: medicine.pharmacy,
      targetId: reservation._id || reservation.id,
      targetModel: 'Reservation',
      details: { pickupCode, quantity: qty, medicineName: medicine.name }
    }, req);

    res.status(201).json({
      success: true,
      message: 'Reservation confirmed! Stock held for 30 minutes.',
      data: populated || reservation
    });
  } catch (err) {
    if (session) {
      try {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
      } catch (abortErr) {
        // ignore abort errors
      }
    }

    // Check if error is WriteConflict, VersionError, or concurrency contention
    if (
      err.name === 'VersionError' ||
      err.code === 112 ||
      (err.errorLabels && (err.errorLabels.includes('TransientTransactionError') || err.errorLabels.includes('UnknownTransactionCommitResult')))
    ) {
      return res.status(409).json({
        success: false,
        status: 409,
        message: 'Item stock contention. The medicine was just claimed by another customer.'
      });
    }

    next(err);
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch (e) {}
    }
  }
};

/**
 * @desc    Get user's reservations
 * @route   GET /api/reservations/my
 * @access  Private (Customer)
 */
const getMyReservations = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (localDb.isUsingMongo()) {
      const reservations = await Reservation.find({ userId })
        .populate('pharmacyId', 'shopName address phone rating')
        .populate('medicineId', 'name genericName price dosageForm strength')
        .sort({ createdAt: -1 });

      res.json({ success: true, count: reservations.length, data: reservations });
    } else {
      const reservations = (await localDb.Reservation.find({ userId })) || [];
      res.json({ success: true, count: reservations.length, data: reservations });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get pharmacy's hold reservations queue
 * @route   GET /api/reservations/pharmacy
 * @access  Private (Pharmacy)
 */
const getPharmacyReservations = async (req, res, next) => {
  try {
    const pharmacyId = req.user.id || req.user._id;

    if (localDb.isUsingMongo()) {
      const reservations = await Reservation.find({ pharmacyId })
        .populate('userId', 'name phone email')
        .populate('medicineId', 'name genericName price strength')
        .sort({ createdAt: -1 });

      res.json({ success: true, count: reservations.length, data: reservations });
    } else {
      const reservations = (await localDb.Reservation.find({ pharmacyId })) || [];
      res.json({ success: true, count: reservations.length, data: reservations });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update reservation status (e.g. accepted, ready, completed, cancelled)
 * @route   PUT /api/reservations/:id/status
 * @access  Private (Pharmacy)
 */
const updateReservationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'accepted', 'ready_for_pickup', 'completed', 'expired', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid reservation status.' });
    }

    let reservation = null;
    if (localDb.isUsingMongo()) {
      reservation = await Reservation.findById(id);
      if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found.' });
      }

      // If cancelled or expired, return stock back to medicine
      if ((status === 'cancelled' || status === 'expired') && reservation.status !== status) {
        const med = await Medicine.findById(reservation.medicineId);
        if (med) {
          med.stock += reservation.quantity;
          await med.save();
        }
      }

      reservation.status = status;
      await reservation.save();
    } else {
      reservation = await localDb.Reservation.findById(id);
      if (reservation) reservation.status = status;
    }

    const populated = await Reservation.findById(id)
      .populate('pharmacyId', 'shopName address phone')
      .populate('medicineId', 'name genericName price strength')
      .populate('userId', 'name phone');

    // Notify user via Socket.io
    const io = req.app.get('socketio');
    if (io && populated) {
      io.to(String(populated.userId._id || populated.userId)).emit('reservation_status', {
        reservationId: reservation._id,
        status,
        reservation: populated
      });
    }

    await logAudit(`RESERVATION_${status.toUpperCase()}`, {
      targetId: id,
      targetModel: 'Reservation',
      details: { status }
    }, req);

    res.json({
      success: true,
      message: `Reservation status updated to ${status}`,
      data: populated || reservation
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createReservation,
  getMyReservations,
  getPharmacyReservations,
  updateReservationStatus
};
