# IMAI-Lite Local Setup Guide

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/faheem91/imai-lite.git
cd imai-lite
```

---

## Backend Setup

### Install Dependencies
```bash
cd backend
npm install
npx playwright install chromium
```

### Configure Environment
Create `backend/.env`:
```env
# Server
PORT=4000
NODE_ENV=development

# Instagram Private API (for hashtag/user search)
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password

# Apify (alternative Instagram scraping - more reliable)
APIFY_API_TOKEN=your_apify_token

# OpenRouter AI (for IMAI agent)
OPENROUTER_API_KEY=your_openrouter_key
```

### Run Backend
```bash
npm run dev    # Development with auto-reload
# or
npm start      # Production
```

Backend runs on `http://localhost:4000`

---

## Frontend Setup

### Install Dependencies
```bash
cd client
npm install
```

### Configure Environment
Create `client/.env.local`:
```env
# Clerk Authentication (get from clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:4000

# Database (Neon Postgres or local)
POSTGRES_URL=postgresql://user:pass@host/db?sslmode=require

# IMAI Credentials (stored in DB, but can set defaults)
IMAI_EMAIL=your_imai_email
IMAI_PASSWORD=your_imai_password
```

### Setup Database
```bash
npm run db:push    # Push schema to database
```

### Run Frontend
```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## Production Deployment

### Backend (PM2)
```bash
cd backend
npm install -g pm2
pm2 start index.js --name influencer-backend
pm2 save
```

### Frontend (Vercel)
```bash
cd client
npm install -g vercel
vercel --prod
```

Set environment variables in Vercel dashboard.

---

## Instagram Search - How It Works

Currently there are **3 methods** for finding Instagram content:

### 1. Instagram Private API (`instagramService.js`)
- Uses `instagram-private-api` package
- Requires real Instagram account credentials
- **Pros:** Free, real-time data
- **Cons:** Can get account blocked, rate limited

### 2. Apify Service (`instagramApifyService.js`)
- Uses Apify's Instagram scrapers
- **Pros:** More reliable, no account risk
- **Cons:** Costs money (~$5/1000 results)

### 3. Instagram Graph API (`instagramGraphService.js`)
- Official Meta API
- **Pros:** Official, stable
- **Cons:** Limited to business accounts you manage

---

## Improving Instagram Search

### Option A: Enhance Apify Integration (Recommended)
Apify is most reliable. To improve:

1. **Add more actors:**
```javascript
// In instagramApifyService.js
this.commentActorId = 'apify~instagram-comment-scraper';
this.reelActorId = 'apify~instagram-reel-scraper';
```

2. **Add location-based search:**
```javascript
async searchByLocation(locationId) {
  // Use apify~instagram-location-scraper
}
```

3. **Add competitor monitoring:**
```javascript
async getCompetitorFollowers(username) {
  // Scrape followers of competitor accounts
}
```

### Option B: Use RapidAPI Instagram APIs
More affordable alternatives:

```javascript
// Example: RapidAPI Instagram Scraper
const options = {
  method: 'GET',
  url: 'https://instagram-scraper-api2.p.rapidapi.com/v1/hashtag',
  params: { hashtag: 'food' },
  headers: {
    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
    'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com'
  }
};
```

### Option C: Build Custom Scraper with Playwright
Use existing Playwright setup:

```javascript
// In a new service file
async searchInstagramWithPlaywright(query) {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to Instagram explore
  await page.goto(`https://www.instagram.com/explore/tags/${query}/`);

  // Wait for posts to load
  await page.waitForSelector('article');

  // Extract post data
  const posts = await page.evaluate(() => {
    // Scrape visible posts
  });

  await browser.close();
  return posts;
}
```

### Option D: Influencer Discovery APIs
Paid services with better data:

1. **Modash** - `https://modash.io/api`
2. **HypeAuditor** - `https://hypeauditor.com/api`
3. **Upfluence** - `https://upfluence.com/api`

These provide:
- Audience demographics
- Engagement rates
- Fake follower detection
- Contact info

---

## Feature Ideas to Add

### 1. Auto-Discovery Pipeline
```
Hashtag Search → Filter by Engagement → Check Audience Fit → Auto-add to IMAI
```

### 2. Competitor Analysis
- Track competitor campaigns
- Find influencers they work with
- Identify gaps/opportunities

### 3. Engagement Scoring
```javascript
const engagementScore = (likes + comments * 2) / followers * 100;
```

### 4. Audience Overlap Detection
- Find influencers with similar audiences
- Avoid duplicate reach

### 5. Content Analysis (AI)
```javascript
// Use OpenRouter/GPT to analyze post content
const analysis = await analyzeContent(postCaption, postImage);
// Returns: sentiment, topics, brand safety score
```

---

## API Endpoints Reference

### Instagram Search
```
GET /api/instagram/search?keyword=#food     # Hashtag search
GET /api/instagram/search?keyword=@username # User search
GET /api/instagram/test                     # Test connection
```

### IMAI Agent
```
POST /api/agents/:id/run      # Start agent
POST /api/agents/:id/stop     # Stop agent
POST /api/agents/:id/skip     # Skip current creator
POST /api/agents/:id/relogin  # Force re-login
GET  /api/agents/:id/stream   # SSE real-time logs
GET  /api/agents/:id/status   # Get status
```

---

## Troubleshooting

### "Instagram login failed"
- Check credentials in `.env`
- Try logging in via browser first (security challenge)
- Use Apify instead

### "Playwright browser not found"
```bash
npx playwright install chromium
```

### "Database connection failed"
- Check `POSTGRES_URL` in `.env.local`
- Ensure Neon database is active

### "IMAI agent fails"
- Check IMAI credentials in Settings page
- Verify Campaign ID exists
- Check browser console for errors

---

## Questions?
Contact the team or check the main `CLAUDE.md` for more technical details.
