/**
 * MediFind AI Discovery Assistant Service
 * Natural language intent extraction via Google Gemini LLM with offline fallback,
 * pharmacology monograph retrieval, and grounded recommendation ranking.
 */

// Grounded Drug Knowledge Base (General educational info with required disclaimer)
const DRUG_MONOGRAPHS = {
  'paracetamol': {
    name: 'Paracetamol (Acetaminophen)',
    category: 'Analgesic & Antipyretic',
    commonUses: ['Fever reduction', 'Mild to moderate pain relief (headache, body ache, toothache)'],
    dosageForms: ['Tablet 500mg/650mg', 'Syrup 120mg/5ml', 'Suppository'],
    commonPrecautions: [
      'Do not exceed 4,000mg (4 grams) in 24 hours to prevent liver injury.',
      'Avoid combining with other products containing paracetamol/acetaminophen.',
      'Consult a doctor if fever or pain persists beyond 3 consecutive days.'
    ],
    storage: 'Store below 30°C in a dry place away from direct sunlight.',
    disclaimer: '⚠️ General educational information only. Consult a licensed doctor or pharmacist for diagnosis, treatment decisions, or personalized dosage.'
  },
  'cetirizine': {
    name: 'Cetirizine Hydrochloride',
    category: 'Anti-Allergic (Second-Generation Antihistamine)',
    commonUses: ['Allergic rhinitis (runny nose, sneezing)', 'Urticaria (itchy skin hives)', 'Watery itchy eyes'],
    dosageForms: ['Tablet 10mg', 'Syrup 5mg/5ml'],
    commonPrecautions: [
      'May cause mild drowsiness in some individuals; avoid operating heavy machinery if affected.',
      'Avoid alcohol consumption while taking this medication.',
      'Safe for short-term allergy flare-ups; consult doctor for chronic symptoms.'
    ],
    storage: 'Store in a cool dry place below 25°C.',
    disclaimer: '⚠️ General educational information only. Consult a licensed doctor or pharmacist for diagnosis, treatment decisions, or personalized dosage.'
  },
  'pantoprazole': {
    name: 'Pantoprazole',
    category: 'Gastrointestinal (Proton Pump Inhibitor)',
    commonUses: ['Gastroesophageal reflux disease (GERD / Acidity)', 'Heartburn relief', 'Gastric ulcer symptom relief'],
    dosageForms: ['Tablet 40mg (Enteric-coated)', 'Capsule DSR with Domperidone'],
    commonPrecautions: [
      'Take 30–60 minutes before breakfast with a full glass of water.',
      'Swallow whole; do not crush or chew enteric-coated tablets.',
      'Inform your doctor if taking for longer than 14 consecutive days.'
    ],
    storage: 'Store protected from moisture at room temperature.',
    disclaimer: '⚠️ General educational information only. Consult a licensed doctor or pharmacist for diagnosis, treatment decisions, or personalized dosage.'
  },
  'amoxicillin': {
    name: 'Amoxicillin',
    category: 'Antibiotics (Penicillin Class)',
    commonUses: ['Bacterial respiratory infections', 'Ear, nose, throat bacterial infections'],
    dosageForms: ['Capsule 250mg/500mg', 'Tablet 625mg (with Clavulanic Acid)'],
    commonPrecautions: [
      'Valid doctor prescription is strictly required before dispensing.',
      'Complete the entire prescribed antibiotic course even if symptoms resolve early.',
      'Do not use for viral infections (common cold, flu).'
    ],
    storage: 'Keep in original packaging below 25°C.',
    disclaimer: '⚠️ General educational information only. Consult a licensed doctor or pharmacist for diagnosis, treatment decisions, or personalized dosage.'
  },
  'ors': {
    name: 'Oral Rehydration Salts (ORS)',
    category: 'Rehydration & Electrolyte Replacement',
    commonUses: ['Dehydration caused by diarrhea, vomiting, or excessive sweating / heat exhaustion'],
    dosageForms: ['Sachet powder for 1 Litre solution', 'Ready-to-drink tetra pack'],
    commonPrecautions: [
      'Mix strictly with clean, boiled & cooled water in the exact ratio specified on the sachet.',
      'Do not add sugar, milk, or fruit juice to the mixed solution.',
      'Discard unused solution after 24 hours.'
    ],
    storage: 'Store sachets in a cool, dry place.',
    disclaimer: '⚠️ General educational information only. Consult a licensed doctor or pharmacist for diagnosis, treatment decisions, or personalized dosage.'
  }
};

