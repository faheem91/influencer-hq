const axios = require('axios');

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

      // Fields differ based on API type
      const fields = this.apiType === 'basic'
        ? 'id,username,media_count'
        : 'id,username,account_type,media_count';

      const response = await axios.get(`${this.baseUrl}/me`, {
        params: {
          fields,
          access_token: this.accessToken
        }
      });

      this.userId = response.data.id;
      this.username = response.data.username;
      this.isInitialized = true;

      console.log(`✅ Instagram ${this.apiType === 'basic' ? 'Basic Display' : 'Graph'} API initialized`);
      console.log(`   Account: @${this.username} (ID: ${this.userId})`);
      if (response.data.account_type) {
        console.log(`   Type: ${response.data.account_type}`);
      }
      console.log(`   Media Count: ${response.data.media_count}`);

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

    // Basic Display API doesn't support hashtag search
    if (this.apiType === 'basic') {
      console.log(`⚠️  Hashtag search not available with Basic Display API`);
      console.log(`   Returning own media instead. For hashtag search, use a Business account token.`);
      // Return own media as fallback
      return this.getOwnMedia();
    }

    try {
      // Remove # if present
      const cleanHashtag = hashtag.replace(/^#/, '');
      console.log(`🔍 Searching hashtag: #${cleanHashtag}`);

      // Step 1: Get hashtag ID (Business Graph API only)
      const hashtagSearchResponse = await axios.get(`https://graph.facebook.com/v18.0/ig_hashtag_search`, {
        params: {
          user_id: this.userId,
          q: cleanHashtag,
          access_token: this.accessToken
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
          access_token: this.accessToken
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

      // For other users, we can't directly fetch their media with Graph API
      // Return empty with a note
      console.log(`   Note: Graph API cannot fetch media from other users directly`);
      return [];
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
