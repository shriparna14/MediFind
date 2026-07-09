const mongoose = require('mongoose');
const localDb = require('../utils/localDb');

const OrderSchema = new mongoose.Schema({
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
  items: [{
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  deliveryType: {
    type: String,
    enum: ['pickup', 'emergency'],
    default: 'pickup'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'out-for-delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  deliveryPhone: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const OrderModel = mongoose.model('Order', OrderSchema);

module.exports = new Proxy({}, {
  get: function(target, prop) {
    const useLocal = !process.env.MONGODB_URI;
    const activeTarget = useLocal ? localDb.Order : OrderModel;
    const value = activeTarget[prop];
    if (typeof value === 'function') {
      return value.bind(activeTarget);
    }
    return value;
  }
});
