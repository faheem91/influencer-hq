const { IgApiClient } = require('instagram-private-api');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const SESSION_FILE = path.join(__dirname, '../ig_session.json');

class InstagramService {
    constructor() {
        this.ig = new IgApiClient();
        this.isLoggedIn = false;
    }

    /**
     * Login to Instagram
     */
    async login() {
        if (this.isLoggedIn) {
            return this.ig;
        }

        // Load credentials with fallbacks
        const username = process.env.INSTAGRAM_USERNAME || 'wisetoonsadventures';
        const password = process.env.INSTAGRAM_PASSWORD || 'k03344023457';

        if (!username || !password || username.trim() === '' || password.trim() === '') {
            throw new Error('Instagram credentials not found or invalid. Please set INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD.');
        }

        console.log('🔐 Logging in to Instagram as:', username);
        
        try {
            // Generate device based on username (must be called before any requests)
            this.ig.state.generateDevice(username);
            
            // Try to restore session
            try {
                const sessionData = await fs.readFile(SESSION_FILE, 'utf-8');
                if(sessionData){
                    await this.ig.state.deserialize(sessionData);
                    console.log('✅ Session restored from file');
                    this.isLoggedIn = true;
                    return this.ig;
                }
            } catch (err) {
                console.log('📝 No saved session, performing fresh login...');
            }
            
            // Simulate pre-login flow (recommended to avoid bot detection)
            await this.ig.simulate.preLoginFlow();
            console.log('✅ Pre-login flow completed');
            // Attempt login
            const auth = await this.ig.account.login(username, password);
            console.log('✅ Login successful');
            // Save session
            try {
                const serialized = await this.ig.state.serialize();
                delete serialized.constants; // Remove constants to reduce file size
                await fs.writeFile(SESSION_FILE, JSON.stringify(serialized));
                console.log('💾 Session saved to file');
            } catch (err) {
                console.warn('⚠️  Could not save session:', err.message);
            }
            
            // Simulate post-login flow in background (optional, may fail on some endpoints)
            process.nextTick(async () => {
                try {
                    await this.ig.simulate.postLoginFlow();
                    console.log('✅ Post-login flow completed');
                } catch (err) {
                    // Post-login flow failure is not critical, just log it
                    console.warn('⚠️  Post-login flow skipped (not critical):', err.message);
                }
            });
            
            this.isLoggedIn = true;
            console.log('✅ Successfully logged in to Instagram as');
            console.log('User Name', auth.username);
            console.log('Full Name', auth.full_name);
            console.log('User ID:', auth.pk);
            return this.ig;
        } catch (error) {
            console.error('❌ Instagram login failed:', error);
            console.error('   Error name:', error.name);
            console.error('   Error message:', error.message);
            this.isLoggedIn = false;
            
            // Handle specific errors
            if (error.name === 'IgCheckpointError') {
                throw new Error('Instagram checkpoint required. Please verify your account from a web browser.');
            } else if (error.name === 'IgLoginBadPasswordError') {
                throw new Error('Invalid Instagram username or password.');
            } else if (error.name === 'IgLoginTwoFactorRequiredError') {
                throw new Error('Two-factor authentication is enabled. Please disable it for API access.');
            } else if (error.message && error.message.includes('challenge_required')) {
                throw new Error('Instagram security challenge required. Please log in from a web browser first.');
            } else {
                throw new Error(`Instagram login failed: ${error.message || error}`);
            }
        }
    }

