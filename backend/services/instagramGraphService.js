const axios = require('axios');
const instagramPlaywrightService = require('./instagramPlaywrightService');

class InstagramGraphService {
  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    this.appId = process.env.INSTAGRAM_APP_ID;
    this.appSecret = process.env.INSTAGRAM_APP_SECRET;
    this.userId = null;
    this.username = null;
    this.isInitialized = false;
    this.apiType = null; // 'basic' or 'business'

    // Determine API type based on token prefix
    // IGA tokens = Basic Display API, EAA tokens = Business/Graph API
    if (this.accessToken?.startsWith('IGA')) {
      this.baseUrl = 'https://graph.instagram.com';
      this.apiType = 'basic';
    } else {
      this.baseUrl = 'https://graph.facebook.com/v18.0';
      this.apiType = 'business';
    }
  }

  async initialize() {
    if (this.isInitialized) return true;

    try {
      console.log(`🔄 Initializing Instagram ${this.apiType === 'basic' ? 'Basic Display' : 'Graph'} API...`);

      if (!this.accessToken) {
        throw new Error('INSTAGRAM_ACCESS_TOKEN not configured');
      }

      if (this.apiType === 'basic') {
        // Basic Display API - use Instagram endpoint
        const response = await axios.get(`${this.baseUrl}/me`, {
          params: {
            fields: 'id,username,media_count',
            access_token: this.accessToken
          }
        });

        this.userId = response.data.id;
        this.username = response.data.username;
        this.isInitialized = true;

        console.log(`✅ Instagram Basic Display API initialized`);
        console.log(`   Account: @${this.username} (ID: ${this.userId})`);
        console.log(`   Media Count: ${response.data.media_count}`);
      } else {
        // Business Graph API - need to find Instagram Business Account via Facebook Pages
        console.log(`   Looking for Instagram Business Account via Facebook Pages...`);

        // First get Facebook Pages the token has access to
        const pagesResponse = await axios.get(`${this.baseUrl}/me/accounts`, {
          params: {
            access_token: this.accessToken
          }
        });

        if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
          throw new Error('No Facebook Pages found. Make sure your token has access to a Facebook Page connected to Instagram.');
        }

        // Find a page with Instagram Business Account
        let instagramAccountId = null;
        let pageAccessToken = null;

        for (const page of pagesResponse.data.data) {
          console.log(`   Checking page: ${page.name} (${page.id})`);

          try {
            const igResponse = await axios.get(`${this.baseUrl}/${page.id}`, {
              params: {
                fields: 'instagram_business_account',
                access_token: page.access_token || this.accessToken
              }
            });

            if (igResponse.data.instagram_business_account) {
              instagramAccountId = igResponse.data.instagram_business_account.id;
              pageAccessToken = page.access_token || this.accessToken;
              console.log(`   ✅ Found Instagram Business Account: ${instagramAccountId}`);
              break;
            }
          } catch (e) {
            console.log(`   Page ${page.name} has no Instagram Business Account`);
          }
        }

        if (!instagramAccountId) {
          throw new Error('No Instagram Business Account found connected to any Facebook Page.');
        }

        // Get Instagram account details
        const igAccountResponse = await axios.get(`${this.baseUrl}/${instagramAccountId}`, {
          params: {
            fields: 'id,username,profile_picture_url,followers_count,media_count',
            access_token: pageAccessToken
          }
        });

        this.userId = igAccountResponse.data.id;
        this.username = igAccountResponse.data.username;
        this.pageAccessToken = pageAccessToken; // Store for API calls
        this.isInitialized = true;

        console.log(`✅ Instagram Graph API initialized`);
        console.log(`   Account: @${this.username} (ID: ${this.userId})`);
        console.log(`   Followers: ${igAccountResponse.data.followers_count || 'N/A'}`);
        console.log(`   Media Count: ${igAccountResponse.data.media_count || 'N/A'}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Instagram API initialization failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async getAccountInfo() {
    await this.initialize();

    // Fields differ based on API type
    // Basic Display API has limited fields
    const fields = this.apiType === 'basic'
      ? 'id,username,media_count'
      : 'id,username,account_type,media_count,profile_picture_url,biography,website,followers_count,follows_count';

    const response = await axios.get(`${this.baseUrl}/me`, {
      params: {
        fields,
        access_token: this.accessToken
      }
    });

    return response.data;
  }

  async searchHashtag(hashtag) {
    await this.initialize();

    // Remove # if present - define outside try for catch block access
    const cleanHashtag = hashtag.replace(/^#/, '');

    // Basic Display API doesn't support hashtag search
    if (this.apiType === 'basic') {
      console.log(`⚠️  Hashtag search not available with Basic Display API`);
      console.log(`   Returning own media instead. For hashtag search, use a Business account token.`);
      // Return own media as fallback
      return this.getOwnMedia();
    }

    try {
      console.log(`🔍 Searching hashtag: #${cleanHashtag}`);

      // Use page access token for Business API calls
      const token = this.pageAccessToken || this.accessToken;

      // Step 1: Get hashtag ID (Business Graph API only)
      const hashtagSearchResponse = await axios.get(`https://graph.facebook.com/v18.0/ig_hashtag_search`, {
        params: {
          user_id: this.userId,
          q: cleanHashtag,
          access_token: token
        }
      });

      if (!hashtagSearchResponse.data.data || hashtagSearchResponse.data.data.length === 0) {
        console.log(`   No hashtag found for: ${cleanHashtag}`);
        return [];
      }

      const hashtagId = hashtagSearchResponse.data.data[0].id;
      console.log(`   Found hashtag ID: ${hashtagId}`);

      // Step 2: Get recent media for this hashtag
      const mediaResponse = await axios.get(`https://graph.facebook.com/v18.0/${hashtagId}/recent_media`, {
        params: {
          user_id: this.userId,
          fields: 'id,caption,media_type,media_url,permalink,timestamp,username,like_count,comments_count',
          access_token: token
        }
      });

      const posts = mediaResponse.data.data || [];
      console.log(`   Found ${posts.length} posts for #${cleanHashtag}`);

      return posts.map(post => this.formatPost(post, cleanHashtag));
    } catch (error) {
      console.error(`❌ Hashtag search failed:`, error.response?.data || error.message);

      // Check for specific API errors
      if (error.response?.data?.error?.code === 24) {
        console.log('   Note: Hashtag search limit reached (30 unique hashtags per 7 days)');
      }

      // Error code 10: Instagram Public Content Access required - fallback to Playwright
      if (error.response?.data?.error?.code === 10) {
        console.log('   ⚠️  Graph API requires "Instagram Public Content Access" permission');
        console.log('   🔄 Falling back to Playwright browser automation...');
        try {
          const results = await instagramPlaywrightService.searchHashtag(cleanHashtag);

          // Check if verification is needed
          if (results.needsVerification) {
            console.log('   ⚠️  Instagram verification required');
            return [];
          }

          console.log(`   ✅ Playwright found ${results.length} posts`);
          return results;
        } catch (playwrightError) {
          console.error('   ❌ Playwright fallback failed:', playwrightError.message);
          throw error; // Throw original Graph API error
        }
      }

      throw error;
    }
  }

  async getOwnMedia() {
    await this.initialize();

    try {
      console.log(`🔍 Getting own media...`);

      const response = await axios.get(`${this.baseUrl}/me/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp,thumbnail_url',
          access_token: this.accessToken
        }
      });

      const posts = response.data.data || [];
      console.log(`   Found ${posts.length} posts`);

      return posts.map(post => this.formatPost(post, 'own'));
    } catch (error) {
      console.error(`❌ Own media fetch failed:`, error.response?.data || error.message);
      throw error;
    }
  }

  async searchTopHashtag(hashtag) {
    await this.initialize();

    try {
      const cleanHashtag = hashtag.replace(/^#/, '');
      console.log(`🔍 Searching top posts for hashtag: #${cleanHashtag}`);

      // Get hashtag ID
      const hashtagSearchResponse = await axios.get(`${this.baseUrl}/ig_hashtag_search`, {
        params: {
          user_id: this.userId,
          q: cleanHashtag,
          access_token: this.accessToken
        }
      });

      if (!hashtagSearchResponse.data.data || hashtagSearchResponse.data.data.length === 0) {
        return [];
      }

      const hashtagId = hashtagSearchResponse.data.data[0].id;

      // Get top media for this hashtag
      const mediaResponse = await axios.get(`${this.baseUrl}/${hashtagId}/top_media`, {
        params: {
          user_id: this.userId,
          fields: 'id,caption,media_type,media_url,permalink,timestamp,username,like_count,comments_count',
          access_token: this.accessToken
        }
      });

      const posts = mediaResponse.data.data || [];
      console.log(`   Found ${posts.length} top posts for #${cleanHashtag}`);

      return posts.map(post => this.formatPost(post, cleanHashtag));
    } catch (error) {
      console.error(`❌ Top hashtag search failed:`, error.response?.data || error.message);
      throw error;
    }
  }

  async getUserMedia(username) {
    await this.initialize();

    try {
      console.log(`🔍 Getting media for user: @${username}`);

      // Note: Graph API can only get media from accounts you manage
      // For other accounts, you need Instagram Basic Display API or scraping

      // If searching own account
      if (username.toLowerCase() === this.username?.toLowerCase()) {
        const response = await axios.get(`${this.baseUrl}/${this.userId}/media`, {
          params: {
            fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,thumbnail_url',
            access_token: this.accessToken
          }
        });

        return response.data.data || [];
      }

      // For other users, fall back to Playwright
      console.log(`   Graph API cannot fetch media from other users directly`);
      console.log(`   🔄 Falling back to Playwright browser automation...`);
      try {
        const results = await instagramPlaywrightService.searchByUsername(username);

        // Check if verification is needed
        if (results.needsVerification) {
          console.log('   ⚠️  Instagram verification required');
          return [];
        }

        console.log(`   ✅ Playwright found ${results.length} posts`);
        return results;
      } catch (playwrightError) {
        console.error('   ❌ Playwright fallback failed:', playwrightError.message);
        return [];
      }
    } catch (error) {
      console.error(`❌ User media fetch failed:`, error.response?.data || error.message);
      throw error;
    }
  }

  async searchByKeyword(keyword) {
    // Determine if it's a hashtag or username search
    if (keyword.startsWith('#')) {
      return this.searchHashtag(keyword);
    } else if (keyword.startsWith('@')) {
      const username = keyword.substring(1);
      return this.getUserMedia(username);
    } else {
      // Default to hashtag search
      return this.searchHashtag(keyword);
    }
  }

  formatPost(post, sourceHashtag = '') {
    return {
      id: post.id,
      shortcode: post.id,
      caption: post.caption || '',
      mediaType: post.media_type,
      mediaUrl: post.media_url || post.thumbnail_url,
      permalink: post.permalink,
      timestamp: post.timestamp,
      takenAt: new Date(post.timestamp).getTime() / 1000,

      // Creator info
      creator: {
        username: post.username || 'unknown',
        fullName: post.username || '',
        profilePicUrl: null,
      },

      // Engagement
      engagement: {
        likes: post.like_count || 0,
        comments: post.comments_count || 0,
      },

      // Source tracking
      source: {
        type: 'hashtag',
        value: sourceHashtag,
      }
    };
  }

  /**
   * Transform private API post format to Graph API format for client compatibility
   * Private API returns: { postId, content: { caption, displayUrl }, creator: { username, fullName, profilePicUrl }, engagement: { likes, comments } }
   * Client expects: { id, caption, mediaUrl, creator: { username, fullName, profilePicUrl }, engagement: { likes, comments }, source: { type, value } }
   */
  transformPrivateApiPost(post, sourceValue = '') {
    const isHashtag = sourceValue.startsWith('#') || !sourceValue.startsWith('@');
    return {
      id: post.postId || post.shortcode,
      shortcode: post.shortcode,
      caption: post.content?.caption || '',
      mediaType: post.content?.mediaType || 'IMAGE',
      mediaUrl: post.content?.displayUrl || post.content?.thumbnailUrl || null,
      permalink: post.permalink,
      timestamp: post.date || new Date(post.timestamp * 1000).toISOString(),
      takenAt: post.timestamp,

      // Creator info - already in correct format
      creator: {
        username: post.creator?.username || 'unknown',
        fullName: post.creator?.fullName || '',
        profilePicUrl: post.creator?.profilePicUrl || null,
      },

      // Engagement - already in correct format
      engagement: {
        likes: post.engagement?.likes || 0,
        comments: post.engagement?.comments || 0,
      },

      // Source tracking
      source: {
        type: isHashtag ? 'hashtag' : 'user',
        value: sourceValue,
      }
    };
  }

  async testConnection() {
    try {
      await this.initialize();
      const accountInfo = await this.getAccountInfo();
      return {
        success: true,
        account: accountInfo
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // Refresh long-lived token (tokens last 60 days, should refresh before expiry)
  async refreshToken() {
    try {
      const response = await axios.get(`${this.baseUrl}/oauth/access_token`, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: this.accessToken
        }
      });

      console.log('✅ Token refreshed successfully');
      console.log(`   New token expires in: ${response.data.expires_in} seconds`);

      return response.data;
    } catch (error) {
      console.error('❌ Token refresh failed:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new InstagramGraphService();
