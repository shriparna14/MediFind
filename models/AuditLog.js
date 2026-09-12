const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'USER_REGISTER',
      'USER_LOGIN',
      'ADMIN_LOGIN',
      'PHARMACY_APPROVED',
      'PHARMACY_REJECTED',
      'MEDICINE_CREATED',
      'MEDICINE_UPDATED',
      'MEDICINE_DELETED',
      'STOCK_UPDATED',
      'RESERVATION_CREATED',
      'RESERVATION_ACCEPTED',
      'RESERVATION_READY',
      'RESERVATION_COMPLETED',
      'RESERVATION_EXPIRED',
      'ORDER_CREATED',
      'ORDER_STATUS_CHANGED',
      'PRESCRIPTION_UPLOADED',
      'PRESCRIPTION_APPROVED',
      'PRESCRIPTION_REJECTED',
      'REVIEW_POSTED'
    ]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetModel: {
    type: String
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ pharmacyId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
