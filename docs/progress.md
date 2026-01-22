# Influencer HQ - Progress Tracker

## Project Overview
Full-featured dashboard for managing brands/clients, tracking social media mentions, and automating creator discovery via IMAI integration.

**Branch:** `feature/dashboard`
**Target URL:** panel.influencerhq.io

---

## Implementation Status

### Completed Tasks

#### 1. Project Setup
- [x] Created `feature/dashboard` branch
- [x] Set up Next.js 14+ with App Router
- [x] Configured TypeScript
- [x] Installed and configured Tailwind CSS
- [x] Installed ShadCN UI dependencies

#### 2. Authentication
- [x] Installed @clerk/nextjs
- [x] Created Clerk middleware
- [x] Implemented sign-in page (`/sign-in`)
- [x] Implemented sign-up page (`/sign-up`)
- [x] Protected routes with authentication

#### 3. UI Components (ShadCN)
- [x] Button
- [x] Card
- [x] Input
- [x] Label
- [x] Badge
- [x] Avatar
- [x] Dialog
- [x] Dropdown Menu
- [x] Tabs
- [x] Table
- [x] Select
- [x] Checkbox
- [x] Separator
- [x] Switch
- [x] Skeleton
- [x] Textarea
- [x] Scroll Area

#### 4. Layout Components
- [x] Sidebar with navigation
- [x] Header with user button
- [x] Dashboard layout wrapper

#### 5. Client Management
- [x] Client list page (`/clients`)
- [x] Add client page (`/clients/new`)
- [x] Client detail page (`/clients/[id]`)
- [x] Edit client page (`/clients/[id]/edit`)
- [x] Creators page (`/clients/[id]/creators`)
- [x] Reports page (`/clients/[id]/reports`)
- [x] Client card component
- [x] Client form component
- [x] Tracking configuration component
- [x] Delete confirmation dialog

#### 6. Agent System
- [x] Agent list page (`/agents`)
- [x] Agent detail page (`/agents/[id]`)
- [x] Agent card component
- [x] Agent logs component
- [x] IMAI agent service (placeholder with Playwright structure)
- [x] Agent runner class for scheduling

#### 7. Data Management
- [x] localStorage-based storage utility
- [x] Client CRUD operations
- [x] Agent CRUD operations
- [x] Tracked creators management
- [x] Export to CSV
- [x] Export to JSON
- [x] Full backup export

#### 8. Settings
- [x] Settings page (`/settings`)
- [x] IMAI credentials configuration (now saves to database)
- [x] Notification toggles
- [x] Data management (export/clear)

#### 9. Backend Updates
- [x] Added pagination support to search endpoint
- [x] Added `/api/instagram/search/all` endpoint for exports

#### 10. Database Migration (Vercel Postgres + Drizzle ORM)
- [x] Migrated from localStorage to Neon Postgres
- [x] Created Drizzle schema for all tables
- [x] Added settings table for global IMAI credentials
- [x] Removed `imaiAccountId` from clients (now global)
- [x] Full CRUD operations via server actions

#### 11. Real-Time Agent Console (Claude Code Style)
- [x] Created AgentTerminal component with dark terminal UI
- [x] Implemented SSE (Server-Sent Events) for real-time logs
- [x] Created useAgentStream hook for SSE connection
- [x] Color-coded log levels (success/error/info/warning)
- [x] Auto-scroll and connection status indicator

#### 12. IMAI Playwright Automation
- [x] Created ImaiAgentService with Playwright
- [x] Login to IMAI (app.imai.co)
- [x] Navigate to campaigns
- [x] Add influencers via `.im-btn.im-btn-primary` button
- [x] Created AgentScheduler for recurring jobs

#### 13. Backend Agent API
- [x] SSE endpoint `/api/agents/:id/stream`
- [x] Run agent `/api/agents/:id/run`
- [x] Stop agent `/api/agents/:id/stop`
- [x] Agent status `/api/agents/:id/status`
- [x] Test IMAI login `/api/agents/test-login`

#### 14. Docker Deployment Setup
- [x] Created Dockerfile with Playwright image
- [x] Created docker-compose.yml (port 4001)
- [x] Created nginx.conf with SSE support
- [x] Created deploy.sh script
- [x] Created DEPLOYMENT.md guide

---

## File Structure

