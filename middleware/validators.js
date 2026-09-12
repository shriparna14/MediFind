/**
 * Request Body & Parameter Validators for MediFind API
 */

// Validate Registration Payload
const validateRegister = (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Valid name with at least 2 characters is required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  // Security check: Public registration MUST NOT allow 'admin'
  if (role && role.toLowerCase() === 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Security Violation: Administrator accounts cannot be registered via public signup.'
    });
  }

  if (role && !['customer', 'pharmacy'].includes(role.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role specified. Permitted roles are: customer, pharmacy.'
    });
  }

  // Pharmacy specific validation
  if (role === 'pharmacy') {
    const { shopName, license, latitude, longitude } = req.body;
    if (!shopName || shopName.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Pharmacy shopName is required.' });
    }
    if (!license || license.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Valid pharmacy license number is required.' });
    }
    if (latitude !== undefined) {
      const lat = Number(latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ success: false, message: 'Latitude must be a valid number between -90 and 90.' });
      }
    }
    if (longitude !== undefined) {
      const lng = Number(longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ success: false, message: 'Longitude must be a valid number between -180 and 180.' });
      }
    }
  }

  next();
};

// Validate Login Payload
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
  }
  next();
};

// Validate Order Creation Payload
const validateOrder = (req, res, next) => {
  const { pharmacyId, items, deliveryAddress, deliveryPhone } = req.body;

  if (!pharmacyId) {
    return res.status(400).json({ success: false, message: 'Destination pharmacyId is required.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Order must contain at least one medicine item.' });
  }

  for (const item of items) {
    if (!item.medicineId) {
      return res.status(400).json({ success: false, message: 'Each item must have a valid medicineId.' });
    }
    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({ success: false, message: 'Item quantity must be a positive integer.' });
    }
  }

  if (!deliveryAddress || typeof deliveryAddress !== 'string' || deliveryAddress.trim().length < 5) {
    return res.status(400).json({ success: false, message: 'Valid delivery address (at least 5 characters) is required.' });
  }

  if (!deliveryPhone || typeof deliveryPhone !== 'string' || deliveryPhone.trim().length < 7) {
    return res.status(400).json({ success: false, message: 'Valid contact phone number is required.' });
  }

  next();
};

// Validate Reservation Creation Payload
const validateReservation = (req, res, next) => {
  const { medicineId, quantity } = req.body;

  if (!medicineId) {
    return res.status(400).json({ success: false, message: 'Medicine ID is required for reservation.' });
  }

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
    return res.status(400).json({ success: false, message: 'Reservation quantity must be a positive integer.' });
  }

  next();
};

// Validate Medicine Add/Update
const validateMedicine = (req, res, next) => {
  const { name, price, stock } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
    return res.status(400).json({ success: false, message: 'Medicine name must be at least 2 characters.' });
  }

  if (price !== undefined) {
    const p = Number(price);
    if (isNaN(p) || p < 0) {
      return res.status(400).json({ success: false, message: 'Medicine price must be a non-negative number.' });
    }
  }

  if (stock !== undefined) {
    const s = Number(stock);
    if (isNaN(s) || s < 0 || !Number.isInteger(s)) {
      return res.status(400).json({ success: false, message: 'Medicine stock must be a non-negative integer.' });
    }
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateOrder,
  validateReservation,
  validateMedicine
};