/**
 * Deterministic Rule-Based Fallback Parser
 */
const extractSearchIntentRuleBased = (userPrompt) => {
  const prompt = (userPrompt || '').toLowerCase();

  const intent = {
    intent: 'medicine_search',
    keyword: '',
    category: '',
    maxPrice: null,
    maxRadius: 25,
    requiresEmergency: false,
    genericSalt: null,
    isMonographQuery: false,
    llmSummary: ''
  };

  // Check emergency intent
  if (prompt.includes('emergency') || prompt.includes('urgent') || prompt.includes('fast') || prompt.includes('asap')) {
    intent.requiresEmergency = true;
  }

  // Check explanation intent
  if (prompt.includes('what is') || prompt.includes('used for') || prompt.includes('side effect') || prompt.includes('precaution') || prompt.includes('how to take')) {
    intent.isMonographQuery = true;
    intent.intent = 'monograph_explanation';
  }

  // Category identification
  if (prompt.includes('pain') || prompt.includes('fever') || prompt.includes('headache') || prompt.includes('body ache') || prompt.includes('paracetamol') || prompt.includes('dolo')) {
    intent.category = 'Analgesic';
  } else if (prompt.includes('acid') || prompt.includes('gas') || prompt.includes('heartburn') || prompt.includes('stomach') || prompt.includes('digestion') || prompt.includes('pantoprazole') || prompt.includes('omeprazole')) {
    intent.category = 'Gastrointestinal';
  } else if (prompt.includes('allergy') || prompt.includes('cold') || prompt.includes('sneeze') || prompt.includes('cough') || prompt.includes('cetirizine') || prompt.includes('runny nose')) {
    intent.category = 'Respiratory';
  } else if (prompt.includes('infection') || prompt.includes('antibiotic') || prompt.includes('amoxicillin')) {
    intent.category = 'Antibiotics';
  } else if (prompt.includes('dehydration') || prompt.includes('diarrhea') || prompt.includes('ors') || prompt.includes('electral')) {
    intent.category = 'Rehydration';
  }

  // Price constraint extraction (e.g., "under 50", "below 100")
  const priceMatch = prompt.match(/(?:under|below|less than|within|max)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
  if (priceMatch) {
    intent.maxPrice = Number(priceMatch[1]);
  }

  // Radius constraint extraction (e.g., "within 5 km")
  const radiusMatch = prompt.match(/(\d+)\s*(?:km|kms|kilometer|kilometers)/i);
  if (radiusMatch) {
    intent.maxRadius = Number(radiusMatch[1]);
  }

  // Check generic salts
  for (const salt of Object.keys(DRUG_MONOGRAPHS)) {
    if (prompt.includes(salt)) {
      intent.genericSalt = salt;
      break;
    }
  }

  const cleaned = prompt
    .replace(/(?:find|search|where can i get|where is|i need|looking for|medicine for|tablet for|near me|under \d+|within \d+ km|cheapest|please|available)/gi, '')
    .trim();

  intent.keyword = cleaned.length > 1 ? cleaned : (intent.genericSalt || intent.category || 'medicine');

  return intent;
};

/**
 * Natural language intent parsing using Google Gemini LLM API with fallback
 */
const extractSearchIntent = async (userPrompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || typeof userPrompt !== 'string' || !userPrompt.trim()) {
    return extractSearchIntentRuleBased(userPrompt);
  }

  try {
    const systemPrompt = `You are MediFind's clinical NLP assistant for an emergency pharmacy search system.
Extract structured medicine discovery parameters from this user query: "${userPrompt}".

Return ONLY a valid, raw JSON object (strictly no markdown formatting, no code blocks, no backticks) with these exact keys:
{
  "intent": "medicine_search" | "monograph_explanation" | "pharmacy_recommendation" | "general",
  "keyword": "<core search term e.g. acidity, paracetamol, dolo, cetirizine>",
  "category": "<Analgesic | Antibiotics | Gastrointestinal | Respiratory | Cardiovascular | Diabetes | Supplements | Rehydration | Anti-Allergic | >",
  "genericSalt": "<paracetamol | cetirizine | pantoprazole | amoxicillin | ors | null>",
  "maxPrice": <number or null>,
  "maxRadius": <number in km or 25>,
  "requiresEmergency": <true or false>,
  "isMonographQuery": <true or false>,
  "llmSummary": "<1-2 sentence factual, non-prescriptive explanation of what the user is looking for, keeping safety in mind>"
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      }),
      signal: AbortSignal.timeout(4000) // 4s timeout
    });

    if (!response.ok) {
      return extractSearchIntentRuleBased(userPrompt);
    }

    const jsonRes = await response.json();
    const rawText = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Sanitize JSON
    const cleanJsonText = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJsonText);

    // Merge with defaults
    return {
      intent: parsed.intent || 'medicine_search',
      keyword: parsed.keyword || parsed.genericSalt || parsed.category || userPrompt.trim(),
      category: parsed.category || '',
      genericSalt: parsed.genericSalt || null,
      maxPrice: parsed.maxPrice !== undefined ? parsed.maxPrice : null,
      maxRadius: parsed.maxRadius || 25,
      requiresEmergency: Boolean(parsed.requiresEmergency),
      isMonographQuery: Boolean(parsed.isMonographQuery || parsed.intent === 'monograph_explanation'),
      llmSummary: parsed.llmSummary || ''
    };
  } catch (err) {
    // Fallback gracefully to rule-based parser on network/API failure
    return extractSearchIntentRuleBased(userPrompt);
  }
};

/**
 * Multi-factor recommendation algorithm
 * Calculates a composite score based on distance, price, rating, and live stock
 */
const calculateRecommendationScore = (medicine, userCoords = null) => {
  let score = 100;

  const stock = Number(medicine.stock || 0);
  if (stock === 0) return 0; // Out of stock items get 0 score
  if (stock < 5) score -= 15; // Penalize low stock risk

  const price = Number(medicine.price || 0);
  if (price > 0) {
    score -= Math.min(30, price * 0.1); // Lower price bonus
  }

  const pharmacy = medicine.pharmacy || {};
  const rating = Number(pharmacy.rating || 4.5);
  score += (rating - 3) * 10; // High rating bonus

  const distance = Number(pharmacy.distance !== undefined ? pharmacy.distance : 5);
  score -= Math.min(40, distance * 3); // Proximity bonus

  return Math.max(1, Number(score.toFixed(1)));
};

/**
 * Generate natural language grounded explanation
 */
const generateAIResponse = (intent, matchedMedicines = [], monograph = null) => {
  if (intent.isMonographQuery && monograph) {
    return `**${monograph.name}** is commonly used for ${monograph.commonUses.join(', ')}.\n\n` +
      `**Safety & Precautions:** ${monograph.commonPrecautions[0]}\n\n` +
      `*${monograph.disclaimer}*`;
  }

  if (matchedMedicines.length === 0) {
    return `I searched verified pharmacies within ${intent.maxRadius} km, but found no active stock matching "${intent.keyword || intent.category}". ` +
      `You can expand the search radius or try searching with generic salt names like Paracetamol or Pantoprazole.`;
  }

  const topMatch = matchedMedicines[0];
  const lowestPrice = [...matchedMedicines].sort((a, b) => a.price - b.price)[0];
  const nearest = [...matchedMedicines].sort((a, b) => (a.pharmacy?.distance || 99) - (b.pharmacy?.distance || 99))[0];

  let explanation = intent.llmSummary ? `${intent.llmSummary}\n\n` : '';
  explanation += `Found **${matchedMedicines.length} verified pharmacy options** for you. `;

  if (nearest && nearest.pharmacy?.shopName) {
    explanation += `**${nearest.pharmacy.shopName}** is the closest option (${nearest.pharmacy.distance || 0} km away, ₹${nearest.price}). `;
  }

  if (lowestPrice && lowestPrice.pharmacy?.shopName && lowestPrice._id !== nearest?._id) {
    explanation += `For the lowest price, **${lowestPrice.pharmacy.shopName}** offers it at ₹${lowestPrice.price}. `;
  }

  explanation += `\n\n*⚠️ General educational information only. Consult a licensed doctor or pharmacist for medical advice.*`;

  return explanation;
};

module.exports = {
  DRUG_MONOGRAPHS,
  extractSearchIntent,
  extractSearchIntentRuleBased,
  calculateRecommendationScore,
  generateAIResponse
};
