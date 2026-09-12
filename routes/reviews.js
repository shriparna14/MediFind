const express = require('express');
const router = express.Router();
const { createReview, getPharmacyReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createReview);
router.get('/pharmacy/:id', getPharmacyReviews);

module.exports = router;
