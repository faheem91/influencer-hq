require('dotenv').config();

module.exports = {
    // Instagram API Credentials
    instagram: {
        appId: "2162351211171016",
        appSecret: "37e79ccb542f0c4b41e442c5a070c24d",
        redirectUri: "http://localhost:4000/api/instagram/callback",

        // API Endpoints
        apiBaseUrl: 'https://graph.instagram.com',
        oauthBaseUrl: 'https://api.instagram.com',

        // Required Scopes
        scopes: [
            'user_profile',    // Get profile info
            'user_media',      // Get user's media
            // Note: Hashtag search requires Instagram Graph API (Business/Creator account)
        ],

        // API Version
        apiVersion: 'v18.0',
    },

    // Server Configuration
    server: {
        port: process.env.PORT || 4000,
        sessionSecret: process.env.SESSION_SECRET || 'instagram-scraper-secret',
    },

    // Rate Limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100, // Limit each IP to 100 requests per windowMs
    }
};