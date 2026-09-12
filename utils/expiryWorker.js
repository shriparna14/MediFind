const Reservation = require('../models/Reservation');
const Medicine = require('../models/Medicine');
const localDb = require('./localDb');
const { logAudit } = require('./auditLogger');

/**
 * Expiry Worker
 * Releases stock from expired reservations (>30 mins) back to active inventory
 */
const checkAndReleaseExpiredReservations = async (io = null) => {
  try {
    const now = new Date();

    if (localDb.isUsingMongo()) {
      const expiredReservations = await Reservation.find({
        status: { $in: ['pending', 'accepted', 'ready_for_pickup'] },
        expiresAt: { $lt: now }
      });

      for (const resrv of expiredReservations) {
        resrv.status = 'expired';
        await resrv.save();

        // Release stock back
        const med = await Medicine.findById(resrv.medicineId);
        if (med) {
          med.stock += resrv.quantity;
          await med.save();

          if (io) {
            io.emit('stock_update', { medicineId: med._id, stock: med.stock });
            io.to(String(resrv.userId)).emit('reservation_status', {
              reservationId: resrv._id,
              status: 'expired',
              message: 'Reservation hold time has expired. Stock has been returned to pharmacy inventory.'
            });
          }
        }

        await logAudit('RESERVATION_EXPIRED', {
          targetId: resrv._id,
          targetModel: 'Reservation',
          pharmacyId: resrv.pharmacyId,
          details: { releasedQuantity: resrv.quantity }
        });
      }
    } else {
      const reservations = (await localDb.Reservation.find({})) || [];
      for (const r of reservations) {
        if (
          ['pending', 'accepted', 'ready_for_pickup'].includes(r.status) &&
          new Date(r.expiresAt).getTime() < now.getTime()
        ) {
          r.status = 'expired';
          const med = await localDb.Medicine.findById(r.medicineId);
          if (med) {
            med.stock = Number(med.stock) + Number(r.quantity);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Expiry Worker Error]:', err.message);
  }
};

module.exports = { checkAndReleaseExpiredReservations };
