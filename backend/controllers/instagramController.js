const instagramService = require('../services/instagramService');

/**
 * Search Instagram posts by keyword (hashtag or mention)
 * GET /api/instagram/search?keyword={keyword}
 */
exports.searchPosts = async (req, res) => {
    try {
        const { keyword } = req.query;

        // Validate keyword parameter
        if (!keyword) {
            return res.status(400).json({
                success: false,
                error: 'Keyword parameter is required',
                usage: 'GET /api/instagram/search?keyword=avneetkaur_13',
            });
        }

        console.log(`\n📡 API Request: Search for "${keyword}"`);

        // Search for posts
        const results = await instagramService.searchByKeyword(keyword);

        // Combine all posts
        const allPosts = [...results.hashtagPosts, ...results.mentionPosts];

        // Response
        return res.status(200).json({
            success: true,
            data: {
                keyword: results.keyword,
                totalPosts: results.totalPosts,
                hashtagResults: {
                    count: results.hashtagPosts.length,
                    posts: results.hashtagPosts,
                },
                mentionResults: {
                    count: results.mentionPosts.length,
                    posts: results.mentionPosts,
                },
                allPosts,
            },
            message: `Found ${results.totalPosts} posts for keyword "${keyword}"`,
        });
    } catch (error) {
        console.error('❌ Search API Error:', error.message);

        // Handle specific Instagram errors
        if (error.message.includes('checkpoint')) {
            return res.status(403).json({
                success: false,
                error: 'Instagram checkpoint required',
                message: 'Please log in to Instagram from a web browser and complete the verification',
                details: error.message,
            });
        }

        if (error.message.includes('login') || error.message.includes('password') || error.message.includes('authentication')) {
            return res.status(401).json({
                success: false,
                error: 'Instagram authentication failed',
                message: 'Please check your Instagram credentials in .env file',
                details: error.message,
            });
        }

        if (error.message.includes('Two-factor') || error.message.includes('2FA')) {
            return res.status(401).json({
                success: false,
                error: 'Two-factor authentication error',
                message: 'Please disable 2FA on your Instagram account for API access',
                details: error.message,
            });
        }

        if (error.message.includes('rate') || error.message.includes('limit')) {
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded',
                message: 'Please wait a few minutes before trying again',
                details: error.message,
            });
        }

        // Generic error
        return res.status(500).json({
            success: false,
            error: 'Search failed',
            message: error.message,
        });
    }
};

/**
 * Test endpoint to check if Instagram login is working
 * GET /api/instagram/test
 */
exports.testConnection = async (req, res) => {
    try {
        console.log('\n🧪 Testing Instagram connection...');
        await instagramService.login();
        
        return res.status(200).json({
            success: true,
            message: 'Instagram connection successful (using instagram-private-api)',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        
        return res.status(500).json({
            success: false,
            error: 'Connection test failed',
            message: error.message,
        });
    }
};

/**
 * Get Instagram account info
 * GET /api/instagram/account
 */
exports.getAccountInfo = async (req, res) => {
    try {
        const accountInfo = await instagramService.getAccountInfo();
        
        return res.status(200).json({
            success: true,
            data: accountInfo,
        });
    } catch (error) {
        console.error('❌ Account info error:', error.message);
        
        return res.status(500).json({
            success: false,
            error: 'Failed to get account info',
            message: error.message,
        });
    }
};

/**
 * Logout from Instagram
 * POST /api/instagram/logout
 */
exports.logout = async (req, res) => {
    try {
        await instagramService.logout();
        
        return res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        console.error('❌ Logout error:', error.message);
        
        return res.status(500).json({
            success: false,
            error: 'Logout failed',
            message: error.message,
        });
    }
};
