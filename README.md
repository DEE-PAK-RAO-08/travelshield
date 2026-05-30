# TravelShield AI - Full Stack Application

Production-ready full-stack web application built from the [Figma mobile design](https://www.figma.com/design/YXUeFW76TOeo36gS9yyEQ0/Untitled--Copy-?node-id=6-3).

## Architecture

```
travelshield/
├── frontend/          React + TypeScript + Tailwind + Vite + Zustand
├── backend/           Node.js + Express + Prisma + PostgreSQL
├── docker-compose.yml Full stack orchestration
└── docs/              API, database, deployment guides
```

## Figma Screens Implemented (21 screens)

| Screen | Route |
|--------|-------|
| Splash | `/` |
| Onboarding (3 slides) | `/onboarding` |
| Login | `/login` |
| Register | `/register` |
| Forgot / Reset Password | `/forgot-password`, `/reset-password` |
| Dashboard (Home) | `/dashboard` |
| Live Map | `/map` |
| Emergency SOS | `/sos` |
| Smart Alerts | `/alerts` |
| Tourist Profile | `/profile` |
| Safety Score | `/safety-score` |
| Travel AI Chat | `/travel-ai` |
| Digital Tourist ID | `/digital-id` |
| Travel History | `/travel-history` |
| Emergency Contacts | `/emergency-contacts` |
| Settings | `/settings` |
| Admin Dashboard | `/admin` |

## Design System (from Figma)

- **Background:** `#050b1f` (navy)
- **Cards:** `#0a1330` with glass blur
- **Accent:** `#00e5ff` / `#00b8d4` (cyan)
- **Success:** `#4ade80` | **SOS:** `#ef4444`
- **Fonts:** Orbitron (brand), Space Grotesk (headings), Inter (body)

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ (or Docker)

### 1. Database

```bash
cd travelshield/backend
cp .env.example .env
# Edit DATABASE_URL in .env

npm install
npx prisma generate
npx prisma db push
npm run db:seed
```

### 2. Backend

```bash
npm run dev
# API: http://localhost:5000
```

### 3. Frontend

```bash
cd ../frontend
npm install
npm run dev
# App: http://localhost:5173
```

### Docker (all services)

```bash
cd travelshield
docker compose up --build
# Frontend: http://localhost
# API: http://localhost:5000
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| User | alex@travelshield.ai | User@123456 |
| Admin | admin@travelshield.ai | Admin@123456 |

## Features

- JWT authentication with refresh tokens
- Role-based access control (USER / ADMIN)
- Email verification & password reset flows
- Real-time safety dashboard with AI score
- Interactive map with safe zones & POIs
- Hold-to-activate SOS emergency system
- Smart alerts with filtering & pagination
- Travel AI chat assistant
- Digital tourist passport with blockchain hash
- Travel history timeline
- Emergency contacts management
- Admin analytics & user management
- Rate limiting, CORS, Helmet, XSS sanitization

## Documentation

- [API Reference](./docs/API.md)
- [Database Schema](./docs/DATABASE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## Tech Stack

**Frontend:** React 18, TypeScript, Tailwind CSS, React Router 7, Zustand, Axios, Lucide Icons, Vite

**Backend:** Node.js, Express, Prisma ORM, PostgreSQL, JWT, bcrypt, Winston, express-validator

**DevOps:** Docker, Docker Compose, Vercel (frontend), Railway/Render (backend)

## License

MIT
