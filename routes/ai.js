const express = require('express');
const router = express.Router();
const { chatWithAI, aiSearch, getInventoryAdvice } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

router.post('/chat', chatWithAI);
router.get('/search', aiSearch);
router.get('/inventory-advice', protect, authorize('pharmacy'), getInventoryAdvice);

module.exports = router;
