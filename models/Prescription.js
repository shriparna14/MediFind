const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
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
  imageUrl: {
    type: String,
    required: true
  },
  publicId: {
    type: String
  },
  fileType: {
    type: String,
    enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    default: 'image/jpeg'
  },
  fileSize: {
    type: Number
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  rejectionReason: {
    type: String
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

prescriptionSchema.index({ userId: 1, createdAt: -1 });
prescriptionSchema.index({ pharmacyId: 1, status: 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
