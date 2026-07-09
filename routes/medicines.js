const express = require('express');
const router = express.Router();
const { getMedicines, addMedicine, updateMedicine, deleteMedicine } = require('../controllers/medicineController');
const { protect, authorize } = require('../middleware/auth');

// Allow optional protect so we can log searches with user IDs if they are logged in
const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  next();
};

router.route('/')
  .get(optionalProtect, getMedicines)
  .post(protect, authorize('pharmacy'), addMedicine);

router.route('/:id')
  .put(protect, authorize('pharmacy'), updateMedicine)
  .delete(protect, authorize('pharmacy'), deleteMedicine);

module.exports = router;
