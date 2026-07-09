const express = require('express');
const router = express.Router();
const { createReservation, getMyReservations, getPharmacyReservations, updateReservationStatus } = require('../controllers/reservationController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .post(protect, authorize('customer'), createReservation);

router.get('/my', protect, authorize('customer'), getMyReservations);
router.get('/pharmacy', protect, authorize('pharmacy'), getPharmacyReservations);

router.put('/:id/status', protect, updateReservationStatus);

module.exports = router;
