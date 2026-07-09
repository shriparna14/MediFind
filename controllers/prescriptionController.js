const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const Prescription = require('../models/Prescription');
const User = require('../models/User');

// Configure Cloudinary if environment variables are set
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
} else {
  console.log('⚠️  Cloudinary credentials not configured. Prescription uploads will be saved locally on server disk.');
}

// @desc    Upload a prescription
// @route   POST /api/prescriptions
// @access  Private (Customer only)
exports.uploadPrescription = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const { pharmacyId } = req.body;
    if (!pharmacyId) {
      // Remove temp local file if validation fails
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, message: 'Please specify the target pharmacyId' });
    }

    let imageUrl = '';

    if (isCloudinaryConfigured) {
      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'medifind_prescriptions'
        });
        imageUrl = result.secure_url;

        // Delete local temp file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error, falling back to local file path:', cloudinaryError);
        // Fallback to local server static URL if Cloudinary fails
        imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      }
    } else {
      // Local static storage URL
      imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // Save to database
    const prescription = await Prescription.create({
      userId: req.user.id,
      pharmacyId,
      imageUrl,
      status: 'pending'
    });

    const user = await User.findById(req.user.id);
    const pharmacy = await User.findById(pharmacyId);

    const prescData = typeof prescription.toObject === 'function' ? prescription.toObject() : prescription;
    const enriched = {
      ...prescData,
      id: prescData.id || prescData._id,
      customer: {
        name: user.name,
        phone: user.phone
      },
      pharmacy: {
        shopName: pharmacy.shopName
      }
    };

    // Socket alert to Pharmacy about incoming prescription
    const io = req.app.get('socketio');
    if (io) {
      io.emit(`new_prescription_pharmacy_${pharmacyId}`, enriched);
    }

    res.status(201).json({ success: true, data: enriched });
  } catch (error) {
    console.error('Upload prescription error:', error);
    // Attempt clean up of file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ success: false, message: 'Server error uploading prescription' });
  }
};

// @desc    Get customer's prescriptions
// @route   GET /api/prescriptions/my
// @access  Private (Customer only)
exports.getMyPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ userId: req.user.id });
    
    const enriched = await Promise.all(
      prescriptions.map(async (p) => {
        const pharmacy = await User.findById(p.pharmacyId);
        const pData = typeof p.toObject === 'function' ? p.toObject() : p;
        const pObj = {
          ...pData,
          id: pData.id || pData._id
        };
        if (pharmacy) {
          pObj.pharmacy = {
            shopName: pharmacy.shopName,
            address: pharmacy.address
          };
        }
        return pObj;
      })
    );

    enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    console.error('Get my prescriptions error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving prescriptions' });
  }
};

// @desc    Get pharmacy's prescriptions
// @route   GET /api/prescriptions/pharmacy
// @access  Private (Pharmacy only)
exports.getPharmacyPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ pharmacyId: req.user.id });

    const enriched = await Promise.all(
      prescriptions.map(async (p) => {
        const customer = await User.findById(p.userId);
        const pData = typeof p.toObject === 'function' ? p.toObject() : p;
        const pObj = {
          ...pData,
          id: pData.id || pData._id
        };
        if (customer) {
          pObj.customer = {
            name: customer.name,
            phone: customer.phone,
            email: customer.email
          };
        }
        return pObj;
      })
    );

    enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    console.error('Get pharmacy prescriptions error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving prescriptions' });
  }
};

// @desc    Update prescription status (Approve/Reject)
// @route   PUT /api/prescriptions/:id/status
// @access  Private (Pharmacy only)
exports.updatePrescriptionStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    // Verify pharmacy ownership
    if (String(prescription.pharmacyId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to verify this prescription' });
    }

    const updated = await Prescription.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    // Socket alert customer about prescription verification
    const io = req.app.get('socketio');
    if (io) {
      io.emit(`prescription_status_user_${prescription.userId}`, {
        prescriptionId: prescription._id || prescription.id,
        status: status
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update prescription status error:', error);
    res.status(500).json({ success: false, message: 'Server error updating prescription' });
  }
};
