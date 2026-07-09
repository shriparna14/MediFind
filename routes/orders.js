const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getPharmacyOrders, updateOrderStatus } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .post(protect, authorize('customer'), createOrder);

router.get('/my', protect, authorize('customer'), getMyOrders);
router.get('/pharmacy', protect, authorize('pharmacy'), getPharmacyOrders);

router.put('/:id/status', protect, updateOrderStatus);

module.exports = router;
