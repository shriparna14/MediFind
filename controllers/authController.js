const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'medifind_super_secret_key_123_456', {
    expiresIn: '30d'
  });
};

// @desc    Register a new user (customer/pharmacy)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, address, shopName, latitude, longitude, license } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user payload
    const userPayload = {
      name,
      email,
      password: hashedPassword,
      role: role || 'customer',
      phone,
      address,
      shopName: role === 'pharmacy' ? shopName : undefined,
      latitude: role === 'pharmacy' ? Number(latitude || 0) : undefined,
      longitude: role === 'pharmacy' ? Number(longitude || 0) : undefined,
      license: role === 'pharmacy' ? license : undefined,
      isApproved: role !== 'pharmacy' // Pharmacy requires admin approval, customers and admins do not
    };

    // Create user
    const user = await User.create(userPayload);

    // If customer/admin, generate token and login immediately. For pharmacy, notify approval is pending.
    if (user.role === 'pharmacy') {
      return res.status(201).json({
        success: true,
        message: 'Pharmacy registered successfully! Awaiting administrator approval before you can log in.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isApproved: false
        }
      });
    }

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if pharmacy is approved
    if (user.role === 'pharmacy' && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Your pharmacy account is pending administrator approval. Please wait or contact support.'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopName: user.shopName,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @desc    Get current logged in user details
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Don't return password
    const userObj = { ...user };
    delete userObj.password;

    res.json({
      success: true,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        shopName: user.shopName,
        latitude: user.latitude,
        longitude: user.longitude,
        license: user.license,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
