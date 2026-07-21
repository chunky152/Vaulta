# Unbur

A modern full-stack platform for location-based storage unit discovery, booking, and management.

**Live app:** [https://vaulta-web.pages.dev](https://vaulta-web.pages.dev)
**API:** [https://vaulta-api-2lak.onrender.com/api/v1/health](https://vaulta-api-2lak.onrender.com/api/v1/health)
**Architecture map:** [foglamp.dev/scan/vaulta-u7csyf](https://foglamp.dev/scan/vaulta-u7csyf) — a visual map of how the system works (services, integrations, data flow)

> The API runs on Render's free tier, which spins down when idle — the first request after a quiet period can take 30–60 seconds.

## Tech Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **ODM**: Mongoose 7.6+
- **Authentication**: JWT with refresh tokens

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack React Query
- **State Management**: Zustand (auth/session)
- **Maps**: Leaflet + OpenStreetMap

### External Services
- **Payments**: Stripe
- **Email**: SendGrid
- **SMS**: Twilio

## Project Structure

```
unbur/
├── packages/
│   ├── shared/           # @unbur/shared — wire-level types & enums
│   │   └── src/          #   used by both backend and web
│   ├── backend/          # @unbur/backend — Express.js API server
│   │   └── src/
│   │       ├── modules/      # Feature modules (controller + service +
│   │       │   ├── auth/     #   routes + validator + Mongoose models
│   │       │   ├── bookings/ #   per domain)
│   │       │   ├── locations/
│   │       │   ├── units/
│   │       │   ├── inventory/
│   │       │   ├── payments/
│   │       │   ├── notifications/
│   │       │   └── admin/
│   │       ├── shared/       # Config, middleware, types, utils,
│   │       │                 #   common validators
│   │       ├── scripts/      # Seed script
│   │       └── routes.ts     # Mounts all module routers
│   └── web/              # @unbur/web — React frontend
│       └── src/
│           ├── features/     # Feature folders (pages + hooks + stores +
│           │   ├── auth/     #   components per domain)
│           │   ├── bookings/
│           │   ├── locations/
│           │   ├── inventory/
│           │   └── admin/
│           ├── components/   # Shared UI (ui/, layout/)
│           ├── pages/        # Generic pages (Home, Dashboard, Profile…)
│           ├── services/     # Axios API client
│           ├── lib/          # Query client, utils
│           └── types/        # TypeScript types
├── scripts/              # Utility scripts
└── .github/workflows/    # CI/CD pipelines
```

`@unbur/shared` builds itself automatically during `npm install` (via its `prepare` script), so no extra build step is needed before working on the other packages.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- A MongoDB instance (local or Atlas)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/chunky152/Vaulta.git
   cd Vaulta
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   # Backend
   cp packages/backend/.env.example packages/backend/.env
   # Edit .env with your configuration

   # Frontend
   cp packages/web/.env.example packages/web/.env
   ```

4. **Seed the database (optional)**
   ```bash
   npm run db:seed -w @unbur/backend
   ```

5. **Start development servers**
   ```bash
   # Start both backend and frontend
   npm run dev

   # Or start individually:
   npm run dev -w @unbur/backend
   npm run dev -w @unbur/web
   ```

The API will be available at `http://localhost:3000` and the web app at `http://localhost:5173`.

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### Locations
- `GET /api/v1/locations` - List locations
- `GET /api/v1/locations/nearby` - Find nearby locations
- `GET /api/v1/locations/:id` - Get location details
- `GET /api/v1/locations/slug/:slug` - Get location by slug
- `GET /api/v1/locations/:id/units` - Get location units

### Bookings
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings` - List user bookings
- `GET /api/v1/bookings/:id` - Get booking details
- `POST /api/v1/bookings/:id/confirm` - Confirm booking
- `POST /api/v1/bookings/:id/cancel` - Cancel booking

### Payments
- `POST /api/v1/payments/create-intent` - Create payment intent
- `POST /api/v1/payments/webhook` - Stripe webhook

## Scripts

```bash
# Development
npm run dev                     # Start all services
npm run dev -w @unbur/backend   # Start backend only
npm run dev -w @unbur/web       # Start frontend only

# Database (MongoDB with Mongoose)
npm run db:seed                 # Seed database with initial data

# Build
npm run build                   # Build all packages (shared first)
npm run build:backend           # Build shared + backend
npm run build:web               # Build shared + frontend

# Quality
npm run test                    # Run all tests
npm run lint                    # Run linters
```

## Workflows (CI/CD)

Both workflows live in [.github/workflows/](.github/workflows/).

### CI — [ci.yml](.github/workflows/ci.yml)

Runs on every push and pull request against `main`:

| Job | Steps |
|---|---|
| Backend Lint & Test | ESLint, then Jest against a MongoDB service container |
| Frontend Lint & Build | ESLint, then Vite production build |
| Build Backend | `tsc` build, uploads `dist/` as an artifact |

### Deploy — [deploy.yml](.github/workflows/deploy.yml)

Runs on every push to `main` (i.e. after a PR merges), and can be triggered manually via *workflow_dispatch*:

- **Backend → Render**: builds, then POSTs the `RENDER_DEPLOY_HOOK` secret to tell Render to pull and redeploy. Render's own auto-deploy is intentionally OFF so deploys only happen through this workflow (after CI-verified merges).
- **Frontend → Cloudflare Pages**: builds with `VITE_API_URL`, then uploads `packages/web/dist` to the `vaulta-web` Pages project (direct upload — the project is not git-connected).

Both deploy steps skip gracefully if their secrets are not configured, so forks stay green.

**Required GitHub Actions configuration** (Settings → Secrets and variables → Actions):

| Kind | Name | Purpose |
|---|---|---|
| Secret | `RENDER_DEPLOY_HOOK` | Render deploy hook URL for the backend service |
| Secret | `CLOUDFLARE_API_TOKEN` | Token with *Cloudflare Pages: Edit* permission |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id |
| Variable | `VITE_API_URL` | Public API base URL baked into the frontend build |

## Deployment

Production topology:

| Piece | Host | Notes |
|---|---|---|
| Frontend | Cloudflare Pages (`vaulta-web`) | https://vaulta-web.pages.dev |
| Backend | Render free web service | Build: `npm ci --include=dev && npm run build -w @unbur/backend` · Start: `npm start` · Health check: `/api/v1/health` |
| Database | MongoDB Atlas | Network access open (Render free tier has no static IPs) |

Notes for the Render service:

- `NODE_ENV=production` is set in Render's environment, which makes plain `npm ci` skip devDependencies — hence the `--include=dev` flag in the build command (TypeScript is a devDependency).
- Node version is pinned by the root [.node-version](.node-version) file.
- Backend env vars (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, …) are configured in the Render dashboard, never committed.

## Features

- **Location Discovery**: Find storage units near you with interactive maps
- **Real-time Availability**: Check unit availability instantly
- **Secure Payments**: Stripe integration for payments
- **QR Code Access**: Generate QR codes for unit access
- **Notifications**: Email and SMS notifications
- **Admin Dashboard**: Manage locations, bookings, and users
- **Loyalty System**: Earn and redeem points

## License

MIT
