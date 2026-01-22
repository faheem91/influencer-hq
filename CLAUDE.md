# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Instagram Search API backend that scrapes Instagram for posts by hashtag and username using `instagram-private-api`. Returns post content, creator profiles, engagement metrics, and media URLs.

**Tech Stack:** Node.js, Express.js, instagram-private-api

## Common Commands

```bash
# Install dependencies
cd backend && npm install

# Start development server (with auto-reload)
npm run dev

# Start production server
npm start
```

Server runs on `http://localhost:4000`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/instagram/search?keyword={keyword}` | GET | Search by hashtag (#) or username (@) |
| `/api/instagram/test` | GET | Test Instagram connection |
| `/api/instagram/account` | GET | Get logged-in account info |
| `/api/instagram/logout` | POST | Logout from Instagram |

**Search prefixes:**
- `#keyword` - search hashtag only
- `@username` - search user posts only
- `keyword` (no prefix) - search both

## Architecture

```
backend/
├── index.js                    # Express app entry, CORS config, auto-login on startup
├── config/instagram.js         # API credentials and rate limit settings
├── services/instagramService.js # Core Instagram logic (singleton)
├── controllers/instagramController.js # Route handlers with error handling
├── routes/instagramRoutes.js   # Route definitions
└── ig_session.json             # Session cache (auto-generated, gitignored)
```

**Data Flow:** Routes → Controller → InstagramService → instagram-private-api

**Key Service Methods:**
- `login()` - Authenticates with session persistence to `ig_session.json`
- `searchByKeyword(keyword)` - Dispatches to hashtag/username search based on prefix
- `searchByHashtag(tag)` - Fetches up to 5 pages with 2s delays
- `searchByUsername(user)` - Fetches user posts with pagination
- `formatPost(item)` - Normalizes post data structure

## Environment Setup

Create `backend/.env`:
```env
INSTAGRAM_USERNAME=your_username
INSTAGRAM_PASSWORD=your_password
PORT=4000
NODE_ENV=development
```

**Requirements:**
- Use a dedicated Instagram account (not personal)
- 2FA must be disabled on the account
- May trigger Instagram security challenges on first login

## Testing

```bash
# Test connection
curl http://localhost:4000/api/instagram/test

# Search posts
curl "http://localhost:4000/api/instagram/search?keyword=travel"
curl "http://localhost:4000/api/instagram/search?keyword=%23photography"
curl "http://localhost:4000/api/instagram/search?keyword=%40username"
```

## Important Notes

- Uses unofficial Instagram API - not recommended for production use
- Session file (`ig_session.json`) persists login state across restarts
- Rate limiting: 2-second delays between pagination requests, max 5 pages per search type
- If checkpoint/challenge errors occur, log in via browser first to verify account
