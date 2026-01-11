# Deployment Guide

## Requirements
- Node.js 18.x or later (LTS recommended)
- npm 8.x or later (bundled with Node) or Yarn
- Optional: `nvm` to manage Node versions

## Overview
This repository contains two services:
- `backend` — Node/Express + Socket.IO server
- `frontend` — Create React App (CRA) based React application

Deployment approaches:
- Simple (same server): build frontend and serve `frontend/build` from the backend.
- Containerized: build Docker images for frontend and backend and run via Docker Compose or Kubernetes.

## Recommended production deployment (single host)
1. Ensure system has Node.js >= 18 and `npm` installed.
2. From the repo root, install dependencies for both projects:

```bash
npm run install-deps
```

3. Build the frontend for production:

```bash
cd frontend
npm run build
```

4. Start the backend which will serve the `frontend/build` files automatically if present:

```bash
cd ../backend
npm start
```

5. (Optional) Front backend with a reverse proxy (recommended):

- Configure Nginx to proxy `/api` and WebSocket routes to the backend process and serve static files from the backend server or directly from `frontend/build`.

### Start directory and static-serving behavior

- Recommended: run build from the repo root (`npm run build`) and start the backend using the root `start` script (`npm run start`) so paths resolve consistently.
- The backend now detects `frontend/build` in multiple locations so it can be started either from the repo root or from the `backend` folder. It checks these locations (examples):
	- `$(repo-root)/frontend/build` (when started from repo root)
	- `$(repo-root)/backend/../frontend/build` or `$(backend)/../frontend/build` (when started from backend dir)
- If `frontend/build` is present the backend will serve static assets from that folder and return `index.html` for SPA routes. If no build is found it falls back to `backend/public` or a simple health message.

Examples:

```bash
# build frontend from repo root
npm run build

# start backend from repo root (recommended)
npm run start

# or start backend directly from backend directory (also supported)
cd backend
npm start
```
## Containerized deployment (recommended for repeatable deploys)
1. Create Dockerfiles for both `frontend` and `backend`.
2. Use a `docker-compose.yml` to build and run both services locally or in production.

## Security notes
- The CRA dev server is for development only — do not expose it to the public internet.
- Keep Node updated and apply security patches; run `npm audit` regularly.
- For production, serve static assets from a CDN or a hardened web server (Nginx) and terminate TLS at the proxy.

## Troubleshooting
- If frontend fails to build, ensure your Node version matches `engines` in `frontend/package.json` (use nvm to change versions).
- If sockets fail to connect, confirm backend is reachable and proxy preserves WebSocket connections.
