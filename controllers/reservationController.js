const Reservation = require('../models/Reservation');
const Medicine = require('../models/Medicine');
const User = require('../models/User');

// @desc    Reserve a medicine
// @route   POST /api/reservations
// @access  Private (Customer only)
exports.createReservation = async (req, res) => {
  try {
    const { medicineId, quantity } = req.body;
    const qty = Number(quantity || 1);

    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    if (medicine.stock < qty) {
      return res.status(400).json({ success: false, message: 'Insufficient stock available' });
    }

    // Deduct stock
    const newStock = medicine.stock - qty;
    await Medicine.findByIdAndUpdate(medicineId, { stock: newStock });

    // Create reservation
    const reservation = await Reservation.create({
      userId: req.user.id,
      medicineId,
      pharmacyId: medicine.pharmacyId,
      quantity: qty,
      status: 'pending'
    });

    // Enriched reservation object for response/socket
    const user = await User.findById(req.user.id);
    const pharmacy = await User.findById(medicine.pharmacyId);
    const resData = typeof reservation.toObject === 'function' ? reservation.toObject() : reservation;
    const reservationObj = {
      ...resData,
      id: resData.id || resData._id,
      medicine: {
        name: medicine.name,
        brand: medicine.brand,
        price: medicine.price,
        prescriptionRequired: medicine.prescriptionRequired
      },
      customer: {
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      pharmacy: {
        shopName: pharmacy.shopName,
        address: pharmacy.address,
        phone: pharmacy.phone
      }
    };

    // Socket.IO updates:
    const io = req.app.get('socketio');
    if (io) {
      // 1. Broadcast stock update to everyone
      io.emit('stock_update', {
        medicineId: medicine._id,
        medicineName: medicine.name,
        pharmacyId: medicine.pharmacyId,
        stock: newStock
      });
      // 2. Notify specific pharmacy about new reservation
      io.emit(`new_reservation_pharmacy_${medicine.pharmacyId}`, reservationObj);
    }

    res.status(201).json({ success: true, data: reservationObj });
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({ success: false, message: 'Server error creating reservation' });
  }
};

// @desc    Get customer's reservations
// @route   GET /api/reservations/my
// @access  Private (Customer only)
exports.getMyReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ userId: req.user.id });
    
    const enriched = await Promise.all(
      reservations.map(async (resrv) => {
        const medicine = await Medicine.findById(resrv.medicineId);
        const pharmacy = await User.findById(resrv.pharmacyId);
        const resrvData = typeof resrv.toObject === 'function' ? resrv.toObject() : resrv;
        const resrvObj = {
          ...resrvData,
          id: resrvData.id || resrvData._id
        };
        
        if (medicine) {
          resrvObj.medicine = {
            name: medicine.name,
            brand: medicine.brand,
            price: medicine.price,
            prescriptionRequired: medicine.prescriptionRequired
          };
        }
        if (pharmacy) {
          resrvObj.pharmacy = {
            shopName: pharmacy.shopName,
            address: pharmacy.address,
            phone: pharmacy.phone
          };
        }
        return resrvObj;
      })
    );

    // Sort by newest
    enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    console.error('Get my reservations error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving reservations' });
  }
};

// @desc    Get pharmacy's reservations
// @route   GET /api/reservations/pharmacy
// @access  Private (Pharmacy only)
exports.getPharmacyReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ pharmacyId: req.user.id });

    const enriched = await Promise.all(
      reservations.map(async (resrv) => {
        const medicine = await Medicine.findById(resrv.medicineId);
        const customer = await User.findById(resrv.userId);
        const resrvData = typeof resrv.toObject === 'function' ? resrv.toObject() : resrv;
        const resrvObj = {
          ...resrvData,
          id: resrvData.id || resrvData._id
        };

        if (medicine) {
          resrvObj.medicine = {
            name: medicine.name,
            brand: medicine.brand,
            price: medicine.price,
            prescriptionRequired: medicine.prescriptionRequired
          };
        }
        if (customer) {
          resrvObj.customer = {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address
          };
        }
        return resrvObj;
      })
    );

    // Sort by newest
    enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    console.error('Get pharmacy reservations error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving reservations' });
  }
};

// @desc    Update reservation status
// @route   PUT /api/reservations/:id/status
// @access  Private (Customer/Pharmacy)
exports.updateReservationStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted', 'completed', 'cancelled'
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    // Role Checks
    // Pharmacy can accept/complete/cancel
    // Customer can only cancel
    if (req.user.role === 'customer') {
      if (String(reservation.userId) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this reservation' });
      }
      if (status !== 'cancelled') {
        return res.status(400).json({ success: false, message: 'Customers can only cancel reservations' });
      }
    } else if (req.user.role === 'pharmacy') {
      if (String(reservation.pharmacyId) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this reservation' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const oldStatus = reservation.status;
    
    // Check if status state transition is valid
    if (oldStatus === 'cancelled' || oldStatus === 'completed') {
      return res.status(400).json({ success: false, message: `Reservation is already ${oldStatus}` });
    }

    // If cancelled, restore medicine stock
    if (status === 'cancelled') {
      const medicine = await Medicine.findById(reservation.medicineId);
      if (medicine) {
        const restoredStock = medicine.stock + reservation.quantity;
        await Medicine.findByIdAndUpdate(reservation.medicineId, { stock: restoredStock });

        // Stock update broadcast
        const io = req.app.get('socketio');
        if (io) {
          io.emit('stock_update', {
            medicineId: medicine._id,
            medicineName: medicine.name,
            pharmacyId: medicine.pharmacyId,
            stock: restoredStock
          });
        }
      }
    }

    const updated = await Reservation.findByIdAndUpdate(req.params.id, { status }, { new: true });
    
    // Socket notice to user or pharmacy
    const io = req.app.get('socketio');
    if (io) {
      // Notify customer about reservation status change
      io.emit(`reservation_status_user_${reservation.userId}`, {
        reservationId: reservation._id || reservation.id,
        status: status
      });
      // Notify pharmacy about status change
      io.emit(`reservation_status_pharmacy_${reservation.pharmacyId}`, {
        reservationId: reservation._id || reservation.id,
        status: status
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update reservation status error:', error);
    res.status(500).json({ success: false, message: 'Server error updating reservation' });
  }
};
