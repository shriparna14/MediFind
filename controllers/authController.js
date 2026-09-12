const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logAudit } = require('../utils/auditLogger');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id, role: user.role },
    process.env.JWT_SECRET || 'fallback_jwt_secret_medifind_2026',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * @desc    Register a user (customer or pharmacy only)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address, shopName, latitude, longitude, license } = req.body;

    // Security Guard: Hard-block public admin registration
    if (role && role.toLowerCase() === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: Administrator accounts cannot be created via public registration.'
      });
    }

    const assignedRole = role && role.toLowerCase() === 'pharmacy' ? 'pharmacy' : 'customer';

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: assignedRole,
      phone,
      address,
      shopName: assignedRole === 'pharmacy' ? (shopName || name) : '',
      latitude: assignedRole === 'pharmacy' ? (Number(latitude) || 12.9716) : 12.9716,
      longitude: assignedRole === 'pharmacy' ? (Number(longitude) || 77.5946) : 77.5946,
      license: assignedRole === 'pharmacy' ? license : '',
      isApproved: assignedRole !== 'pharmacy' // Pharmacies require admin approval
    };

    const user = await User.create(userData);
    const token = generateToken(user);

    await logAudit('USER_REGISTER', {
      userId: user._id || user.id,
      details: { role: user.role, email: user.email }
    }, req);

    res.status(201).json({
      success: true,
      message: assignedRole === 'pharmacy'
        ? 'Pharmacy account created! Awaiting administrator license verification before listing.'
        : 'Account created successfully!',
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
        phone: user.phone,
        shopName: user.shopName,
        isApproved: user.isApproved
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Login user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Check if pharmacy is approved
    if (user.role === 'pharmacy' && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Your pharmacy license verification is pending approval by the administrator.'
      });
    }

    const token = generateToken(user);

    await logAudit(user.role === 'admin' ? 'ADMIN_LOGIN' : 'USER_LOGIN', {
      userId: user._id || user.id,
      details: { role: user.role, email: user.email }
    }, req);

    res.json({
      success: true,
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
        phone: user.phone,
        shopName: user.shopName,
        isApproved: user.isApproved,
        latitude: user.latitude,
        longitude: user.longitude
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get currently authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe
};
