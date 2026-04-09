# Vercel Full-Stack Integration — Contribution Summary

## Primary Contributions

### 1. Vercel deployment architecture

Designed and implemented the Vercel-compatible project structure that unifies the frontend and backend into a single deployable artifact. This eliminates the need for a separate backend server and enables zero-config deployment.

- Created `vercel.json` configuration with Vite build settings and API rewrite rules
- Implemented `api/v1/[...path].js` as a catch-all serverless function that routes requests to the existing backend logic
- Configured route rewrites so `/api/v1/*` requests are transparently handled by serverless functions while all other routes serve the React SPA

### 2. Kyle's cube renderer integration

Ported the sticker-mesh 3D rendering approach from the standalone Three.js prototype (`frontend/src/main.js`) into the React website's `SimulatorPage.jsx`. Key elements:

- **Dark cubie bodies** — `boxGeometry` with `#111111` material, matching real Rubik's Cube aesthetics
- **Sticker plane overlays** — separate `PlaneGeometry` meshes positioned on exposed faces with a small epsilon offset
- **`getStickerIndex()`** — face/position to sticker array index mapping for all six faces
- **`CUBIE_FACES_DEF`** — face orientation and rotation definitions for sticker placement
- **`resolveStickerColor()`** — token-to-hex color resolution with validation

This replaced the previous single-material-per-face approach with a visually accurate sticker-on-body rendering style.

### 3. 18-move engine upgrade

Replaced the 12-move engine with the 18-move version supporting middle slice turns:

- **M (Middle)** — vertical slice between L and R faces
- **E (Equator)** — horizontal slice between U and D faces
- **S (Standing)** — depth slice between F and B faces

Added corresponding UI buttons and keyboard shortcuts (`m/M`, `e/E`, `s/S`) to the simulator page.

### 4. Frontend API client

Created `dictators-website/src/net/api.js` — a fetch-based API client configured for same-origin relative paths (`/api/v1/...`). Functions:

- `healthCheck()` — GET `/api/v1/health`
- `getSolvedState()` — GET `/api/v1/cube/state/solved`
- `applyMove(state, move)` — POST `/api/v1/cube/moves/apply`
- `scrambleCube(length)` — POST `/api/v1/cube/scramble`
- `solveCube(state)` — POST `/api/v1/cube/solve`

### 5. Serverless API migration

The catch-all serverless function (`api/v1/[...path].js`) imports backend logic from `backend/api/src/` with zero code duplication:

- Dynamically imports `cube.js` and `validation.js` from the existing backend
- Routes requests based on HTTP method + path to the appropriate handler
- Returns proper JSON responses with CORS headers
- Maintains the same request/response contract as the standalone Node.js server

## Architecture

```
Browser Request → Vercel CDN
├── /api/v1/* → Serverless Function → backend/api/src/ logic
└── /* → Static Build (dictators-website/dist/)
```

The frontend and API share the same origin, eliminating CORS issues and simplifying deployment to a single Vercel project.

## Technical Decisions

1. **Catch-all route pattern** — a single `[...path].js` file handles all API routes, avoiding the need for 5+ separate serverless function files
2. **Import reuse over duplication** — the serverless wrapper imports existing backend modules rather than copying code, ensuring parity with the standalone server
3. **Same-origin API** — relative paths in the API client mean the frontend works identically in development and production without environment-specific configuration
4. **Sticker-mesh rendering** — separate plane meshes per sticker provide accurate color mapping and enable future sticker-level interactions (picking, highlighting)

## Authored Commit Appendix

### Sprint 2

| Hash | Date | Description |
|------|------|-------------|
| 6225a2e | Apr 9 | Add Vercel config, serverless API, upgrade cube logic to 18-move engine |
| 2af00b5 | Apr 9 | Port sticker-mesh cube renderer into SimulatorPage |