    /**
     * Search Instagram posts by keyword (hashtag or mention)
     * @param {string} keyword - The keyword to search
     *   - If starts with #, search only hashtag
     *   - If starts with @, search only mention/username
     *   - Otherwise, search both
     * @returns {Promise<Object>} Search results with posts
     */
    async searchByKeyword(keyword) {
        console.log('\n=== Instagram Search ===');
        console.log('Keyword:', keyword);

        // Ensure logged in
        await this.login();
        
        const results = {
            keyword,
            hashtagPosts: [],
            mentionPosts: [],
            totalPosts: 0,
        };

        // Determine search type based on prefix
        const isHashtagOnly = keyword.trim().startsWith('#');
        const isMentionOnly = keyword.trim().startsWith('@');
        
        // Clean keyword (remove # and @ if present)
        const cleanKeyword = keyword.replace(/^[@#]/, '').trim();

        if (!cleanKeyword) {
            throw new Error('Please provide a valid keyword');
        }

        try {
            // Search by hashtag (if # prefix or no prefix)
            if (isHashtagOnly || (!isHashtagOnly && !isMentionOnly)) {
                console.log(`🔍 Searching for hashtag: #${cleanKeyword}`);
                const hashtagResults = await this.searchByHashtag(cleanKeyword);
                results.hashtagPosts = hashtagResults;
                console.log(`✅ Found ${hashtagResults.length} posts for hashtag #${cleanKeyword}`);
            } else {
                console.log(`⏭️  Skipping hashtag search (searching mentions only)`);
            }

            // Search by username/mention (if @ prefix or no prefix)
            if (isMentionOnly || (!isHashtagOnly && !isMentionOnly)) {
                console.log(`🔍 Searching for user posts: @${cleanKeyword}`);
                const mentionResults = await this.searchByUsername(cleanKeyword);
                results.mentionPosts = mentionResults;
                console.log(`✅ Found ${mentionResults.length} posts from user @${cleanKeyword}`);
            } else {
                console.log(`⏭️  Skipping mention search (searching hashtags only)`);
            }

            results.totalPosts = results.hashtagPosts.length + results.mentionPosts.length;
            console.log(`📊 Total posts found: ${results.totalPosts}`);
            console.log('✅ Search completed successfully\n');

            return results;
        } catch (error) {
            console.error('❌ Search error:', error.message);
            throw error;
        }
    }

    /**
     * Search posts by hashtag
     * @param {string} hashtag - The hashtag to search (without #)
     * @returns {Promise<Array>} Array of post objects
     */
    async searchByHashtag(hashtag) {
        try {
            await this.login();

            // Use tags() method (plural) instead of tag()
            const tagFeed = this.ig.feed.tags(hashtag, 'recent');
            const allPosts = [];
            let pageCount = 0;
            const maxPages = 5; // Limit to prevent too many requests

            // Keep fetching until no more pages or reach max
            while (pageCount < maxPages) {
                try {
                    const items = await tagFeed.items();
                    
                    if (!items || items.length === 0) {
                        break;
                    }
                    console.log(`   📄 Fetched page ${pageCount + 1} for hashtag #${hashtag} (${items.length} posts)`);
                    allPosts.push(...items);
                    
                    pageCount++;
                    
                    // Check if more items are available
                    if (!tagFeed.isMoreAvailable()) {
                        console.log(`   ℹ️  No more pages available for hashtag #${hashtag}`);
                        break;
                    }
                    
                    // Add delay to avoid rate limiting
                    await this.delay(2000);
                } catch (error) {
                    console.error(`   ⚠️  Failed to fetch page ${pageCount + 1}:`, error.message);
                    break;
                }
            }

            // Format the posts
            return allPosts.map(item => this.formatPost(item, 'hashtag', hashtag));
        } catch (error) {
            console.error(`Error searching hashtag #${hashtag}:`, error.message);
            return [];
        }
    }

    /**
     * Search posts by username
     * @param {string} username - The username to search (without @)
     * @returns {Promise<Array>} Array of post objects
     */
    async searchByUsername(username) {
        try {
            await this.login();

            // Get user ID first
            let userId;
            let userInfo;
            
            try {
                userId = await this.ig.user.getIdByUsername(username);
                userInfo = await this.ig.user.info(userId);
            } catch (error) {
                console.log(`   ⚠️  User @${username} not found or is private`);
                return [];
            }

            // Get user's posts
            const userFeed = this.ig.feed.user(userId);
            const allPosts = [];
            let pageCount = 0;
            const maxPages = 5; // Limit to prevent too many requests

            // Keep fetching until no more pages or reach max
            while (pageCount < maxPages) {
                try {
                    const items = await userFeed.items();
                    
                    if (!items || items.length === 0) {
                        break;
                    }

                    console.log(`   📄 Fetched page ${pageCount + 1} for user @${username} (${items.length} posts)`);
                    allPosts.push(...items);
                    
                    pageCount++;
                    
                    // Check if more items are available
                    if (!userFeed.isMoreAvailable()) {
                        console.log(`   ℹ️  No more pages available for user @${username}`);
                        break;
                    }
                    
                    // Add delay to avoid rate limiting
                    await this.delay(2000);
                } catch (error) {
                    console.error(`   ⚠️  Failed to fetch page ${pageCount + 1}:`, error.message);
                    break;
                }
            }

            // Format the posts with user info
            return allPosts.map(item => this.formatPost(item, 'username', username, userInfo));
        } catch (error) {
            console.error(`Error searching user @${username}:`, error.message);
            return [];
        }
    }

    /**
     * Format post data to include all required information
     * @param {Object} item - Raw post data from Instagram API
     * @param {string} searchType - 'hashtag' or 'username'
     * @param {string} searchTerm - The search term used
     * @param {Object} userInfo - User information (optional)
     * @returns {Object} Formatted post object
     */
    formatPost(item, searchType, searchTerm, userInfo = null) {
        // Get the best available image URL
        const imageUrl = item.image_versions2?.candidates?.[0]?.url || 
                        item.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url || 
                        '';

        // Get thumbnail URL
        const thumbnailUrl = item.image_versions2?.candidates?.[item.image_versions2.candidates.length - 1]?.url || imageUrl;

        // Get video URL if available
        const videoUrl = item.video_versions?.[0]?.url || null;

        // Get caption
        const caption = item.caption?.text || '';

        // Get user information
        const user = item.user || userInfo?.user || {};

        return {
            // Post ID
            postId: item.id || item.pk,
            shortcode: item.code,
            
            // Post Content
            content: {
                caption: caption,
                mediaType: item.media_type === 1 ? 'Photo' : item.media_type === 2 ? 'Video' : 'Carousel',
                displayUrl: imageUrl,
                thumbnailUrl: thumbnailUrl,
                isVideo: item.media_type === 2,
                videoUrl: videoUrl,
                carouselMedia: item.carousel_media ? item.carousel_media.length : 0,
            },
            
            // Creator Profile
            creator: {
                userId: user.pk || 'N/A',
                username: user.username || 'N/A',
                fullName: user.full_name || 'N/A',
                profilePicUrl: user.profile_pic_url || user.hd_profile_pic_url_info?.url || 'N/A',
                isVerified: user.is_verified || false,
                isPrivate: user.is_private || false,
                followerCount: user.follower_count || userInfo?.follower_count || 0,
                followingCount: user.following_count || userInfo?.following_count || 0,
            },
            
            // Date/Time
            timestamp: item.taken_at || item.device_timestamp,
            date: new Date((item.taken_at || item.device_timestamp) * 1000).toISOString(),
            dateFormatted: new Date((item.taken_at || item.device_timestamp) * 1000).toLocaleString(),
            
            // Engagement Metrics
            engagement: {
                likes: item.like_count || 0,
                comments: item.comment_count || 0,
                views: item.view_count || item.play_count || null,
                hasLiked: item.has_liked || false,
            },
            
            // Post URL
            permalink: `https://www.instagram.com/p/${item.code}/`,
            
            // Dimensions
            dimensions: {
                width: item.original_width || 0,
                height: item.original_height || 0,
            },
            
            // Search Info
            searchInfo: {
                searchType,
                searchTerm: searchType === 'hashtag' ? `#${searchTerm}` : `@${searchTerm}`,
            },
            
            // Additional Info
            accessibility: item.accessibility_caption || 'N/A',
            location: item.location ? {
                id: item.location.pk,
                name: item.location.name,
                address: item.location.address || '',
                city: item.location.city || '',
                lat: item.location.lat || null,
                lng: item.location.lng || null,
            } : null,
            
            // Extra metadata
            hasAudio: item.has_audio || false,
            filterType: item.filter_type || 0,
            productType: item.product_type || 'feed',
        };
    }

    /**
     * Delay helper to avoid rate limiting
     * @param {number} ms - Milliseconds to delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get account information
     */
    async getAccountInfo() {
        await this.login();
        
        try {
            const accountInfo = await this.ig.account.currentUser();
            
            return {
                userId: accountInfo.pk,
                username: accountInfo.username,
                fullName: accountInfo.full_name,
                biography: accountInfo.biography,
                isPrivate: accountInfo.is_private,
                isVerified: accountInfo.is_verified,
                profilePicUrl: accountInfo.profile_pic_url,
                followerCount: accountInfo.follower_count,
                followingCount: accountInfo.following_count,
                mediaCount: accountInfo.media_count,
            };
        } catch (error) {
            console.error('Error getting account info:', error.message);
            throw error;
        }
    }

    /**
     * Logout from Instagram
     */
    async logout() {
        if (this.isLoggedIn) {
            try {
                await this.ig.account.logout();
                this.isLoggedIn = false;
                console.log('✅ Logged out from Instagram');
            } catch (error) {
                console.error('❌ Logout error:', error.message);
            }
        }
    }
}

// Export singleton instance
module.exports = new InstagramService();
