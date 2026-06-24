# CSRMS — Crown Stores Retail Management System

Full-stack retail management for multi-branch stores: products, inventory, sales/POS, procurement, cashier balancing, reports, audit logs, and role-based dashboards (Director, Manager, Sales Agent).

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express 5, PostgreSQL |
| Frontend | HTML, Bootstrap 5, vanilla JavaScript |
| Auth | JWT with token revocation, bcrypt, session idle timeout |
| Security | Helmet (CSP), CORS, rate limiting |

## Quick start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. Clone and install

```bash
git clone <repo-url>
cd CSRMS
npm install
cp .env.example .env
# Edit .env with your DB password and JWT_SECRET
```

### 2. Database

```bash
npm run db:migrate
npm run db:seed
```

### 3. Run

```bash
npm run dev
```

Open **http://localhost:5000** — the API and frontend are served from the same origin.

### Default credentials (after seed)

| Role | Username | Password |
|------|----------|----------|
| Director | `director` | `Director@123` |
| Manager | `manager1` | `Manager@123` |
| Sales Agent | `agent1` | `Agent@123` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with nodemon |
| `npm test` | Run unit + integration tests (Jest) |
| `npm run test:coverage` | Tests with coverage report |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run db:migrate` | Apply schema + patches |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Migrate + seed |

## Project structure

## API

Base URL: `/api`

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `POST /api/auth/login` | Login |
| `GET /api/auth/me` | Current user |
| `...` | See route files in `src/routes/` |

## Production deployment

1. Set `NODE_ENV=production` in `.env`
2. Use a strong `JWT_SECRET` (32+ random characters)
3. Set `CORS_ORIGIN` to your domain (or rely on same-origin serving)
4. Set `FRONTEND_URL` to your public URL (for password-reset emails)
5. Configure SMTP vars if using forgot-password email
6. Run behind a reverse proxy (nginx/Caddy) with HTTPS
7. Enable PostgreSQL backups (daily `pg_dump` recommended)

Example with PM2:

```bash
npm run db:migrate
NODE_ENV=production pm2 start src/app.js --name csrms
```

## Security

- **Rate limiting**: 300 req/15 min global; 20 req/15 min on `/api/auth`
- **JWT revocation**: logout blacklists token `jti`
- **Branch isolation**: managers/agents scoped to their branch
- **Helmet CSP**: restricts script/style sources (CDN Bootstrap allowed)
- **Password reset**: time-limited tokens, optional SMTP

## Testing

```bash
npm test              # Unit + integration (mocked DB)
npm run test:e2e      # Browser E2E (requires DB seeded + Chromium)
npx playwright install chromium   # first-time E2E setup
```

Integration tests use Jest + Supertest with a mocked database. E2E tests use Playwright against a live server with seeded credentials.

## Backup & restore

```bash
# Backup
pg_dump -U postgres -d csrms_db -F c -f csrms_backup.dump

# Restore
pg_restore -U postgres -d csrms_db --clean csrms_backup.dump
```

## License

ISC
