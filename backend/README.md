# Backend

Node.js backend using Express and Socket.IO.

## Scripts
```bash
npm install
npm run dev
```

## Health Check
```pgsql
# Backend

Node.js backend using Express and Socket.IO.

## Quick start (development)
```bash
cd backend
npm install
# Run the backend server (dev uses Node directly here)
npm run dev
```

## Production with frontend build
1. Build the frontend: `cd frontend && npm run build`
2. Start the backend: `cd ../backend && npm start`

The backend will serve the `frontend/build` folder automatically if present.

## Health Check
GET /health  -> returns JSON `{ status: "ok" }`