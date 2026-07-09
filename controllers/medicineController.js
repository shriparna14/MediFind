const Medicine = require('../models/Medicine');
const SearchLog = require('../models/SearchLog');
const User = require('../models/User');

// Predefined alternative generic mappings for fallbacks
const GENERIC_MAPS = {
  'paracetamol': ['Dolo 650', 'Crocin 650', 'Calpol 650', 'Pacimol'],
  'dolo 650': ['Crocin 650', 'Calpol 650', 'Paracetamol 650'],
  'crocin': ['Dolo 650', 'Calpol 650', 'Paracetamol 650'],
  'calpol': ['Dolo 650', 'Crocin 650', 'Paracetamol 650'],
  
  'aspirin': ['Disprin', 'Ecosprin 75', 'Loprin 75'],
  'ecosprin': ['Aspirin 75', 'Disprin', 'Loprin 75'],
  
  'combiflam': ['Ibuprofen 400', 'Flexon', 'Brufen 400'],
  'ibuprofen': ['Combiflam', 'Flexon', 'Brufen 400'],
  
  'cetirizine': ['Alerid', 'Okacet', 'Zyrtec'],
  'alerid': ['Cetirizine', 'Okacet', 'Zyrtec'],
  'okacet': ['Cetirizine', 'Alerid', 'Zyrtec'],

  'pantocid': ['Pantoprazole 40', 'Pan-40', 'Pantocid DSR'],
  'pantoprazole': ['Pantocid', 'Pan-40', 'Pantosec']
};

const getAlternativeMedicines = (name) => {
  const query = name.toLowerCase().trim();
  
  // Direct check
  if (GENERIC_MAPS[query]) return GENERIC_MAPS[query];
  
  // Partial check
  for (const key in GENERIC_MAPS) {
    if (query.includes(key) || key.includes(query)) {
      return GENERIC_MAPS[key];
    }
  }
  return [];
};

// @desc    Get all medicines or search medicines
// @route   GET /api/medicines
// @access  Public (Optional Private for Pharmacy)
exports.getMedicines = async (req, res) => {
  try {
    const { name, pharmacyId, category } = req.query;
    let query = {};

    // If pharmacyId is supplied, filter by pharmacy
    if (pharmacyId) {
      query.pharmacyId = pharmacyId;
    }

    if (category) {
      query.category = { $regex: new RegExp(category, 'i') };
    }

    // If search name is provided
    if (name) {
      const cleanName = name.trim();
      query.name = { $regex: new RegExp(cleanName, 'i') };

      // Log the search query in backend for Admin Analytics
      try {
        const userId = req.user ? req.user.id : null;
        const lowercaseSearch = cleanName.toLowerCase();
        
        // Try to update search log count, otherwise create it
        const logEntry = await SearchLog.findOne({ medicineName: lowercaseSearch });
        if (logEntry) {
          await SearchLog.findByIdAndUpdate(logEntry._id, { $inc: { count: 1 } });
        } else {
          await SearchLog.create({ medicineName: lowercaseSearch, userId, count: 1 });
        }
      } catch (err) {
        console.error('Failed to log search query:', err);
      }
    }

    const medicines = await Medicine.find(query);
    
    // Add pharmacy details and distance calculations if user location is provided
    // Let's populate pharmacy detail fields manually to support both Mongoose & LocalDb
    const enrichedMedicines = await Promise.all(
      medicines.map(async (med) => {
        const pharm = await User.findById(med.pharmacyId);
        const medObj = { ...med };
        if (pharm) {
          medObj.pharmacy = {
            id: pharm._id || pharm.id,
            shopName: pharm.shopName,
            address: pharm.address,
            phone: pharm.phone,
            latitude: pharm.latitude,
            longitude: pharm.longitude,
            isApproved: pharm.isApproved
          };
        }
        
        // Attach alternative mappings
        medObj.alternatives = med.alternatives && med.alternatives.length > 0
          ? med.alternatives
          : getAlternativeMedicines(med.name);

        return medObj;
      })
    );

    // If a search was done, and no medicines are available OR they are low stock,
    // let's fetch alternative medicines from other pharmacies
    let alternativesList = [];
    if (name && (enrichedMedicines.length === 0 || enrichedMedicines.every(m => m.stock === 0))) {
      const suggestedNames = getAlternativeMedicines(name);
      if (suggestedNames.length > 0) {
        // Query for alternative names across approved pharmacies
        const altQueries = suggestedNames.map(n => ({ name: { $regex: new RegExp(n, 'i') } }));
        
        // Find alternative records (Mongoose vs LocalDb query compatibility)
        let altMeds = [];
        if (altQueries.length > 0) {
          // Find matches
          for (const sName of suggestedNames) {
            const found = await Medicine.find({ name: { $regex: new RegExp(sName, 'i') } });
            altMeds = [...altMeds, ...found];
          }
        }

        alternativesList = await Promise.all(
          altMeds.map(async (med) => {
            const pharm = await User.findById(med.pharmacyId);
            const medObj = { ...med };
            if (pharm) {
              medObj.pharmacy = {
                id: pharm._id || pharm.id,
                shopName: pharm.shopName,
                address: pharm.address,
                phone: pharm.phone,
                latitude: pharm.latitude,
                longitude: pharm.longitude
              };
            }
            return medObj;
          })
        );
      }
    }

    res.json({
      success: true,
      count: enrichedMedicines.length,
      data: enrichedMedicines,
      alternatives: alternativesList.filter(m => m.stock > 0) // Only suggest alternatives that are currently in stock
    });
  } catch (error) {
    console.error('Get medicines error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving medicines' });
  }
};

