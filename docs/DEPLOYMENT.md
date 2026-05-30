# Deployment Guide

## Frontend — Vercel

1. Push `travelshield/frontend` to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variable:
   - `VITE_API_URL` = `https://your-api.railway.app/api`
4. Deploy (uses `vercel.json` for SPA routing)

## Backend — Railway

1. Create new project on [Railway](https://railway.app)
2. Add PostgreSQL plugin
3. Deploy from `travelshield/backend` directory
4. Set environment variables:
   ```
   DATABASE_URL=<from Railway PostgreSQL>
   JWT_ACCESS_SECRET=<random 64 char string>
   JWT_REFRESH_SECRET=<random 64 char string>
   CORS_ORIGIN=https://your-app.vercel.app
   FRONTEND_URL=https://your-app.vercel.app
   NODE_ENV=production
   ```
5. Set start command: `npx prisma migrate deploy && node dist/index.js`
6. Run seed once: `npm run db:seed`

## Backend — Render (alternative)

1. Create Web Service from GitHub repo
2. Root directory: `travelshield/backend`
3. Build: `npm install && npx prisma generate && npm run build`
4. Start: `npx prisma migrate deploy && npm start`
5. Add PostgreSQL database from Render dashboard

## Database — PostgreSQL

**Railway/Render:** Use managed PostgreSQL (included)

**Standalone:** Any PostgreSQL 16+ host. Connection string format:
```
postgresql://user:password@host:5432/travelshield?schema=public
```

## Docker Production

```bash
cd travelshield
cp .env.example .env
# Set JWT secrets

docker compose up -d --build
```

Services:
- Frontend: port 80
- Backend: port 5000
- PostgreSQL: port 5432

## Environment Checklist

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection |
| JWT_ACCESS_SECRET | Yes | Access token signing |
| JWT_REFRESH_SECRET | Yes | Refresh token signing |
| CORS_ORIGIN | Yes | Frontend URL(s) |
| FRONTEND_URL | Yes | For email links |
| SMTP_* | No | Email (mock in dev) |
| NODE_ENV | Yes | production |

## Post-Deploy

1. Run migrations: `npx prisma migrate deploy`
2. Seed database: `npm run db:seed`
3. Verify health: `GET /health`
4. Test login with demo credentials

## CI/CD (optional)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd travelshield/backend && npm ci && npm run build
      - run: cd travelshield/frontend && npm ci && npm run build
```

## Security Notes

- Change all default JWT secrets in production
- Enable HTTPS on all endpoints
- Configure SMTP for real email delivery
- Review rate limits for production traffic
- Never commit `.env` files
