const mongoose = require('mongoose');
const localDb = require('../utils/localDb');

const PrescriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const PrescriptionModel = mongoose.model('Prescription', PrescriptionSchema);

module.exports = new Proxy({}, {
  get: function(target, prop) {
    const useLocal = !process.env.MONGODB_URI;
    const activeTarget = useLocal ? localDb.Prescription : PrescriptionModel;
    const value = activeTarget[prop];
    if (typeof value === 'function') {
      return value.bind(activeTarget);
    }
    return value;
  }
});
