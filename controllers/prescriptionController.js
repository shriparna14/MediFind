const path = require('path');
const fs = require('fs');
const Prescription = require('../models/Prescription');
const Notification = require('../models/Notification');
const localDb = require('../utils/localDb');
const { logAudit } = require('../utils/auditLogger');

/**
 * @desc    Upload prescription file with strict MIME and size checks
 * @route   POST /api/prescriptions
 * @access  Private (Customer)
 */
const uploadPrescription = async (req, res, next) => {
  try {
    const { pharmacyId, notes = '' } = req.body;
    const userId = req.user.id || req.user._id;

    if (!pharmacyId) {
      return res.status(400).json({ success: false, message: 'Please select a destination pharmacy.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please attach a prescription file (JPG, PNG, or PDF).' });
    }

    // MIME Validation
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Invalid file format. Only JPEG, PNG, WEBP, and PDF files are permitted.'
      });
    }

    // 5MB Size Validation
    const maxSize = 5 * 1024 * 1024;
    if (req.file.size > maxSize) {
      if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the 5MB maximum limit.'
      });
    }

    // Secure local or Cloudinary storage path
    const fileUrl = req.file.path
      ? `/api/prescriptions/file/${path.basename(req.file.path)}`
      : `/api/prescriptions/file/${req.file.filename}`;

    const prescriptionData = {
      userId,
      pharmacyId,
      imageUrl: fileUrl,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      notes,
      status: 'pending'
    };

    let prescription = null;
    if (localDb.isUsingMongo()) {
      prescription = await Prescription.create(prescriptionData);
    } else {
      prescription = await localDb.Prescription.create(prescriptionData);
    }

    const populated = await Prescription.findById(prescription._id || prescription.id)
      .populate('pharmacyId', 'shopName address')
      .populate('userId', 'name phone email');

    // Notify pharmacy via Socket.io
    const io = req.app.get('socketio');
    if (io) {
      io.to(String(pharmacyId)).emit('new_prescription', populated || prescription);
    }

    if (localDb.isUsingMongo()) {
      await Notification.create({
        userId: pharmacyId,
        title: '📄 New Prescription Uploaded',
        message: `${req.user.name} uploaded a prescription for verification.`,
        type: 'PRESCRIPTION',
        referenceId: prescription._id,
        referenceModel: 'Prescription'
      });
    }

    await logAudit('PRESCRIPTION_UPLOADED', {
      userId,
      pharmacyId,
      targetId: prescription._id || prescription.id,
      targetModel: 'Prescription',
      details: { fileType: req.file.mimetype, fileSize: req.file.size }
    }, req);

    res.status(201).json({
      success: true,
      message: 'Prescription uploaded securely for pharmacy verification!',
      data: populated || prescription
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get prescriptions uploaded by authenticated customer
 * @route   GET /api/prescriptions/my
 * @access  Private (Customer)
 */
const getMyPrescriptions = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (localDb.isUsingMongo()) {
      const prescriptions = await Prescription.find({ userId })
        .populate('pharmacyId', 'shopName address phone')
        .sort({ createdAt: -1 });

      res.json({ success: true, count: prescriptions.length, data: prescriptions });
    } else {
      const prescriptions = (await localDb.Prescription.find({ userId })) || [];
      res.json({ success: true, count: prescriptions.length, data: prescriptions });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get prescriptions received by pharmacy
 * @route   GET /api/prescriptions/pharmacy
 * @access  Private (Pharmacy)
 */
const getPharmacyPrescriptions = async (req, res, next) => {
  try {
    const pharmacyId = req.user.id || req.user._id;

    if (localDb.isUsingMongo()) {
      const prescriptions = await Prescription.find({ pharmacyId })
        .populate('userId', 'name email phone address')
        .sort({ createdAt: -1 });

      res.json({ success: true, count: prescriptions.length, data: prescriptions });
    } else {
      const prescriptions = (await localDb.Prescription.find({ pharmacyId })) || [];
      res.json({ success: true, count: prescriptions.length, data: prescriptions });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update prescription status (Approve / Reject)
 * @route   PUT /api/prescriptions/:id/status
 * @access  Private (Pharmacy)
 */
const updatePrescriptionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason = '' } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be pending, approved, or rejected.' });
    }

    let prescription = null;
    if (localDb.isUsingMongo()) {
      prescription = await Prescription.findById(id);
      if (!prescription) {
        return res.status(404).json({ success: false, message: 'Prescription not found.' });
      }

      prescription.status = status;
      if (status === 'rejected') {
        prescription.rejectionReason = rejectionReason;
      }
      await prescription.save();
    } else {
      prescription = await localDb.Prescription.findById(id);
      if (prescription) {
        prescription.status = status;
        prescription.rejectionReason = rejectionReason;
      }
    }

    const populated = await Prescription.findById(id)
      .populate('pharmacyId', 'shopName address phone')
      .populate('userId', 'name phone email');

    // Broadcast to customer
    const io = req.app.get('socketio');
    if (io && populated) {
      io.to(String(populated.userId._id || populated.userId)).emit('prescription_status', {
        prescriptionId: prescription._id,
        status,
        rejectionReason,
        prescription: populated
      });
    }

    await logAudit(status === 'approved' ? 'PRESCRIPTION_APPROVED' : 'PRESCRIPTION_REJECTED', {
      targetId: id,
      targetModel: 'Prescription',
      details: { status, rejectionReason }
    }, req);

    res.json({
      success: true,
      message: `Prescription marked as ${status}`,
      data: populated || prescription
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Securely stream/serve authenticated prescription file
 * @route   GET /api/prescriptions/file/:filename
 * @access  Private (Patient / Destination Pharmacy / Admin only)
 */
const getSecurePrescriptionFile = async (req, res, next) => {
  try {
    const { filename } = req.params;

    // Look up prescription record
    const prescription = await Prescription.findOne({
      imageUrl: new RegExp(filename, 'i')
    });

    if (prescription) {
      const currentUserId = String(req.user.id || req.user._id);
      const isOwner = String(prescription.userId) === currentUserId;
      const isAssignedPharmacy = String(prescription.pharmacyId) === currentUserId;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAssignedPharmacy && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: You are not authorized to view this prescription document.'
        });
      }
    }

    const filePath = path.join(__dirname, '..', 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Prescription document file not found.' });
    }

    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadPrescription,
  getMyPrescriptions,
  getPharmacyPrescriptions,
  updatePrescriptionStatus,
  getSecurePrescriptionFile
};
