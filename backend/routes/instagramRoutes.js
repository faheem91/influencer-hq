const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/instagramController');

/**
 * Instagram API Routes
 */

// Search posts by keyword (hashtag or mention)
// Example: GET /api/instagram/search?keyword=avneetkaur_13
router.get('/api/instagram/search', instagramController.searchPosts);

// Test Instagram connection
// Example: GET /api/instagram/test
router.get('/api/instagram/test', instagramController.testConnection);

// Get account info
// Example: GET /api/instagram/account
router.get('/api/instagram/account', instagramController.getAccountInfo);

// Logout from Instagram
// Example: POST /api/instagram/logout
router.post('/api/instagram/logout', instagramController.logout);

module.exports = router;
