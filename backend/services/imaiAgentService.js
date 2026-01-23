const { chromium } = require('playwright');
const EventEmitter = require('events');

class ImaiAgentService extends EventEmitter {
  constructor() {
    super();
    this.browser = null;
    this.page = null;
    this.isRunning = false;
    this.isLoggedIn = false;
  }

  log(level, message, details = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    };
    this.emit('log', logEntry);
    console.log(`[${level.toUpperCase()}] ${message}${details ? ` - ${JSON.stringify(details)}` : ''}`);
  }

  /**
   * Extract campaign ID from JWT URL or return as-is if numeric
   * JWT URL format: https://imai.co/c/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjYW1wYWlnbiI6NTQwNywiaWF0IjoxNzY5MTE2Mzc5fQ...
   * JWT payload contains: {"campaign":5407,"iat":...}
   */
  extractCampaignId(campaignIdOrUrl) {
    // If it's already a number, return it
    if (/^\d+$/.test(campaignIdOrUrl)) {
      return campaignIdOrUrl;
    }

    // If it's a JWT URL, extract and decode the campaign ID
    if (campaignIdOrUrl.includes('/c/')) {
      try {
        const jwtToken = campaignIdOrUrl.split('/c/')[1];
        const payload = jwtToken.split('.')[1];
        // Base64 decode the payload
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
        if (decoded.campaign) {
          this.log('info', `Extracted campaign ID: ${decoded.campaign} from JWT`);
          return decoded.campaign.toString();
        }
      } catch (e) {
        this.log('warning', `Failed to decode JWT, using URL as-is: ${e.message}`);
      }
    }

    // If it's a campaigns URL, extract the ID
    const match = campaignIdOrUrl.match(/\/campaigns\/(?:influencers\/)?(\d+)/);
    if (match) {
      return match[1];
    }

    return campaignIdOrUrl;
  }

  async initialize() {
    this.log('info', 'Initializing Playwright browser...');
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.page = await this.browser.newPage();
      this.log('success', 'Browser initialized successfully');
      return true;
    } catch (error) {
      this.log('error', 'Failed to initialize browser', { error: error.message });
      throw error;
    }
  }

  async login(email, password) {
    if (!this.browser || !this.page) {
      await this.initialize();
    }

    this.log('info', 'Navigating to IMAI login page...');

    try {
      await this.page.goto('https://imai.co/login', { waitUntil: 'networkidle' });
      this.log('info', 'Login page loaded');

      // Wait for Angular app to fully render the form
      await this.page.waitForSelector('input[name="username"]', { timeout: 15000 });
      await this.page.waitForTimeout(1000);

      // Fill email/username field
      this.log('info', 'Entering email...');
      await this.page.fill('input[name="username"]', email);

      // Fill password field
      this.log('info', 'Entering password...');
      await this.page.fill('input[name="password"]', password);

      // Click login button
      this.log('info', 'Clicking login button...');
      await this.page.click('button.btn-dark');

      // Wait for navigation after login
      this.log('info', 'Waiting for authentication...');
      await this.page.waitForURL(url => !url.href.includes('/login'), { timeout: 30000 });

      // Check if login was successful
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
        const errorText = await this.page.textContent('.error, .alert-danger, [role="alert"]').catch(() => null);
        throw new Error(errorText || 'Login failed - still on login page');
      }

      this.isLoggedIn = true;
      this.log('success', 'Successfully logged into IMAI!');
      return true;
    } catch (error) {
      this.log('error', 'Login failed', { error: error.message });
      throw error;
    }
  }

  async navigateToCampaign(campaignIdOrUrl) {
    if (!this.isLoggedIn) {
      throw new Error('Not logged in');
    }

    // Extract numeric campaign ID
    const campaignId = this.extractCampaignId(campaignIdOrUrl);
    this.log('info', `Navigating to campaign influencers page (ID: ${campaignId})...`);

    try {
      // Use the internal influencers URL format
      const campaignUrl = `https://imai.co/campaigns/influencers/${campaignId}`;

      await this.page.goto(campaignUrl, { waitUntil: 'networkidle' });

      // Wait for page to load
      await this.page.waitForSelector('body', { timeout: 10000 });
      await this.page.waitForTimeout(2000); // Wait for Angular app

      // Wait for the "Add influencer" button to confirm we're on the right page
      await this.page.waitForSelector('button.im-btn.im-btn-primary', { timeout: 10000 });

      this.log('success', `Navigated to campaign influencers page`);
      return campaignId;
    } catch (error) {
      this.log('error', `Failed to navigate to campaign`, { error: error.message });
      throw error;
    }
  }

  async addInfluencer(username) {
    if (!this.isLoggedIn) {
      throw new Error('Not logged in');
    }

    this.log('info', `Adding influencer @${username} to campaign...`);

    try {
      // Step 1: Click "Add influencer" button (use text to avoid matching "New invite")
      this.log('info', 'Looking for Add influencer button...');
      const addButtonSelector = 'button:has-text("Add influencer")';
      await this.page.waitForSelector(addButtonSelector, { timeout: 15000 });
      await this.page.click(addButtonSelector);
      this.log('info', 'Clicked Add influencer button');

      // Step 2: Wait for modal to fully load
      await this.page.waitForTimeout(3000);

      // Step 3: Wait for input field to appear
      const inputSelector = 'input[placeholder="Profile URL, @handle or user ID"]';
      await this.page.waitForSelector(inputSelector, { timeout: 15000 });
      this.log('info', 'Modal opened, input field visible');

      // Step 4: Type the username slowly
      await this.page.fill(inputSelector, '');
      await this.page.type(inputSelector, username, { delay: 100 });
      this.log('info', `Entered username: ${username}`);

      // Step 5: Wait for IMAI to search and show dropdown results
      this.log('info', 'Waiting for search results...');
      await this.page.waitForTimeout(5000);

      // Step 6: Click on the dropdown result that matches the username
      const dropdownItemSelector = `span:text-is("${username}")`;
      try {
        await this.page.waitForSelector(dropdownItemSelector, { timeout: 10000 });
        await this.page.click(dropdownItemSelector);
        this.log('info', `Selected ${username} from dropdown`);
      } catch (e) {
        // Try alternative: click first typeahead result
        this.log('info', 'Exact match not found, trying first result...');
        const firstResult = await this.page.$('ngb-typeahead-window button, .dropdown-item, [role="option"]');
        if (firstResult) {
          await firstResult.click();
          this.log('info', 'Selected first typeahead result');
        } else {
          throw new Error(`Username ${username} not found in dropdown`);
        }
      }

      // Step 7: Wait for selection to register
      await this.page.waitForTimeout(2000);

      // Step 8: Click the "Yes" confirmation button
      this.log('info', 'Looking for Yes button...');
      const confirmButtonSelector = 'button.btn-success:has-text("Yes")';
      await this.page.waitForSelector(confirmButtonSelector, { timeout: 10000 });
      await this.page.click(confirmButtonSelector);
      this.log('info', 'Clicked Yes confirmation button');

      // Step 9: Wait for the popup to close and addition to complete
      this.log('info', 'Waiting for addition to complete...');
      await this.page.waitForTimeout(5000);

      // Step 10: Verify the influencer was added
      this.log('success', `Successfully added @${username} to campaign`);
      return { success: true, username };

    } catch (error) {
      // Check if it's an "already exists" error
      const errorMsg = await this.page.textContent('.alert-danger, .error-message, .toast-error, .modal-body').catch(() => '');
      if (errorMsg && errorMsg.toLowerCase().includes('already')) {
        this.log('warning', `@${username} already exists in campaign`);
        return { success: false, username, reason: 'already_exists' };
      }

      this.log('error', `Failed to add @${username}`, { error: error.message });
      return { success: false, username, reason: error.message };
    }
  }

  async runAgentForClient(client, imaiCredentials, creators) {
    this.isRunning = true;
    const results = {
      total: creators.length,
      added: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    try {
      this.log('info', 'Starting IMAI agent run');
      this.log('info', `Client: ${client.name}`);
      this.log('info', `Campaign ID: ${client.imaiCampaignId}`);
      this.log('info', `Creators to add: ${creators.length}`);

      // Initialize browser
      await this.initialize();

      // Login to IMAI
      await this.login(imaiCredentials.email, imaiCredentials.password);

      // Navigate to campaign (returns the extracted campaign ID)
      const campaignId = await this.navigateToCampaign(client.imaiCampaignId);

      // Add each creator
      for (let i = 0; i < creators.length; i++) {
        const creator = creators[i];

        // Skip unknown or empty usernames
        if (!creator.username || creator.username === 'unknown') {
          this.log('warning', `Skipping invalid username: ${creator.username}`);
          results.skipped++;
          results.details.push({ success: false, username: creator.username, reason: 'invalid_username' });
          continue;
        }

        this.log('info', `Processing ${i + 1}/${creators.length}: @${creator.username}`);

        try {
          const result = await this.addInfluencer(creator.username);
          results.details.push(result);

          if (result.success) {
            results.added++;
          } else if (result.reason === 'already_exists') {
            results.skipped++;
          } else {
            results.failed++;
          }

          // Delay between additions (IMAI is slow, need ~5s between each)
          await this.page.waitForTimeout(5000);
        } catch (error) {
          this.log('error', `Error processing @${creator.username}`, { error: error.message });
          results.failed++;
          results.details.push({ success: false, username: creator.username, reason: error.message });
        }
      }

      this.log('success', 'Agent run completed');
      this.log('info', `Results: ${results.added} added, ${results.skipped} skipped, ${results.failed} failed`);

    } catch (error) {
      this.log('error', 'Agent run failed', { error: error.message });
      throw error;
    } finally {
      this.isRunning = false;
      await this.cleanup();
    }

    return results;
  }

  async cleanup() {
    this.log('info', 'Cleaning up browser session...');
    try {
      if (this.page) {
        await this.page.close().catch(() => {});
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
      this.isLoggedIn = false;
      this.log('success', 'Cleanup complete');
    } catch (error) {
      this.log('error', 'Cleanup error', { error: error.message });
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isLoggedIn: this.isLoggedIn,
      hasBrowser: !!this.browser,
    };
  }
}

// Export a singleton instance
module.exports = new ImaiAgentService();
