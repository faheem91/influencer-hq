const axios = require('axios');

class InstagramApifyService {
  constructor() {
    this.apiToken = process.env.APIFY_API_TOKEN;
    this.baseUrl = 'https://api.apify.com/v2';

    // Actor IDs for Instagram scraping
    this.hashtagActorId = 'apify~instagram-hashtag-scraper';
    this.profileActorId = 'apify~instagram-profile-scraper';
  }

  /**
   * Search Instagram posts by hashtag using Apify
   */
  async searchHashtag(hashtag) {
    const cleanHashtag = hashtag.replace(/^#/, '');
    console.log(`🔍 Apify: Searching hashtag #${cleanHashtag}`);

    if (!this.apiToken) {
      throw new Error('APIFY_API_TOKEN not configured');
    }

    try {
      // Run the Instagram hashtag scraper actor
      const runResponse = await axios.post(
        `${this.baseUrl}/acts/${this.hashtagActorId}/runs?token=${this.apiToken}`,
        {
          hashtags: [cleanHashtag],
          resultsLimit: 30,
          searchType: 'hashtag',
          searchLimit: 1
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000 // 2 minute timeout for starting
        }
      );

      const runId = runResponse.data.data.id;
      console.log(`   Started Apify run: ${runId}`);

      // Wait for the run to complete
      const results = await this.waitForRunAndGetResults(runId);

      console.log(`   ✅ Apify found ${results.length} posts`);

      // Transform to expected format
      return results.map(post => this.transformPost(post, cleanHashtag));
    } catch (error) {
      console.error(`❌ Apify hashtag search failed:`, error.message);
      throw error;
    }
  }

  /**
   * Search Instagram posts by username using Apify
   */
  async searchByUsername(username) {
    const cleanUsername = username.replace(/^@/, '');
    console.log(`🔍 Apify: Searching user @${cleanUsername}`);

    if (!this.apiToken) {
      throw new Error('APIFY_API_TOKEN not configured');
    }

    try {
      // Run the Instagram profile scraper actor
      const runResponse = await axios.post(
        `${this.baseUrl}/acts/${this.profileActorId}/runs?token=${this.apiToken}`,
        {
          usernames: [cleanUsername],
          resultsLimit: 20
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000
        }
      );

      const runId = runResponse.data.data.id;
      console.log(`   Started Apify run: ${runId}`);

      // Wait for the run to complete
      const results = await this.waitForRunAndGetResults(runId);

      console.log(`   ✅ Apify found ${results.length} posts`);

      // Transform to expected format
      return results.map(post => this.transformPost(post, `@${cleanUsername}`));
    } catch (error) {
      console.error(`❌ Apify user search failed:`, error.message);
      throw error;
    }
  }

  /**
   * Wait for Apify run to complete and get results
   */
  async waitForRunAndGetResults(runId, maxWaitTime = 180000) {
    const startTime = Date.now();
    const pollInterval = 5000; // Check every 5 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check run status
        const statusResponse = await axios.get(
          `${this.baseUrl}/actor-runs/${runId}?token=${this.apiToken}`
        );

        const status = statusResponse.data.data.status;
        console.log(`   Run status: ${status}`);

        if (status === 'SUCCEEDED') {
          // Get results from default dataset
          const datasetId = statusResponse.data.data.defaultDatasetId;
          const resultsResponse = await axios.get(
            `${this.baseUrl}/datasets/${datasetId}/items?token=${this.apiToken}`
          );

          return resultsResponse.data || [];
        }

        if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
          throw new Error(`Apify run ${status}`);
        }

        // Still running, wait and check again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        if (error.message.includes('Apify run')) {
          throw error;
        }
        console.error(`   Error checking run status:`, error.message);
      }
    }

    throw new Error('Apify run timed out');
  }

  /**
   * Transform Apify result to our expected format
   */
  transformPost(post, sourceValue) {
    // Apify returns different formats depending on the actor
    // Handle both hashtag scraper and profile scraper formats

    return {
      id: post.id || post.shortCode || post.pk,
      shortcode: post.shortCode || post.code,
      caption: post.caption || post.text || '',
      mediaType: this.getMediaType(post),
      mediaUrl: post.displayUrl || post.url || post.imageUrl || null,
      permalink: post.url || `https://www.instagram.com/p/${post.shortCode || post.code}/`,
      timestamp: this.parseTimestamp(post),

      creator: {
        username: post.ownerUsername || post.username || post.owner?.username || 'unknown',
        fullName: post.ownerFullName || post.fullName || post.owner?.fullName || '',
        profilePicUrl: post.profilePicUrl || post.owner?.profilePicUrl || null
      },

      engagement: {
        likes: post.likesCount || post.likeCount || post.likes || 0,
        comments: post.commentsCount || post.commentCount || post.comments || 0
      },

      source: {
        type: sourceValue.startsWith('@') ? 'user' : 'hashtag',
        value: sourceValue
      }
    };
  }

  getMediaType(post) {
    if (post.type) return post.type.toUpperCase();
    if (post.isVideo || post.videoUrl) return 'VIDEO';
    if (post.childPosts || post.sidecarChildren) return 'CAROUSEL';
    return 'IMAGE';
  }

  parseTimestamp(post) {
    try {
      // Try different timestamp fields
      const ts = post.timestamp || post.takenAtTimestamp || post.takenAt;

      if (!ts) return null;

      // If it's already a string in ISO format
      if (typeof ts === 'string' && ts.includes('T')) {
        return ts;
      }

      // If it's a Unix timestamp (seconds)
      if (typeof ts === 'number') {
        // If it's in milliseconds (13 digits), convert to seconds
        const timestamp = ts > 9999999999 ? ts : ts * 1000;
        return new Date(timestamp).toISOString();
      }

      // If it's a date string
      const date = new Date(ts);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }

      return null;
    } catch (e) {
      return null;
    }
  }
}

module.exports = new InstagramApifyService();
