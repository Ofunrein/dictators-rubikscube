# The Dictators Website

React + Vite frontend for the landing page and cube simulator.

## Run

```bash
npm install
npm run dev
```

Default frontend URL is `http://localhost:5173`.

## Backend API integration

The simulator calls the backend API at:

- `GET /v1/health`
- `GET /v1/cube/state/solved`
- `POST /v1/cube/moves/apply`
- `POST /v1/cube/scramble`
- `POST /v1/cube/solve`

Set a custom API base URL with:

```bash
VITE_API_BASE_URL=http://localhost:5001 npm run dev
```

If not set, the frontend uses `http://localhost:4011`.

## Build and lint

```bash
npm run lint
npm run build
```
