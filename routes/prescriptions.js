const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  uploadPrescription,
  getMyPrescriptions,
  getPharmacyPrescriptions,
  updatePrescriptionStatus
} = require('../controllers/prescriptionController');
const { protect, authorize } = require('../middleware/auth');

// Ensure local uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage engine configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (accept jpg, jpeg, png, pdf)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Max 5MB limit
});

// Error handling middleware for Multer errors
const handleMulterError = (err, req, res, next) => {
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

router.post(
  '/',
  protect,
  authorize('customer'),
  upload.single('prescription'),
  handleMulterError,
  uploadPrescription
);

router.get('/my', protect, authorize('customer'), getMyPrescriptions);
router.get('/pharmacy', protect, authorize('pharmacy'), getPharmacyPrescriptions);
router.put('/:id/status', protect, authorize('pharmacy'), updatePrescriptionStatus);

module.exports = router;
