const express = require('express');
const router = express.Router();
const {
  createReservation,
  getMyReservations,
  getPharmacyReservations,
  updateReservationStatus
} = require('../controllers/reservationController');
const { protect, authorize } = require('../middleware/auth');
const { validateReservation } = require('../middleware/validators');

router.post('/', protect, authorize('customer'), validateReservation, createReservation);
router.get('/my', protect, authorize('customer'), getMyReservations);
router.get('/pharmacy', protect, authorize('pharmacy'), getPharmacyReservations);
router.put('/:id/status', protect, authorize('pharmacy'), updateReservationStatus);

module.exports = router;