```
client/
├── app/
│   ├── layout.tsx                      # Root layout with ClerkProvider
│   ├── page.tsx                        # Dashboard home
│   ├── globals.css                     # Tailwind + ShadCN variables
│   ├── sign-in/[[...sign-in]]/page.tsx
│   ├── sign-up/[[...sign-up]]/page.tsx
│   ├── clients/
│   │   ├── page.tsx                    # Client list
│   │   ├── new/page.tsx                # Add client
│   │   └── [id]/
│   │       ├── page.tsx                # Client detail
│   │       ├── edit/page.tsx           # Edit client
│   │       ├── creators/page.tsx       # Tracked creators
│   │       └── reports/page.tsx        # Export reports
│   ├── agents/
│   │   ├── page.tsx                    # Agent dashboard
│   │   └── [id]/page.tsx               # Agent detail with terminal
│   └── settings/page.tsx               # Global settings (IMAI creds)
├── middleware.ts                       # Clerk auth middleware
├── components/
│   ├── ui/                             # ShadCN components
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── dashboard-layout.tsx
│   ├── clients/
│   │   ├── client-card.tsx
│   │   ├── client-form.tsx
│   │   └── tracking-config.tsx
│   └── agents/
│       ├── agent-card.tsx
│       ├── agent-logs.tsx
│       └── agent-terminal.tsx          # NEW: Claude Code style terminal
├── db/
│   ├── index.ts                        # Drizzle DB connection
│   ├── schema.ts                       # Database schema
│   └── queries.ts                      # Server actions
├── hooks/
│   └── useAgentStream.ts               # NEW: SSE hook for real-time logs
├── lib/
│   ├── api.ts                          # Instagram API client
│   └── utils.ts                        # CN utility for ShadCN
└── .env.local.example                  # Environment template

backend/
├── index.js                            # Express app entry
├── config/instagram.js                 # API credentials
├── routes/
│   ├── instagramRoutes.js              # Instagram API routes
│   └── agentRoutes.js                  # NEW: Agent SSE & control routes
├── services/
│   ├── instagramService.js             # Instagram scraping
│   ├── imaiAgentService.js             # NEW: Playwright IMAI automation
│   └── agentScheduler.js               # NEW: Job scheduling
├── Dockerfile                          # NEW: Docker deployment
├── docker-compose.yml                  # NEW: Container config
├── nginx.conf                          # NEW: Reverse proxy config
├── deploy.sh                           # NEW: Deployment script
└── DEPLOYMENT.md                       # NEW: Deployment guide
```

---

## Next Steps

### Completed (Previously Pending)
- [x] Clerk Configuration - Authentication working
- [x] Database Migration - Neon Postgres with Drizzle ORM
- [x] IMAI Agent Implementation - Playwright automation ready
- [x] Scheduling - node-schedule for recurring jobs

### Current Deployment
1. **Backend Deployment to VPS**
   - Server: api.vibeguard.co (170.249.238.154)
   - Domain: agent.influencerhq.io
   - Port: 4001 (external)
   - Docker with Playwright

2. **Frontend Update**
   - Update `NEXT_PUBLIC_API_URL` to `https://agent.influencerhq.io`
   - Redeploy to Vercel

---

## Environment Variables Required

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# API URL
NEXT_PUBLIC_API_URL=http://localhost:4000

# IMAI Credentials
IMAI_EMAIL=isabel@outsmartlabs.com
IMAI_PASSWORD=Outsmart2026!
```

---

## How to Run

### Backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:4000
```

### Frontend
```bash
cd client
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## API Endpoints

### Backend (Instagram API)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/instagram/search?keyword={keyword}&page={page}&limit={limit}` | GET | Search with pagination |
| `/api/instagram/search/all?keyword={keyword}` | GET | Search all (for export) |
| `/api/instagram/test` | GET | Test connection |
| `/api/instagram/account` | GET | Get account info |
| `/api/instagram/logout` | POST | Logout |

### Backend (Agent API)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents/:id/stream` | GET | SSE real-time log streaming |
| `/api/agents/:id/run` | POST | Trigger immediate agent run |
| `/api/agents/:id/stop` | POST | Stop running agent |
| `/api/agents/:id/status` | GET | Get agent status |
| `/api/agents/:id/schedule` | POST | Schedule recurring runs |
| `/api/agents/:id/schedule` | DELETE | Cancel scheduled runs |
| `/api/agents/scheduled` | GET | List all scheduled agents |
| `/api/agents/test-login` | POST | Test IMAI credentials |

---

## Last Updated
2026-01-23 (Real-time Agent Console & Docker Deployment)
