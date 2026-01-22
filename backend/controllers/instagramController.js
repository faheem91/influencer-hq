const instagramGraphService = require('../services/instagramGraphService');

/**
 * Search Instagram posts by keyword (hashtag or username) with pagination
 * GET /api/instagram/search?keyword={keyword}&page={page}&limit={limit}
 *
 * Uses official Instagram Graph API
 */
exports.searchPosts = async (req, res) => {
    try {
        const { keyword, page = 1, limit = 10 } = req.query;

        // Validate keyword parameter
        if (!keyword) {
            return res.status(400).json({
                success: false,
                error: 'Keyword parameter is required',
                usage: 'GET /api/instagram/search?keyword=travel&page=1&limit=10',
            });
        }

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;

        console.log(`\n📡 API Request: Search for "${keyword}" (page ${pageNum}, limit ${limitNum})`);

        // Search for posts using Graph API
        const posts = await instagramGraphService.searchByKeyword(keyword);

        // Apply pagination
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedPosts = posts.slice(startIndex, endIndex);
        const totalPosts = posts.length;
        const totalPages = Math.ceil(totalPosts / limitNum);

        // Response
        return res.status(200).json({
            success: true,
            data: {
                keyword: keyword,
                totalPosts,
                page: pageNum,
                limit: limitNum,
                totalPages,
                hasMore: pageNum < totalPages,
                posts: paginatedPosts,
            },
            message: `Found ${totalPosts} posts for keyword "${keyword}" (showing ${paginatedPosts.length})`,
        });
    } catch (error) {
        console.error('❌ Search API Error:', error.message);

        // Handle Graph API specific errors
        if (error.response?.data?.error?.code === 24) {
            return res.status(429).json({
                success: false,
                error: 'Hashtag search limit reached',
                message: 'Instagram limits hashtag searches to 30 unique hashtags per 7 days',
                details: error.response?.data?.error?.message || error.message,
            });
        }

        if (error.response?.data?.error?.code === 190) {
            return res.status(401).json({
                success: false,
                error: 'Access token expired or invalid',
                message: 'Please refresh your Instagram access token',
                details: error.response?.data?.error?.message || error.message,
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
 * Test endpoint to check if Instagram Graph API connection is working
 * GET /api/instagram/test
 */
exports.testConnection = async (req, res) => {
    try {
        console.log('\n🧪 Testing Instagram Graph API connection...');
        const result = await instagramGraphService.testConnection();

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Instagram Graph API connection successful',
                account: result.account,
                timestamp: new Date().toISOString(),
            });
        } else {
            return res.status(500).json({
                success: false,
                error: 'Connection test failed',
                message: result.error,
            });
        }
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
        const accountInfo = await instagramGraphService.getAccountInfo();

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
 * Logout from Instagram (Graph API doesn't have session-based login)
 * POST /api/instagram/logout
 */
exports.logout = async (req, res) => {
    // Graph API uses tokens, no logout needed
    return res.status(200).json({
        success: true,
        message: 'Graph API uses access tokens - no logout needed',
    });
};

/**
 * Refresh access token
 * POST /api/instagram/refresh-token
 */
exports.refreshToken = async (req, res) => {
    try {
        const result = await instagramGraphService.refreshToken();

        return res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            expiresIn: result.expires_in,
        });
    } catch (error) {
        console.error('❌ Token refresh error:', error.message);

        return res.status(500).json({
            success: false,
            error: 'Token refresh failed',
            message: error.message,
        });
    }
};

/**
 * Search Instagram posts - return all results (for export)
 * GET /api/instagram/search/all?keyword={keyword}
 */
exports.searchPostsAll = async (req, res) => {
    try {
        const { keyword } = req.query;

        // Validate keyword parameter
        if (!keyword) {
            return res.status(400).json({
                success: false,
                error: 'Keyword parameter is required',
                usage: 'GET /api/instagram/search/all?keyword=travel',
            });
        }

        console.log(`\n📡 API Request: Search ALL for "${keyword}"`);

        // Search for posts using Graph API
        const posts = await instagramGraphService.searchByKeyword(keyword);

        // Response with all posts (no pagination)
        return res.status(200).json({
            success: true,
            data: {
                keyword: keyword,
                totalPosts: posts.length,
                posts: posts,
            },
            message: `Found ${posts.length} posts for keyword "${keyword}"`,
        });
    } catch (error) {
        console.error('❌ Search All API Error:', error.message);

        return res.status(500).json({
            success: false,
            error: 'Search failed',
            message: error.message,
        });
    }
};
