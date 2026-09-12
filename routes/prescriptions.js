const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  uploadPrescription,
  getMyPrescriptions,
  getPharmacyPrescriptions,
  updatePrescriptionStatus,
  getSecurePrescriptionFile
} = require('../controllers/prescriptionController');
const { protect, authorize } = require('../middleware/auth');

// Multer Storage Configuration
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'presc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPEG, PNG, WEBP, and PDF files are permitted.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

router.post('/', protect, authorize('customer'), upload.single('prescription'), uploadPrescription);
router.get('/my', protect, authorize('customer'), getMyPrescriptions);
router.get('/pharmacy', protect, authorize('pharmacy'), getPharmacyPrescriptions);
router.put('/:id/status', protect, authorize('pharmacy'), updatePrescriptionStatus);
router.get('/file/:filename', protect, getSecurePrescriptionFile);

module.exports = router;
