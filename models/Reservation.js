const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  pickupCode: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'ready_for_pickup', 'completed', 'expired', 'cancelled'],
    default: 'pending',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

reservationSchema.index({ userId: 1, createdAt: -1 });
reservationSchema.index({ pharmacyId: 1, status: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
