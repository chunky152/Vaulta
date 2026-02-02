# Unbur

A modern full-stack platform for location-based storage unit discovery, booking, and management.

## Tech Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js
- **Database**: MongoDB 6.0
- **ORM**: Mongoose 7.6+
- **Authentication**: JWT with refresh tokens

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Maps**: Leaflet + OpenStreetMap

### External Services
- **Payments**: Stripe
- **Email**: SendGrid
- **SMS**: Twilio

## Project Structure

```
unbur/
├── packages/
│   ├── backend/          # Express.js API server
│   │   ├── prisma/       # Database schema & migrations
│   │   └── src/
│   │       ├── config/       # Configuration
│   │       ├── controllers/  # Route handlers
│   │       ├── middleware/   # Express middleware
│   │       ├── routes/       # API routes
│   │       ├── services/     # Business logic
│   │       ├── utils/        # Helpers
│   │       └── validators/   # Zod schemas
│   └── web/              # React frontend
│       └── src/
│           ├── components/   # UI components
│           ├── hooks/        # Custom hooks
│           ├── pages/        # Route pages
│           ├── services/     # API client
│           ├── stores/       # Zustand stores
│           └── types/        # TypeScript types
├── scripts/              # Utility scripts
└── .github/workflows/    # CI/CD pipelines
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd unbur
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

5. **Seed the database (optional)**
   ```bash
   npm run db:seed -w @unbur/backend
   ```

7. **Start development servers**
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

## Environment Variables

### Backend

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://localhost:27017/unbur
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=SG....
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
```

### Frontend

```env
VITE_API_URL=http://localhost:3000/api/v1
```

## Scripts

```bash
# Development
npm run dev                    # Start all services
npm run dev -w @unbur/backend   # Start backend only
npm run dev -w @unbur/web       # Start frontend only

# Database (MongoDB with Mongoose)
npm run db:seed                # Seed database with initial data

# Build
npm run build                 # Build all packages
npm run build -w @unbur/backend  # Build backend
npm run build -w @unbur/web      # Build frontend

# Testing
npm run test                  # Run all tests
npm run lint                  # Run linters
```

## Deployment

### Railway (Recommended)

1. Create a Railway project
2. Add MongoDB and Redis services
3. Deploy from GitHub
4. Set environment variables

### Vercel (Frontend)

1. Connect GitHub repository
2. Set root directory to `packages/web`
3. Configure environment variables

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
