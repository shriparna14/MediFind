const mongoose = require('mongoose');
const localDb = require('../utils/localDb');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['customer', 'pharmacy', 'admin'],
    default: 'customer'
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  // Pharmacy specific fields
  shopName: {
    type: String,
    default: ''
  },
  latitude: {
    type: Number,
    default: 12.9716
  },
  longitude: {
    type: Number,
    default: 77.5946
  },
  license: {
    type: String,
    default: ''
  },
  openingHours: {
    type: String,
    default: '8:00 AM - 11:00 PM'
  },
  rating: {
    type: Number,
    default: 4.8,
    min: 1,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  isApproved: {
    type: Boolean,
    default: function() {
      // Customers and Admins are auto-approved, Pharmacies require admin approval
      return this.role !== 'pharmacy';
    }
  }
}, {
  timestamps: true
});

UserSchema.index({ latitude: 1, longitude: 1 });
UserSchema.index({ role: 1, isApproved: 1 });

const UserModel = mongoose.model('User', UserSchema);

module.exports = new Proxy({}, {
  get: function(target, prop) {
    const useLocal = !process.env.MONGODB_URI;
    const activeTarget = useLocal ? localDb.User : UserModel;
    const value = activeTarget[prop];
    if (typeof value === 'function') {
      return value.bind(activeTarget);
    }
    return value;
  }
});
