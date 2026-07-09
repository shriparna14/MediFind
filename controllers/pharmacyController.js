const User = require('../models/User');
const Medicine = require('../models/Medicine');

// Haversine formula to calculate distance in km
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// @desc    Get all approved pharmacies
// @route   GET /api/pharmacies
// @access  Public
exports.getPharmacies = async (req, res) => {
  try {
    const pharmacies = await User.find({ role: 'pharmacy', isApproved: true });
    
    // Clean return data
    const cleaned = pharmacies.map(p => ({
      id: p._id || p.id,
      shopName: p.shopName,
      address: p.address,
      phone: p.phone,
      email: p.email,
      latitude: p.latitude,
      longitude: p.longitude,
      license: p.license
    }));

    res.json({ success: true, count: cleaned.length, data: cleaned });
  } catch (error) {
    console.error('Get pharmacies error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving pharmacies' });
  }
};

// @desc    Get nearby pharmacies with distance
// @route   GET /api/pharmacies/nearby
// @access  Public
exports.getNearbyPharmacies = async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user location coordinates (latitude & longitude)'
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    const maxRadius = Number(radius || 15); // default search radius 15km

    const pharmacies = await User.find({ role: 'pharmacy', isApproved: true });
    
    const nearby = pharmacies
      .map(p => {
        const distance = calculateDistance(lat, lng, p.latitude, p.longitude);
        return {
          id: p._id || p.id,
          shopName: p.shopName,
          address: p.address,
          phone: p.phone,
          latitude: p.latitude,
          longitude: p.longitude,
          distance: Number(distance.toFixed(2)) // Round to 2 decimal places
        };
      })
      .filter(p => p.distance <= maxRadius)
      .sort((a, b) => a.distance - b.distance); // Sort closest first

    res.json({ success: true, count: nearby.length, data: nearby });
  } catch (error) {
    console.error('Get nearby pharmacies error:', error);
    res.status(500).json({ success: false, message: 'Server error calculating nearby pharmacies' });
  }
};
