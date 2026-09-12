const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a medicine name'],
    trim: true,
    index: true
  },
  genericName: {
    type: String,
    trim: true,
    index: true
  },
  strength: {
    type: String,
    trim: true
  },
  dosageForm: {
    type: String,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Gel', 'Spray', 'Inhaler', 'Drops', 'Powder', 'Other'],
    default: 'Tablet'
  },
  manufacturer: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['Analgesic', 'Antibiotics', 'Gastrointestinal', 'Respiratory', 'Cardiovascular', 'Diabetes', 'Supplements', 'Rehydration', 'Dermatological', 'Anti-Allergic', 'Other'],
    default: 'Other',
    index: true
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  stock: {
    type: Number,
    required: [true, 'Please add stock quantity'],
    min: 0,
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  batchNumber: {
    type: String,
    trim: true,
    default: 'BATCH-2026-B1'
  },
  manufacturingDate: {
    type: Date,
    default: () => new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  },
  expiryDate: {
    type: Date,
    required: [true, 'Please add an expiry date']
  },
  prescriptionRequired: {
    type: Boolean,
    default: false
  },
  pharmacy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  alternatives: [{
    type: String,
    trim: true
  }],
  searchCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for dynamic expiry calculations
medicineSchema.virtual('daysUntilExpiry').get(function () {
  if (!this.expiryDate) return 999;
  const ms = new Date(this.expiryDate).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
});

medicineSchema.virtual('isExpired').get(function () {
  if (!this.expiryDate) return false;
  return new Date(this.expiryDate).getTime() < Date.now();
});

medicineSchema.virtual('isExpiringSoon').get(function () {
  const days = this.daysUntilExpiry;
  return days > 0 && days <= 30;
});

medicineSchema.virtual('expiryStatus').get(function () {
  if (this.isExpired) return 'EXPIRED';
  if (this.isExpiringSoon) return 'EXPIRING_SOON';
  return 'OK';
});

// Compound Indexes for fast geographic, search, and inventory queries
medicineSchema.index({ name: 'text', genericName: 'text', brand: 'text' });
medicineSchema.index({ pharmacy: 1, stock: 1 });
medicineSchema.index({ category: 1, price: 1 });
medicineSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
