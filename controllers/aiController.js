const {
  DRUG_MONOGRAPHS,
  extractSearchIntent,
  generateAIResponse
} = require('../services/aiService');
const { searchMedicinesGrounded } = require('../services/medicineSearchService');
const { calculateDemandForecast } = require('../utils/demandForecasting');

/**
 * @desc    Chat endpoint for MediFind AI (LLM Intent Extraction + Grounded Monograph / Real Inventory Search)
 * @route   POST /api/ai/chat
 * @access  Public
 */
const chatWithAI = async (req, res, next) => {
  try {
    const { message, latitude, longitude, radius } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a prompt message for the AI assistant.'
      });
    }

    // Determine user coordinates (request body > authenticated user profile > null)
    const userLat = latitude !== undefined && latitude !== null ? Number(latitude) : (req.user?.latitude ? Number(req.user.latitude) : 12.9716);
    const userLng = longitude !== undefined && longitude !== null ? Number(longitude) : (req.user?.longitude ? Number(req.user.longitude) : 77.5946);
    const searchRadius = radius ? Number(radius) : 25;

    // Async LLM Intent Extraction with fallback
    const intent = await extractSearchIntent(message);

    // Check for drug monograph match
    let monograph = null;
    if (intent.genericSalt && DRUG_MONOGRAPHS[intent.genericSalt]) {
      monograph = DRUG_MONOGRAPHS[intent.genericSalt];
    } else {
      // Fuzzy search in drug monographs
      const queryLower = message.toLowerCase();
      for (const [key, mono] of Object.entries(DRUG_MONOGRAPHS)) {
        if (queryLower.includes(key) || queryLower.includes(mono.name.toLowerCase())) {
          monograph = mono;
          break;
        }
      }
    }

    // Grounded database query from real inventory
    const matchedMedicines = await searchMedicinesGrounded({
      keyword: intent.keyword,
      category: intent.category,
      maxPrice: intent.maxPrice,
      userLat,
      userLng,
      maxRadius: searchRadius || intent.maxRadius
    });

    const aiResponseText = generateAIResponse(intent, matchedMedicines, monograph);

    res.json({
      success: true,
      query: message,
      intent,
      aiResponse: aiResponseText,
      medicineInfo: monograph,
      data: matchedMedicines.slice(0, 5),
      totalMatches: matchedMedicines.length
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Natural Language Search Endpoint
 * @route   GET /api/ai/search
 * @access  Public
 */
const aiSearch = async (req, res, next) => {
  try {
    const { q, lat, lng, radius = 25 } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, message: 'Query parameter q is required.' });
    }

    const userLat = lat !== undefined && lat !== null ? Number(lat) : (req.user?.latitude ? Number(req.user.latitude) : 12.9716);
    const userLng = lng !== undefined && lng !== null ? Number(lng) : (req.user?.longitude ? Number(req.user.longitude) : 77.5946);

    const intent = await extractSearchIntent(q);
    const matchedMedicines = await searchMedicinesGrounded({
      keyword: intent.keyword,
      category: intent.category,
      maxPrice: intent.maxPrice,
      userLat,
      userLng,
      maxRadius: Number(radius)
    });

    const explanation = generateAIResponse(intent, matchedMedicines, null);

    res.json({
      success: true,
      intent,
      aiResponse: explanation,
      data: matchedMedicines,
      count: matchedMedicines.length
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    AI Pharmacy Restock Advisor for Pharmacist Dashboard
 * @route   GET /api/ai/inventory-advice
 * @access  Private (Pharmacy Owner)
 */
const getInventoryAdvice = async (req, res, next) => {
  try {
    const pharmacyId = req.user?.id || req.user?._id;
    const forecast = await calculateDemandForecast(pharmacyId);

    const criticalItems = forecast.filter(f => f.urgency === 'CRITICAL' || f.daysUntilStockout <= 5);
    const highItems = forecast.filter(f => f.urgency === 'HIGH' && f.daysUntilStockout > 5);

    let summary = `Analyzed ${forecast.length} medicines in your catalog. `;
    if (criticalItems.length > 0) {
      summary += `⚠️ **${criticalItems.length} items** are at imminent risk of stockout within 5 days. We recommend ordering safety restock batches immediately. `;
    } else {
      summary += `Your inventory levels are currently healthy with no immediate stockouts projected. `;
    }

    res.json({
      success: true,
      data: {
        summary,
        priorities: criticalItems.concat(highItems).slice(0, 10),
        fullForecast: forecast
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  chatWithAI,
  aiSearch,
  getInventoryAdvice
};