// @desc    Add new medicine
// @route   POST /api/medicines
// @access  Private (Pharmacy only)
exports.addMedicine = async (req, res) => {
  try {
    const { name, brand, category, price, stock, expiryDate, prescriptionRequired, alternatives } = req.body;
    
    const medicine = await Medicine.create({
      name,
      brand,
      category,
      price: Number(price),
      stock: Number(stock),
      expiryDate: new Date(expiryDate),
      prescriptionRequired: prescriptionRequired === true || prescriptionRequired === 'true',
      pharmacyId: req.user.id,
      alternatives: Array.isArray(alternatives) ? alternatives : []
    });

    // Notify clients about inventory additions
    const io = req.app.get('socketio');
    if (io) {
      io.emit('stock_update', {
        medicineId: medicine._id,
        medicineName: medicine.name,
        pharmacyId: req.user.id,
        stock: medicine.stock
      });
    }

    res.status(201).json({ success: true, data: medicine });
  } catch (error) {
    console.error('Add medicine error:', error);
    res.status(500).json({ success: false, message: 'Server error adding medicine' });
  }
};

// @desc    Update medicine stock or details
// @route   PUT /api/medicines/:id
// @access  Private (Pharmacy only)
exports.updateMedicine = async (req, res) => {
  try {
    let medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    // Verify ownership
    if (String(medicine.pharmacyId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this medicine' });
    }

    const { name, brand, category, price, stock, expiryDate, prescriptionRequired, alternatives } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (brand !== undefined) updates.brand = brand;
    if (category !== undefined) updates.category = category;
    if (price !== undefined) updates.price = Number(price);
    if (stock !== undefined) updates.stock = Number(stock);
    if (expiryDate !== undefined) updates.expiryDate = new Date(expiryDate);
    if (prescriptionRequired !== undefined) {
      updates.prescriptionRequired = prescriptionRequired === true || prescriptionRequired === 'true';
    }
    if (alternatives !== undefined) {
      updates.alternatives = Array.isArray(alternatives) ? alternatives : [];
    }

    const updatedMedicine = await Medicine.findByIdAndUpdate(req.params.id, updates, { new: true });

    // Live Socket.IO Broadcast to all customers viewing the search results
    const io = req.app.get('socketio');
    if (io) {
      io.emit('stock_update', {
        medicineId: updatedMedicine._id || updatedMedicine.id,
        medicineName: updatedMedicine.name,
        pharmacyId: req.user.id,
        stock: updatedMedicine.stock
      });
    }

    res.json({ success: true, data: updatedMedicine });
  } catch (error) {
    console.error('Update medicine error:', error);
    res.status(500).json({ success: false, message: 'Server error updating medicine' });
  }
};

// @desc    Delete medicine from inventory
// @route   DELETE /api/medicines/:id
// @access  Private (Pharmacy only)
exports.deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    // Verify ownership
    if (String(medicine.pharmacyId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this medicine' });
    }

    await Medicine.findByIdAndDelete(req.params.id);

    // Live Socket.IO Broadcast about inventory deletion (stock goes to 0)
    const io = req.app.get('socketio');
    if (io) {
      io.emit('stock_update', {
        medicineId: req.params.id,
        medicineName: medicine.name,
        pharmacyId: req.user.id,
        stock: 0
      });
    }

    res.json({ success: true, message: 'Medicine removed successfully' });
  } catch (error) {
    console.error('Delete medicine error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting medicine' });
  }
};
