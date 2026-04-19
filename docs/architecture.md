# Architecture

This document describes the current project structure and runtime flow for the active Rubik's Cube platform.

## System Overview

```text
Browser
  -> Active frontend: frontend/ (Vite dev server on :5400)
  -> Frontend calls /api/v1/* through Vite proxy in local dev

frontend/
  -> Landing page components
  -> Simulator page
  -> Shared cube model and move engine in src/cube/
  -> Frontend API client in src/net/api.js

backend/api/
  -> Local Node API server on :5200
  -> Shared route handlers and solver orchestration
  -> Imports the shared cube model from frontend/src/cube/

api/
  -> Vercel production handlers
  -> Thin production adapter around the same route behavior

backend/src/cube/
  -> C++ solver source and bridge code

backend/vendor/
  -> Vendored Python NxN solver support
```

## Current Runtime Flow

### Local development

1. `npm run dev` from the repo root starts:
   - frontend on `http://localhost:5400`
   - backend API on `http://localhost:5200`
2. The browser talks to the frontend on `5400`.
3. Frontend requests to `/api/v1/*` are proxied to the local API on `5200`.
4. The backend validates input, applies moves, generates scrambles, or delegates solve work.

### Production deployment

1. Vercel builds the static site from `frontend/`.
2. Vercel serves `api/v1/[...path].js` as serverless API routes.
3. The frontend and API still share the same public origin.

## Source Of Truth By Responsibility

### Frontend UI

- `frontend/src/components/`
- `frontend/src/pages/simulator/`

### Shared cube state and move logic

- `frontend/src/cube/`

This is important: the backend intentionally reuses the shared frontend cube model so the project has one move engine and one state contract.

### Backend route and solver orchestration

- `backend/api/src/routes.js`
- `backend/api/src/server.js`
- `backend/api/src/solvers/`

### Production API entrypoint

- `api/v1/[...path].js`

### Native solver code

- `backend/src/cube/`

### Reference-only legacy prototype

- `frontend-legacy/`

This folder is not part of the active app flow and should not be treated as the current frontend.

## Simulator Structure

The simulator is intentionally split into page-level pieces so the main page does not become one large unreadable file.

```text
frontend/src/pages/simulator/
  SimulatorPage.jsx          main page composition and state wiring
  InteractiveCube.jsx        3D scene and pointer interactions
  SimulatorControls.jsx      controls, history, timer actions
  TutorialPanel.jsx          tutorial and learning content
  SimulatorFaceMap.jsx       2D unfolded face map
  useCubeControls.js         keyboard, click, and drag move input
  useSimulatorQueue.js       queued move animation lifecycle
  useSimulatorActions.js     scramble, solve, reset, and size-change actions
  simulatorAnimation.js      animation timing and motion helpers
  moveNotation.js            move-sequence normalization and inversion helpers
  simulatorFaceMapUtils.js   face-map normalization and orientation helpers
```

## Why The Repo Is Split This Way

- `frontend/` stays focused on the active web app
- `backend/` stays focused on local API logic and solver integration
- `api/` stays small because it is only the production deployment adapter
- `docs/` holds project-level explanation instead of hiding it inside one app folder

This split is easier to scale than putting all frontend and backend files in the root, but it only works well when the root README stays the canonical onboarding document.
