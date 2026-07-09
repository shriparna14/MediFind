const express = require('express');
const router = express.Router();
const { getPharmacies, getNearbyPharmacies } = require('../controllers/pharmacyController');

router.get('/', getPharmacies);
router.get('/nearby', getNearbyPharmacies);

module.exports = router;
