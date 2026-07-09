const mongoose = require('mongoose');
const localDb = require('../utils/localDb');

const SearchLogSchema = new mongoose.Schema({
  medicineName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  count: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

const SearchLogModel = mongoose.model('SearchLog', SearchLogSchema);

module.exports = new Proxy({}, {
  get: function(target, prop) {
    const useLocal = !process.env.MONGODB_URI;
    const activeTarget = useLocal ? localDb.SearchLog : SearchLogModel;
    const value = activeTarget[prop];
    if (typeof value === 'function') {
      return value.bind(activeTarget);
    }
    return value;
  }
});
