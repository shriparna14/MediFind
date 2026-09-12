const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getPharmacyOrders,
  updateOrderStatus
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validators');

router.post('/', protect, authorize('customer'), validateOrder, createOrder);
router.get('/my', protect, authorize('customer'), getMyOrders);
router.get('/pharmacy', protect, authorize('pharmacy'), getPharmacyOrders);
router.put('/:id/status', protect, authorize('pharmacy', 'admin'), updateOrderStatus);

module.exports = router;
