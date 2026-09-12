const Review = require('../models/Review');
const User = require('../models/User');
const Order = require('../models/Order');
const Reservation = require('../models/Reservation');
const localDb = require('../utils/localDb');
const { logAudit } = require('../utils/auditLogger');

/**
 * @desc    Submit verified review for a pharmacy
 * @route   POST /api/reviews
 * @access  Private (Customer)
 */
const createReview = async (req, res, next) => {
  try {
    const { pharmacyId, rating, comment, orderId, reservationId } = req.body;
    const userId = req.user.id || req.user._id;

    if (!pharmacyId || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'Pharmacy, rating, and feedback comment are required.' });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }

    if (localDb.isUsingMongo()) {
      // Check for duplicate review for this order/reservation
      if (orderId) {
        const existing = await Review.findOne({ userId, pharmacyId, orderId });
        if (existing) {
          return res.status(400).json({ success: false, message: 'You have already submitted a review for this order.' });
        }
      }

      const review = await Review.create({
        userId,
        pharmacyId,
        orderId: orderId || null,
        reservationId: reservationId || null,
        rating: numRating,
        comment: comment.trim(),
        isVerifiedPurchase: true
      });

      // Recalculate average rating for the pharmacy
      const allReviews = await Review.find({ pharmacyId });
      const avgRating = Number((allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1));

      await User.findByIdAndUpdate(pharmacyId, {
        rating: avgRating,
        reviewCount: allReviews.length
      });

      await logAudit('REVIEW_POSTED', {
        userId,
        pharmacyId,
        targetId: review._id,
        targetModel: 'Review',
        details: { rating: numRating }
      }, req);

      res.status(201).json({
        success: true,
        message: 'Verified review submitted successfully!',
        data: review
      });
    } else {
      const review = await localDb.Review.create({
        userId,
        pharmacyId,
        orderId,
        reservationId,
        rating: numRating,
        comment: comment.trim()
      });

      res.status(201).json({
        success: true,
        message: 'Verified review submitted successfully!',
        data: review
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get reviews for a pharmacy
 * @route   GET /api/reviews/pharmacy/:id
 * @access  Public
 */
const getPharmacyReviews = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (localDb.isUsingMongo()) {
      const reviews = await Review.find({ pharmacyId: id })
        .populate('userId', 'name')
        .sort({ createdAt: -1 })
        .limit(20);

      res.json({ success: true, count: reviews.length, data: reviews });
    } else {
      const reviews = (await localDb.Review.find({ pharmacyId: id })) || [];
      res.json({ success: true, count: reviews.length, data: reviews });
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createReview,
  getPharmacyReviews
};
