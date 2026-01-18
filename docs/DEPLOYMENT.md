# Deployment Guide

This guide provides comprehensive instructions for deploying the ComboCard game application.

## Table of Contents

- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Requirements

### System Requirements

- **Node.js**: 18.x or later (LTS recommended)
- **npm**: 8.x or later (bundled with Node.js)
- **Git**: For version control
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
```

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
NODE_ENV=production PORT=3001 node src/server.js
```

2. **Deploy Frontend:**

```bash
cd frontend
npm run build
# Serve using nginx, Apache, or a static hosting service
```

### Option 3: Reverse Proxy with Nginx

1. **Configure Nginx:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve static frontend files
    location / {
        root /var/www/combocard/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy WebSocket connections
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

2. **Enable and Restart Nginx:**

```bash
sudo ln -s /etc/nginx/sites-available/combocard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Docker Deployment

### Using Docker Compose

1. **Create `docker-compose.yml`:**

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
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

EXPOSE 3001

CMD ["node", "src/server.js"]
```

3. **Create Frontend Dockerfile (`frontend/Dockerfile`):**

```dockerfile
FROM node:18-alpine AS build

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
docker-compose up -d --build
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
npm run start:backend

# Terminal 2: Start frontend (production build)
npm run build
npx serve -s frontend/build -l 3000

# Terminal 3: Run E2E tests
npm run test:e2e
```

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

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### Frontend (`frontend/.env`)

```env
# API URL (for production builds)
REACT_APP_API_URL=http://localhost:3001

# WebSocket URL
REACT_APP_WS_URL=http://localhost:3001

# Environment
REACT_APP_ENV=development
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
node --version  # Should be >= 18

# Try with clean cache
cd frontend
rm -rf node_modules build
npm install
npm run build
```

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
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up monitoring (PM2, logging)
- [ ] Configure backup strategy
- [ ] Set up health checks
- [ ] Enable gzip compression
- [ ] Configure CDN for static assets
