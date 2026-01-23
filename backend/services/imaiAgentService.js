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

  async initialize() {
    this.log('info', 'Initializing Playwright browser...');
    try {
      this.browser = await chromium.launch({
        headless: true, // Set to false for debugging
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
      await this.page.waitForTimeout(1000); // Extra wait for Angular

      // Fill email/username field
      this.log('info', 'Entering email...');
      await this.page.fill('input[name="username"]', email);

      // Fill password field
      this.log('info', 'Entering password...');
      await this.page.fill('input[name="password"]', password);

      // Click login button (use specific class to avoid language button)
      this.log('info', 'Clicking login button...');
      await this.page.click('button.btn-dark');

      // Wait for navigation after login
      this.log('info', 'Waiting for authentication...');
      await this.page.waitForURL(url => !url.href.includes('/login'), { timeout: 30000 });

      // Check if login was successful by looking for dashboard elements or URL change
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
        // Check for error messages
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

  async navigateToCampaign(campaignId) {
    if (!this.isLoggedIn) {
      throw new Error('Not logged in');
    }

    this.log('info', `Navigating to campaign ${campaignId}...`);

    try {
      // Navigate to campaign page
      await this.page.goto(`https://imai.co/campaigns/${campaignId}`, { waitUntil: 'networkidle' });

      // Wait for campaign page to load
      await this.page.waitForSelector('body', { timeout: 10000 });

      const currentUrl = this.page.url();
      if (!currentUrl.includes(`campaigns/${campaignId}`)) {
        throw new Error('Failed to navigate to campaign page');
      }

      this.log('success', `Navigated to campaign ${campaignId}`);
      return true;
    } catch (error) {
      this.log('error', `Failed to navigate to campaign`, { error: error.message });
      throw error;
    }
  }

  async addInfluencer(username, campaignId) {
    if (!this.isLoggedIn) {
      throw new Error('Not logged in');
    }

    this.log('info', `Adding influencer @${username} to campaign...`);

    try {
      // Look for the add influencer button with the specified class
      const addButtonSelector = '.im-btn.im-btn-primary, button[class*="im-btn-primary"], [data-testid="add-influencer"]';

      // First, check if the button exists
      const addButton = await this.page.$(addButtonSelector);

      if (addButton) {
        this.log('info', 'Found add influencer button, clicking...');
        await addButton.click();

        // Wait for modal or input to appear
        await this.page.waitForTimeout(1000);

        // Look for username input field
        const usernameInput = await this.page.$('input[name="username"], input[placeholder*="username" i], input[type="text"]');
        if (usernameInput) {
          await usernameInput.fill(username);
          this.log('info', `Entered username: @${username}`);

          // Look for submit/confirm button
          const submitButton = await this.page.$('button[type="submit"], .im-btn.im-btn-primary');
          if (submitButton) {
            await submitButton.click();
            this.log('info', 'Submitted add influencer request');

            // Wait for response
            await this.page.waitForTimeout(2000);

            // Check for success or error
            const successIndicator = await this.page.$('.success, .alert-success, [data-status="success"]');
            if (successIndicator) {
              this.log('success', `Successfully added @${username} to campaign`);
              return { success: true, username };
            }

            const errorIndicator = await this.page.$('.error, .alert-danger, [data-status="error"]');
            if (errorIndicator) {
              const errorText = await errorIndicator.textContent();
              if (errorText.toLowerCase().includes('already')) {
                this.log('warning', `@${username} already exists in campaign`);
                return { success: false, username, reason: 'already_exists' };
              }
              throw new Error(errorText);
            }

            this.log('success', `Added @${username} (no explicit confirmation)`);
            return { success: true, username };
          }
        }
      }

      // Alternative: Try using search functionality
      this.log('info', 'Trying alternative method via search...');

      // Search for the influencer
      const searchInput = await this.page.$('input[type="search"], input[placeholder*="search" i]');
      if (searchInput) {
        await searchInput.fill(username);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(2000);

        // Look for add button in search results
        const addFromSearchBtn = await this.page.$('.im-btn.im-btn-primary');
        if (addFromSearchBtn) {
          await addFromSearchBtn.click();
          this.log('success', `Added @${username} via search`);
          return { success: true, username };
        }
      }

      throw new Error('Could not find add influencer mechanism');
    } catch (error) {
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

      // Navigate to campaign
      await this.navigateToCampaign(client.imaiCampaignId);

      // Add each creator
      for (let i = 0; i < creators.length; i++) {
        const creator = creators[i];
        this.log('info', `Processing ${i + 1}/${creators.length}: @${creator.username}`);

        try {
          const result = await this.addInfluencer(creator.username, client.imaiCampaignId);
          results.details.push(result);

          if (result.success) {
            results.added++;
          } else if (result.reason === 'already_exists') {
            results.skipped++;
          } else {
            results.failed++;
          }

          // Small delay between additions
          await this.page.waitForTimeout(1500);
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
