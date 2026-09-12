const express = require('express');
const router = express.Router();
const {
  searchMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine
} = require('../controllers/medicineController');
const { protect, authorize } = require('../middleware/auth');
const { validateMedicine } = require('../middleware/validators');

router.get('/search', searchMedicines);
router.get('/:id', getMedicineById);
router.post('/', protect, authorize('pharmacy'), validateMedicine, createMedicine);
router.put('/:id', protect, authorize('pharmacy'), validateMedicine, updateMedicine);
router.delete('/:id', protect, authorize('pharmacy'), deleteMedicine);

module.exports = router;
