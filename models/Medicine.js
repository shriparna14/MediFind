const mongoose = require('mongoose');
const localDb = require('../utils/localDb');

const MedicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  expiryDate: {
    type: Date,
    required: true
  },
  prescriptionRequired: {
    type: Boolean,
    default: false
  },
  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Array of names of alternative generic medicines (e.g. ['Crocin', 'Calpol', 'Paracetamol'])
  alternatives: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

const MedicineModel = mongoose.model('Medicine', MedicineSchema);

module.exports = new Proxy({}, {
  get: function(target, prop) {
    const useLocal = !process.env.MONGODB_URI;
    const activeTarget = useLocal ? localDb.Medicine : MedicineModel;
    const value = activeTarget[prop];
    if (typeof value === 'function') {
      return value.bind(activeTarget);
    }
    return value;
  }
});
