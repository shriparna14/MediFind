const mongoose = require('mongoose');
const localDb = require('../utils/localDb');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
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
    default: 0
  },
  longitude: {
    type: Number,
    default: 0
  },
  license: {
    type: String,
    default: ''
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
