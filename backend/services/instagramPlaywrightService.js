const { chromium } = require('playwright');

class InstagramPlaywrightService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isLoggedIn = false;
    this.username = process.env.INSTAGRAM_USERNAME;
    this.password = process.env.INSTAGRAM_PASSWORD;
  }

  async initialize() {
    if (this.browser) return;

    console.log('🎭 Launching Playwright browser...');
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'en-US'
    });

    this.page = await this.context.newPage();
    console.log('✅ Browser initialized');
  }

  async login() {
    if (this.isLoggedIn) return true;

    await this.initialize();

    console.log(`🔐 Logging in to Instagram as: ${this.username}`);

    try {
      // Go to Instagram login page
      await this.page.goto('https://www.instagram.com/accounts/login/', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for and dismiss cookie banner if present
      try {
        const cookieButton = await this.page.waitForSelector('button:has-text("Allow all cookies"), button:has-text("Accept")', { timeout: 5000 });
        if (cookieButton) await cookieButton.click();
      } catch (e) {
        // Cookie banner not present, continue
      }

      // Wait for login form
      await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });

      // Fill in credentials
      await this.page.fill('input[name="username"]', this.username);
      await this.page.fill('input[name="password"]', this.password);

      // Click login button
      await this.page.click('button[type="submit"]');

      // Wait for navigation or error
      await this.page.waitForTimeout(5000);

      // Check if we need to handle 2FA or verification
      const currentUrl = this.page.url();

      if (currentUrl.includes('challenge') || currentUrl.includes('checkpoint')) {
        console.log('⚠️  Verification challenge detected');
        console.log('   URL:', currentUrl);
        // Try to auto-select email verification if available
        try {
          const emailOption = await this.page.waitForSelector('button:has-text("Email"), label:has-text("Email")', { timeout: 5000 });
          if (emailOption) {
            await emailOption.click();
            console.log('   📧 Verification code will be sent to email');
            return { needsVerification: true, method: 'email' };
          }
        } catch (e) {
          return { needsVerification: true, method: 'unknown' };
        }
      }

      // Check if login was successful
      if (currentUrl.includes('instagram.com') && !currentUrl.includes('login')) {
        this.isLoggedIn = true;
        console.log('✅ Login successful!');

        // Save cookies for session persistence
        const cookies = await this.context.cookies();
        this.savedCookies = cookies;

        return { success: true };
      }

      // Check for error message
      const errorElement = await this.page.$('[data-testid="login-error-message"], #slfErrorAlert');
      if (errorElement) {
        const errorText = await errorElement.textContent();
        console.log('❌ Login failed:', errorText);
        return { success: false, error: errorText };
      }

      return { success: false, error: 'Unknown login state' };
    } catch (error) {
      console.error('❌ Login error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async submitVerificationCode(code) {
    if (!this.page) {
      return { success: false, error: 'No active session' };
    }

    try {
      console.log(`📝 Submitting verification code: ${code}`);

      // Find and fill the verification code input
      const codeInput = await this.page.waitForSelector('input[name="security_code"], input[name="verificationCode"], input[placeholder*="Code"]', { timeout: 10000 });
      await codeInput.fill(code);

      // Click confirm/submit button
      const submitButton = await this.page.$('button:has-text("Confirm"), button:has-text("Submit"), button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
      }

      await this.page.waitForTimeout(5000);

      const currentUrl = this.page.url();
      if (currentUrl.includes('instagram.com') && !currentUrl.includes('challenge') && !currentUrl.includes('login')) {
        this.isLoggedIn = true;
        console.log('✅ Verification successful!');
        return { success: true };
      }

      return { success: false, error: 'Verification may have failed' };
    } catch (error) {
      console.error('❌ Verification error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async searchHashtag(hashtag) {
    const loginResult = await this.login();
    if (loginResult.needsVerification) {
      return { needsVerification: true, method: loginResult.method };
    }
    if (!this.isLoggedIn) {
      throw new Error('Not logged in to Instagram');
    }

    const cleanHashtag = hashtag.replace(/^#/, '');
    console.log(`🔍 Searching hashtag: #${cleanHashtag}`);

    try {
      // Navigate to hashtag page
      await this.page.goto(`https://www.instagram.com/explore/tags/${cleanHashtag}/`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await this.page.waitForTimeout(3000);

      // Check if hashtag exists
      const notFoundElement = await this.page.$('text="Sorry, this page isn\'t available"');
      if (notFoundElement) {
        console.log(`   Hashtag #${cleanHashtag} not found`);
        return [];
      }

      // Extract posts from the page
      const posts = await this.page.evaluate(() => {
        const postElements = document.querySelectorAll('article a[href*="/p/"]');
        const results = [];

        postElements.forEach((el, index) => {
          if (index >= 30) return; // Limit to 30 posts

          const href = el.getAttribute('href');
          const shortcode = href?.match(/\/p\/([^/]+)/)?.[1];
          const img = el.querySelector('img');

          if (shortcode) {
            results.push({
              shortcode,
              permalink: `https://www.instagram.com${href}`,
              thumbnailUrl: img?.src || null,
              alt: img?.alt || ''
            });
          }
        });

        return results;
      });

      console.log(`   Found ${posts.length} posts on hashtag page`);

      // Get detailed info for each post (limited to first 10 for speed)
      const detailedPosts = [];
      for (const post of posts.slice(0, 10)) {
        try {
          const details = await this.getPostDetails(post.shortcode);
          detailedPosts.push({
            ...post,
            ...details,
            source: { type: 'hashtag', value: cleanHashtag }
          });
        } catch (e) {
          // If details fail, still include basic info
          detailedPosts.push({
            id: post.shortcode,
            shortcode: post.shortcode,
            caption: post.alt,
            mediaUrl: post.thumbnailUrl,
            permalink: post.permalink,
            creator: { username: 'unknown', fullName: '', profilePicUrl: null },
            engagement: { likes: 0, comments: 0 },
            source: { type: 'hashtag', value: cleanHashtag }
          });
        }

        // Small delay between requests
        await this.page.waitForTimeout(500);
      }

      return detailedPosts;
    } catch (error) {
      console.error(`❌ Hashtag search error:`, error.message);
      throw error;
    }
  }

  async getPostDetails(shortcode) {
    try {
      // Use Instagram's public JSON endpoint
      const response = await this.page.evaluate(async (code) => {
        const res = await fetch(`https://www.instagram.com/p/${code}/?__a=1&__d=dis`, {
          credentials: 'include'
        });
        if (res.ok) {
          return await res.json();
        }
        return null;
      }, shortcode);

      if (response?.items?.[0]) {
        const item = response.items[0];
        return {
          id: item.pk || shortcode,
          shortcode,
          caption: item.caption?.text || '',
          mediaType: item.media_type === 1 ? 'IMAGE' : item.media_type === 2 ? 'VIDEO' : 'CAROUSEL',
          mediaUrl: item.image_versions2?.candidates?.[0]?.url || null,
          permalink: `https://www.instagram.com/p/${shortcode}/`,
          timestamp: item.taken_at ? new Date(item.taken_at * 1000).toISOString() : null,
          creator: {
            username: item.user?.username || 'unknown',
            fullName: item.user?.full_name || '',
            profilePicUrl: item.user?.profile_pic_url || null
          },
          engagement: {
            likes: item.like_count || 0,
            comments: item.comment_count || 0
          }
        };
      }

      return null;
    } catch (error) {
      console.log(`   Could not get details for ${shortcode}`);
      return null;
    }
  }

  async searchByUsername(username) {
    const loginResult = await this.login();
    if (loginResult.needsVerification) {
      return { needsVerification: true, method: loginResult.method };
    }
    if (!this.isLoggedIn) {
      throw new Error('Not logged in to Instagram');
    }

    const cleanUsername = username.replace(/^@/, '');
    console.log(`🔍 Searching user: @${cleanUsername}`);

    try {
      await this.page.goto(`https://www.instagram.com/${cleanUsername}/`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await this.page.waitForTimeout(3000);

      // Check if user exists
      const notFoundElement = await this.page.$('text="Sorry, this page isn\'t available"');
      if (notFoundElement) {
        console.log(`   User @${cleanUsername} not found`);
        return [];
      }

      // Extract posts
      const posts = await this.page.evaluate(() => {
        const postElements = document.querySelectorAll('article a[href*="/p/"]');
        const results = [];

        postElements.forEach((el, index) => {
          if (index >= 20) return;

          const href = el.getAttribute('href');
          const shortcode = href?.match(/\/p\/([^/]+)/)?.[1];
          const img = el.querySelector('img');

          if (shortcode) {
            results.push({
              shortcode,
              permalink: `https://www.instagram.com${href}`,
              thumbnailUrl: img?.src || null
            });
          }
        });

        return results;
      });

      console.log(`   Found ${posts.length} posts from @${cleanUsername}`);

      // Get details for posts
      const detailedPosts = [];
      for (const post of posts.slice(0, 10)) {
        try {
          const details = await this.getPostDetails(post.shortcode);
          if (details) {
            detailedPosts.push({
              ...details,
              source: { type: 'user', value: `@${cleanUsername}` }
            });
          }
        } catch (e) {
          // Skip failed posts
        }
        await this.page.waitForTimeout(500);
      }

      return detailedPosts;
    } catch (error) {
      console.error(`❌ User search error:`, error.message);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.isLoggedIn = false;
    }
  }
}

// Export singleton
module.exports = new InstagramPlaywrightService();
