# Sprint 3 — Martin Ofunrein — Delivered Changes

**Branch:** `sprint-3-martin`  
**Scope updated:** April 14, 2026

## What shipped

### 1. Live simulator now uses Eric's C++ solver through the API

The live `dictators-website` stack no longer depends on reverse-history solving.

Delivered pieces:
- `backend/src/cube/solver_bridge.cpp`
  - WASM bridge for Eric's C++ solver
  - exports `solveCube` and `solveCubeMoves`
- `api/solver.js`
  - rebuilt Emscripten single-file WASM bundle
- `backend/api/src/wasmSolver.js`
  - shared Node-side loader for the WASM solver
  - flattens frontend cube state to the C++ input format
  - normalizes the solved output back to canonical frontend orientation
- `backend/api/src/server.js`
  - `/v1/cube/solve` now calls the real WASM solver
- `api/v1/[...path].js`
  - production/Vercel API route also calls the real WASM solver
- `dictators-website/src/net/api.js`
  - solve response now accepts solved cube state from the backend
- `dictators-website/src/pages/SimulatorPage.jsx`
  - solve button now calls the API
  - solved state is applied from the backend response
  - reverse-history solving was removed

### 2. Color pop / flashing fix for the 3D cube

The live simulator was snapping cubies back onto a static layout after each turn, which caused sticker/color popping during turns, especially slice moves.

Delivered fix:
- `dictators-website/src/pages/simulatorAnimation.js`
  - added slice move animation support for `M`, `E`, `S`
  - added `rotateCubiePosition(...)`
- `dictators-website/src/pages/SimulatorPage.jsx`
  - `InteractiveCube` now tracks mutable cubie layout state
  - animated cubies are reattached and kept in their rotated positions after each move
  - solved-state resets rebuild layout cleanly

### 3. Timer / interaction polish that remains active

The simulator still includes the earlier timer improvements:
- timer starts on first user move after scramble
- timer starts from a fresh solved/reset cube on first move
- best time persists in `localStorage`

## Important solver note

Eric's C++ backend solver is now the real engine behind the solve endpoint, but only the **solved-state** path is currently used live.

Current state:
- `solveCube` is verified and working through WASM
- `solveCubeMoves` is still not reliable enough for live use
- the move-list export can return incorrect sequences even when the solved-state export is correct

Because of that, the frontend currently:
- sends the current cube state to the API
- receives a solved cube state back from Eric's solver
- snaps to the solved state

This is intentional until move-sequence export is stable enough to animate a full solver replay safely.

## Verification completed

### Backend / solver verification
- Rebuilt `api/solver.js` from current C++ sources
- Verified `solveCubeStateWithWasm(...)` against:
  - solved state
  - `R`
  - `U`
  - `F`
  - `B`
  - `R U F' L`
- All of the above normalized back to canonical solved state successfully

### API verification
- Fresh root dev session started with:
  - API on `http://localhost:5200`
  - frontend on `http://localhost:5300`
- Posted a real scrambled cube state to:
  - `POST /v1/cube/solve`
- Confirmed `200 OK`
- Confirmed response included:
  - canonical solved cube state
  - `solver: "eric-cpp-wasm"`

### Frontend verification
- `npm --prefix dictators-website run build` passed
- `npm --prefix dictators-website run test -- --run src/pages/simulatorAnimation.test.js` passed

## Files touched for this sprint delivery

- `api/solver.js`
- `api/v1/[...path].js`
- `backend/api/src/server.js`
- `backend/api/src/wasmSolver.js`
- `backend/src/cube/CubeOperations.cpp`
- `backend/src/cube/CubeOperations.h`
- `backend/src/cube/PuzzleCube.cpp`
- `backend/src/cube/PuzzleCube.h`
- `backend/src/cube/solver_bridge.cpp`
- `dictators-website/src/net/api.js`
- `dictators-website/src/pages/SimulatorPage.jsx`
- `dictators-website/src/pages/simulatorAnimation.js`
- `dictators-website/src/pages/simulatorAnimation.test.js`

## What the folders are doing

### `backend/api/`

This is the **local Node API** used during development.

Main files:
- `backend/api/src/server.js`
  - local dev API server
  - handles `/v1/health`, `/v1/cube/state/solved`, `/v1/cube/moves/apply`, `/v1/cube/scramble`, `/v1/cube/solve`
- `backend/api/src/validation.js`
  - request validation for those endpoints
- `backend/api/src/cube.js`
  - shared cube-state helpers used by the local API
- `backend/api/src/wasmSolver.js`
  - local API bridge that loads the WASM solver bundle and calls Eric's C++ solver through it
- `backend/api/src/mockServer.js`
  - mock/example API server
  - not the real solve path used by the current simulator

In short:
- `backend/api/` is the **development API**
- this is what the frontend talks to locally through Vite proxying

### `api/v1/`

This is the **production / Vercel API** layer.

Main file:
- `api/v1/[...path].js`
  - catch-all Vercel serverless function
  - mirrors the same route behavior as the local API
  - also calls `solveCubeStateWithWasm(...)`

In short:
- `backend/api/` = local dev API
- `api/v1/` = deployed Vercel API

They both reach the same solver bridge:
- `backend/api/src/wasmSolver.js`
- `api/solver.js`
- `backend/src/cube/solver_bridge.cpp`
- `CubeOperations::solve3x3(...)`

### `scripts/`

This folder is for **repo-level developer tooling**.

Main files:
- `scripts/dev.mjs`
  - starts both the frontend and local API together from the repo root
- `scripts/dev-frontend.mjs`
  - starts only the active frontend
- `scripts/setup.mjs`
  - installs/checks dependencies for the workspace

In short:
- `scripts/` is not app logic
- it exists to make local development easier

## Current dev server

Fresh root dev session was started from repo root with:

```bash
npm run dev
```

At verification time it was serving:
- frontend: `http://localhost:5300`
- API: `http://localhost:5200`
