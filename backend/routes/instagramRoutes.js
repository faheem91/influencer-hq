const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/instagramController');

/**
 * Instagram API Routes
 */

// Search posts by keyword with pagination (hashtag or mention)
// Example: GET /api/instagram/search?keyword=avneetkaur_13&page=1&limit=10
router.get('/api/instagram/search', instagramController.searchPosts);

// Search posts - return all results (for export)
// Example: GET /api/instagram/search/all?keyword=avneetkaur_13
router.get('/api/instagram/search/all', instagramController.searchPostsAll);

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
