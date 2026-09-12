const express = require('express');
const router = express.Router();
const {
  getNearbyPharmacies,
  compareMedicineAcrossPharmacies,
  getPharmacyInventory,
  getPharmacyStats,
  getDemandPrediction,
  getAllPharmacies
} = require('../controllers/pharmacyController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getAllPharmacies);
router.get('/nearby', getNearbyPharmacies);
router.get('/compare', compareMedicineAcrossPharmacies);
router.get('/stats', protect, authorize('pharmacy'), getPharmacyStats);
router.get('/demand-prediction', protect, authorize('pharmacy'), getDemandPrediction);
router.get('/:id/inventory', getPharmacyInventory);

module.exports = router;
