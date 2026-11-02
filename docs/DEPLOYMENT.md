# Deployment Guide

This guide provides comprehensive instructions for deploying the ComboCard game application.

## Table of Contents

- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Going Live on the Internet](#going-live-on-the-internet)
- [Docker Deployment](#docker-deployment)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Requirements

### System Requirements

- **Node.js**: 20.19 or later (LTS recommended)
- **npm**: 8.x or later (bundled with Node.js)
- **Git**: For version control
- **PostgreSQL**: 17 recommended. Required to keep data across restarts, see [DATABASE.md](DATABASE.md)
- **Optional**: Docker and Docker Compose for containerized deployment

### Recommended Tools

- **nvm**: For managing Node.js versions
- **VS Code**: Recommended IDE with ESLint/Prettier extensions

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/combocard-game.git
cd combocard-game
```

### 2. Install All Dependencies

```bash
npm run install:all
```

This installs dependencies for:
- Root project (concurrently)
- Backend (Express, Socket.IO, etc.)
- Frontend (React, Redux, etc.)
- E2E tests (Playwright)

### 3. Start Development Servers

```bash
npm run dev
```

This starts both servers concurrently:
- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:3000

---

## Development Setup

### Backend Development

```bash
# Start backend with hot-reload
npm run dev:backend

# Run backend tests
npm run test:backend

# Lint backend code
npm --prefix backend run lint
```

**Backend Structure:**
```
backend/
├── src/
│   ├── server.js           # Entry point
│   ├── config/             # Configuration
│   ├── controllers/        # HTTP handlers
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── sockets/            # Socket.IO handlers
│   └── utils/              # Utilities
└── __tests__/              # Unit tests
```

### Frontend Development

```bash
# Start frontend development server
npm run dev:frontend

# Run frontend tests
npm run test:frontend

# Build for production
npm run build
```

**Frontend Structure:**
```
frontend/
├── src/
│   ├── App.jsx             # Root component
│   ├── components/         # React components
│   │   ├── common/         # Reusable UI components
│   │   └── game/           # Game-specific components
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   ├── services/           # API services
│   ├── store/              # Redux store
│   │   └── slices/         # Redux slices
│   ├── styles/             # CSS files
│   └── utils/              # Utility functions
└── src/__tests__/          # Unit tests
```

---

## Production Deployment

### Option 1: Single Server Deployment (Recommended for Simple Setups)

1. **Build the Frontend:**

```bash
npm run build
```

2. **Set Environment Variables:**

```bash
export NODE_ENV=production
export PORT=3001
export JWT_SECRET="$(openssl rand -hex 48)"   # keep it stable: see the note below
export CORS_ORIGIN=https://game.example.com
export DATABASE_URL=postgresql://user:password@localhost:5432/combocard
```

In production the server refuses to start without a `JWT_SECRET` of at least 32 characters. Generate it once and store it in `backend/.env`: a new value at each start would invalidate every access token. See [AUTH.md](AUTH.md).

3. **Start the Backend:**

```bash
npm start
```

The backend will automatically serve the frontend build from `frontend/build/`.

4. **(Optional) Use a Process Manager:**

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start backend/src/server.js --name combocard

# Enable startup script
pm2 startup
pm2 save
```

### Option 2: Separate Frontend and Backend

1. **Deploy Backend:**

```bash
cd backend
npm install --production
NODE_ENV=production PORT=3001 JWT_SECRET=<secret> CORS_ORIGIN=https://game.example.com node src/server.js
```

2. **Deploy Frontend:**

```bash
cd frontend
npm run build
# Serve using nginx, Apache, or a static hosting service
```

If frontend and backend are on different domains, build the frontend with `VITE_API_URL` and `VITE_BACKEND_URL`, and set `COOKIE_SAMESITE=none` on the backend, otherwise the browser does not send the refresh cookie.

### Option 3: Reverse Proxy with Nginx (Recommended on the Internet)

Follow [Going Live on the Internet](#going-live-on-the-internet).

---

## Going Live on the Internet

Browsers talk HTTPS only to Nginx. Nginx forwards everything to Node on `127.0.0.1:3001`, and Node serves both the API and the frontend. The database stays closed inside the server.

```text
Browser --HTTPS--> Nginx :443 --> Node 127.0.0.1:3001 --> PostgreSQL 127.0.0.1:5432
```

> These steps have not been run on a real server yet. Replace `game.example.com` with your domain.

### 1. Prerequisites

- A Linux server (these commands are for Ubuntu) with a public IP address
- A domain, with a DNS `A` record pointing to that IP
- Node.js 20.19 or later
- PostgreSQL 17. To use the `docker-compose.yml` of the repository, **change `POSTGRES_PASSWORD` first**: it applies only when the volume is created, so changing it later has no effect

### 2. Configure the Backend

Generate the secret that signs the access tokens. Anyone who knows it can impersonate any player, so never commit it or reuse it between environments:

```bash
openssl rand -hex 48
```

Create `backend/.env` on the server:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=<generated value>
DATABASE_URL=postgresql://combocard:<strong-password>@localhost:5432/combocard
CORS_ORIGIN=https://game.example.com
TRUST_PROXY=1
```

```bash
chmod 600 backend/.env
```

| Setting | Why it matters |
|---------|----------------|
| `CORS_ORIGIN` | Without it, the server refuses requests coming from your own site |
| `TRUST_PROXY=1` | Without it, every user appears to have the IP of Nginx and they all share the same request and login attempt limits |
| `COOKIE_SECURE` | Not needed: it is already on in production |

Migrations run automatically at startup.

The default request limits fit normal play, so you do not need to set them. See [Rate Limits](#rate-limits).

### 3. Build the Frontend

`VITE_BACKEND_URL` is required. Without it the frontend opens the socket on port 3001, which is closed, and the game stops receiving real-time updates.

```bash
npm run install:all
VITE_BACKEND_URL=https://game.example.com npm run build
```

### 4. Configure Nginx

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/combocard
```

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name game.example.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        # Required by the Socket.IO WebSockets
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Tell the backend who the real client is
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/combocard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Enable HTTPS

Certbot gets a free Let's Encrypt certificate, updates the Nginx configuration and renews the certificate automatically. The DNS record must already work, and ports 80 and 443 must be open.

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d game.example.com
sudo certbot renew --dry-run
```

HTTPS is required for the session too: over plain HTTP the browser discards the `Secure` refresh cookie, and reloading the page asks for the login again.

### 6. Close Everything Else

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Ports 3001 and 5432 stay closed from the outside. Docker can bypass `ufw`, so keep the database port bound to `127.0.0.1`, as `docker-compose.yml` already does.

### 7. Keep the Server Running

```bash
sudo npm install -g pm2
pm2 start backend/src/server.js --name combocard
pm2 save
pm2 startup   # prints a command to copy and run
```

Run a single instance: the state of the active games lives in the memory of one process.

### 8. Verify

- [ ] `https://game.example.com` opens with the padlock
- [ ] After the login, reloading the page keeps you logged in
- [ ] With two browsers, drawn cards appear on both: this confirms that the WebSockets work
- [ ] `https://game.example.com/api/health` answers `success`
- [ ] `https://game.example.com/api/health/detailed` shows `database.enabled: true` and `pendingWrites: 0`

### Rate Limits

The limits apply per IP address, in production only. Players behind the same public IP address, for example at home or in an office, share them.

| Limit | Default | Setting |
|-------|---------|---------|
| All `/api/` requests | 3000 every 15 minutes | `RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_MS` |
| Registration | 10 per minute | Fixed |
| Failed logins | 10 per minute | Fixed |

The client polls the server while waiting: every 3 seconds in the hall and every 2 seconds in a lobby, so up to 450 requests every 15 minutes per player. The default covers about 6 players on the same IP address. If players get HTTP 429 in normal use, raise `RATE_LIMIT_MAX_REQUESTS` by 450 for each additional player.

A `backend/.env` copied from an older example may still contain `RATE_LIMIT_MAX_REQUESTS=100`, which blocks a player after a few minutes: remove that line or update the value.

### Updates and Backups

```bash
git pull
npm run install:all
VITE_BACKEND_URL=https://game.example.com npm run build
pm2 restart combocard
```

Nothing backs up the database automatically. As a start, schedule a daily dump and copy it off the server:

```bash
docker compose exec -T postgres pg_dump -U combocard combocard > "combocard-$(date +%F).sql"
```

### Before Opening to the Public

- **Free credits:** the cash desk adds credits without any payment, which is fine only as long as they have no real value.
- **Forgotten passwords:** there is no way to recover them yet.

---

## Docker Deployment

### Using Docker Compose

> The `docker-compose.yml` in the repository only starts PostgreSQL for local development, and the repository has no Dockerfiles. The steps below are a template to containerize the whole application: they have not been tested, and they use a separate file so that the existing one is not overwritten. These services also need `JWT_SECRET`, `CORS_ORIGIN` and `DATABASE_URL`.

1. **Create `docker-compose.prod.yml`:**

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped
```

2. **Create Backend Dockerfile (`backend/Dockerfile`):**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

EXPOSE 3001

CMD ["node", "src/server.js"]
```

3. **Create Frontend Dockerfile (`frontend/Dockerfile`):**

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

4. **Run with Docker Compose:**

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Testing

### Unit Tests

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run only backend tests
npm run test:backend

# Run only frontend tests
npm run test:frontend
```

### End-to-End Tests

```bash
# Install Playwright browsers (first time)
npm run e2e:install

# Run all E2E tests
npm run test:e2e

# Run E2E tests with browser visible
npm run test:e2e:headed

# Run E2E tests in interactive UI mode
npm run test:e2e:ui

# Run only smoke tests
npm run test:e2e:smoke
```

### E2E Test Prerequisites

Before running E2E tests, ensure both servers are running:

```bash
# Terminal 1: Start backend
npm run start:backend:e2e

# Terminal 2: Start frontend (production build)
npm run build
npx serve -s frontend/build -l 3000

# Terminal 3: Run E2E tests
npm run test:e2e
```

`start:backend:e2e` runs the backend with `RATE_LIMIT_DISABLED=true` to avoid 429
responses during high-volume test runs.

---

## CI/CD Pipeline

The project includes GitHub Actions workflows for automated testing and deployment.

### CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and pull request:

1. **Lint**: Checks code style (ESLint)
2. **Test Backend**: Runs backend unit tests with coverage
3. **Test Frontend**: Runs frontend unit tests with coverage
4. **Build**: Creates production build
5. **Security Audit**: Checks for vulnerabilities

### E2E Workflow (`.github/workflows/e2e.yml`)

Runs on every push and pull request:

1. **Full E2E Tests**: Runs all Playwright tests on all browsers
2. **Smoke Tests**: Quick validation on Chromium only

### Viewing Test Results

- Test reports are uploaded as artifacts
- Access them from the GitHub Actions run summary
- Playwright HTML reports available for E2E tests

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# CORS (comma-separated allowlist; supports wildcard patterns using '*')
# Examples:
# - Local dev only:
#   CORS_ORIGIN=http://localhost:3000,http://localhost:3001
# - Local dev + any device in 192.168.1.x subnet:
#   CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://192.168.1.*:3000
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://192.168.1.*:3000

# Authentication: required in production, at least 32 characters (openssl rand -hex 48)
JWT_SECRET=change-me
# Number of reverse proxies in front of the server, for example 1 with Nginx
TRUST_PROXY=0

# Database (without it, data is kept in memory and lost on restart)
DATABASE_URL=postgresql://user:password@localhost:5432/combocard
DATABASE_POOL_MAX=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=3000

# Logging
LOG_LEVEL=info
```

### Frontend (`frontend/.env`)

```env
# API URL (optional; defaults to /api via the Vite dev proxy)
VITE_API_URL=/api

# Socket/Backend URL (used for Socket.IO)
VITE_BACKEND_URL=http://localhost:3001

# Environment
```

### E2E Tests (`e2e/.env`)

```env
# Test URLs
E2E_BASE_URL=http://localhost:3000
E2E_API_URL=http://localhost:3001

# Test User
E2E_TEST_USER_NAME=TestPlayer
```

---

## Troubleshooting

### Common Issues

#### 1. Ports Already in Use

```bash
# Check what's using port 3000 or 3001
lsof -i :3000
lsof -i :3001

# Kill the process
kill -9 <PID>
```

#### 2. WebSocket Connection Fails

- Ensure the backend server is running
- Check CORS configuration
- Verify proxy settings in `frontend/package.json`
- Check firewall rules

#### 3. LAN / Multi-device Testing

- Prefer using a wildcard allowlist for LAN origins to avoid enumerating every device IP:
  - `CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://192.168.1.*:3000`
- If the frontend is opened via IP (e.g. `http://192.168.1.42:3000`), that exact origin must be allowed.
- Restart the backend after changing `.env`.

**Quick verification (simulate LAN Origin locally):**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Origin: http://192.168.1.42:3000" \
  http://localhost:3001/api/health
```

Expected: `HTTP 200` if allowed; `HTTP 500` if blocked.

#### 3. Build Fails

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules backend/node_modules frontend/node_modules
npm run install:all
```

#### 4. E2E Tests Fail to Start

```bash
# Ensure Playwright browsers are installed
npm run e2e:install

# Check if servers are accessible
curl http://localhost:3000
curl http://localhost:3001/api/health
```

#### 5. Frontend Build Issues

```bash
# Check Node version
node --version  # Should be >= 20.19

# Try with clean cache
cd frontend
rm -rf node_modules build
npm install
npm run build
```

#### 6. Server Exits at Startup

- `JWT_SECRET must be set`: set a value of at least 32 characters in `backend/.env`.
- `Could not initialize the database`: check `DATABASE_URL` and that PostgreSQL is running.

#### 7. Login Is Lost When Reloading the Page

The browser is discarding the refresh cookie. The site must use HTTPS. To try a production build over plain HTTP, for example on a local network, set `COOKIE_SECURE=false`.

#### 8. All Users Get "Too Many Failed Login Attempts"

Set `TRUST_PROXY` to the number of reverse proxies in front of the server, usually `1`.

#### 9. Players Get HTTP 429 During Normal Use

Check `RATE_LIMIT_MAX_REQUESTS` and `TRUST_PROXY`. See [Rate Limits](#rate-limits).

#### 10. Requests Fail With HTTP 500 and "CORS blocked" in the Logs

The address in the browser must be listed in `CORS_ORIGIN`, with the same protocol and port.

### Getting Help

- Check the [README.md](../README.md) for general information
- Review [GAME_DESIGN.md](./GAME_DESIGN.md) for game mechanics
- Open an issue on GitHub for bugs

---

## Security Notes

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use HTTPS in production** - Terminate TLS at the reverse proxy
3. **Keep dependencies updated** - Run `npm audit` regularly
4. **Use rate limiting** - Already configured in backend middleware
5. **Validate all input** - Use the validation middleware
6. **Keep `JWT_SECRET` private** - Anyone who knows it can impersonate any player. Changing it invalidates all access tokens, while refresh tokens keep working

---

## Performance Optimization

### Frontend

- **Code Splitting**: React lazy loading for routes
- **Asset Optimization**: Webpack minification in production build
- **Caching**: Configure browser caching headers

### Backend

- **Compression**: Enabled via `compression` middleware
- **Rate Limiting**: Prevents abuse
- **Efficient WebSocket**: Socket.IO with Redis adapter for scaling

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set a private `JWT_SECRET`, at least 32 characters
- [ ] Set `DATABASE_URL`, with a strong password
- [ ] Set `TRUST_PROXY` when behind Nginx
- [ ] Check that `RATE_LIMIT_MAX_REQUESTS` is not set to an old low value
- [ ] Build the frontend with `VITE_BACKEND_URL`
- [ ] Keep ports 3001 and 5432 closed from the outside
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up monitoring (PM2, logging)
- [ ] Configure backup strategy
- [ ] Set up health checks
- [ ] Enable gzip compression
- [ ] Configure CDN for static assets
