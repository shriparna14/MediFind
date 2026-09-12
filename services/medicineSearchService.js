const Medicine = require('../models/Medicine');
const User = require('../models/User');
const localDb = require('../utils/localDb');
const { calculateDistance } = require('../utils/distance');
const { calculateRecommendationScore } = require('./aiService');

/**
 * Execute Grounded Multi-factor Search Query against MongoDB
 */
const searchMedicinesGrounded = async ({
  keyword = '',
  category = '',
  maxPrice = null,
  userLat = 12.9716,
  userLng = 77.5946,
  maxRadius = 25
}) => {
  try {
    let medicines = [];

    if (localDb.isUsingMongo()) {
      const query = { stock: { $gt: 0 } };

      if (category && category !== 'All') {
        query.category = category;
      }

      if (maxPrice && !isNaN(maxPrice)) {
        query.price = { $lte: Number(maxPrice) };
      }

      if (keyword && keyword.trim()) {
        const regex = new RegExp(keyword.trim(), 'i');
        query.$or = [
          { name: regex },
          { genericName: regex },
          { brand: regex },
          { alternatives: regex }
        ];
      }

      medicines = await Medicine.find(query)
        .populate('pharmacy', 'name shopName address latitude longitude rating reviewCount phone openingHours isApproved')
        .lean();
    } else {
      medicines = (await localDb.Medicine.find({})) || [];
      // Populate pharmacy with single pre-indexed lookup to eliminate N+1 queries
      const allUsers = (await localDb.User.find({})) || [];
      const userMap = new Map(allUsers.map(u => [String(u._id || u.id), u]));
      medicines = medicines.map(m => ({
        ...m,
        pharmacy: userMap.get(String(m.pharmacy)) || {}
      }));
    }

    // Filter by approved pharmacies and calculate distance
    const results = [];

    for (const med of medicines) {
      const pharmacy = med.pharmacy || {};
      if (pharmacy.isApproved === false) continue;

      const pLat = Number(pharmacy.latitude || 12.9716);
      const pLng = Number(pharmacy.longitude || 77.5946);

      const distance = calculateDistance(userLat, userLng, pLat, pLng);

      if (maxRadius && distance > maxRadius) continue;

      const medWithDist = {
        ...med,
        medicineId: med._id || med.id,
        pharmacy: {
          ...pharmacy,
          id: pharmacy._id || pharmacy.id,
          distance: Number(distance.toFixed(1))
        }
      };

      medWithDist.recommendationScore = calculateRecommendationScore(medWithDist, { lat: userLat, lng: userLng });
      results.push(medWithDist);
    }

    // Sort by recommendation score descending
    return results.sort((a, b) => b.recommendationScore - a.recommendationScore);
  } catch (err) {
    console.error('Grounded search error:', err);
    return [];
  }
};

module.exports = { searchMedicinesGrounded };
