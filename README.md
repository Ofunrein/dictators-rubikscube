# The Dictators — 3D Rubik's Cube Platform

***REMOVED***

An interactive, browser-based 3D Rubik's Cube platform with real-time manipulation, guided tutorials, and a full-stack API.

## Features

| Feature | Description |
|---------|-------------|
| **3D Simulator** | Sticker-mesh Rubik's Cube with smooth move animations |
| **18-Move Engine** | Full notation — U, D, L, R, F, B plus M, E, S slices |
| **Tutorial System** | Step-by-step learning: cross → F2L → OLL → PLL |
| **Algorithm Reference** | Quick-apply sequences (Sexy Move, Sune, U-Perm, etc.) |
| **REST API** | 5 endpoints: health, solved state, apply move, scramble, solve |
| **C++ Solver** | 7-step algorithmic solver (white cross method) |
| **Branded Landing Page** | GSAP animations, React Three Fiber hero, responsive design |
| **Timer & History** | Move counting, best-time tracking, full move log |
| **2D Face Map** | Real-time unfolded cube visualization |
| **Keyboard Shortcuts** | Full notation mapped to keyboard (u/d/l/r/f/b/m/e/s) |

## Quick Start

```bash
cd dictators-website
npm install
npm run dev
```

Opens at `http://localhost:5173`. Navigate to `/simulator` for the cube.

## Run Frontend + API Together

```bash
npm install
npm run dev
```

Starts:
- Frontend dev server on `http://localhost:5173`
- API server on `http://localhost:4011`

## Project Structure

```
the-dictators/
├── api/                        ← Vercel serverless functions
│   └── v1/[...path].js        ← Catch-all API handler
├── dictators-website/          ← React + Vite + Tailwind (primary app)
│   ├── src/
│   │   ├── components/         ← Landing page components
│   │   ├── pages/
│   │   │   ├── SimulatorPage.jsx    ← Interactive 3D simulator
│   │   │   └── simulatorAnimation.js ← Move animation engine
│   │   ├── cube/
│   │   │   ├── CubeState.js    ← Face-keyed state model
│   │   │   └── moves.js        ← 18-move engine (U/D/L/R/F/B + M/E/S)
│   │   └── net/api.js          ← API client
│   └── package.json
├── frontend/                   ← Three.js prototype (Kyle's sticker-mesh renderer)
├── backend/
│   ├── api/                    ← Node.js API server
│   │   ├── openapi.yaml        ← OpenAPI 3.1 contract
│   │   └── src/                ← server.js, cube.js, validation.js
│   ├── src/cube/               ← C++ engine
│   │   ├── PuzzleCube.h/.cpp   ← N×N×N state model
│   │   ├── CubeOperations.cpp  ← Solver (7-step white cross)
│   │   └── CubeMoves.hpp       ← Move definitions
│   └── tests/                  ← 100-iteration stress test
├── docs/                       ← Architecture & contribution docs
├── scripts/                    ← Dev tooling (setup, dev runner)
├── vercel.json                 ← Vercel build config + API rewrites
└── package.json                ← Workspace root
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/health` | Service heartbeat |
| GET | `/v1/cube/state/solved` | Returns solved 3×3 state |
| POST | `/v1/cube/moves/apply` | Apply a move to a state |
| POST | `/v1/cube/scramble` | Generate scramble + resulting state |
| POST | `/v1/cube/solve` | Request solution sequence |

## Cube State Contract

Faces: `U`, `R`, `F`, `D`, `L`, `B` — each an array of 9 sticker tokens.

```
Index layout (row-major):
0 1 2
3 4 5
6 7 8
```

Sticker tokens: `W` (white), `R` (red), `G` (green), `Y` (yellow), `O` (orange), `B` (blue).

## Build

```bash
cd dictators-website
npm run build
```

## Backend (C++)

```bash
cd backend
g++ -std=c++17 src/main.cpp src/cube/PuzzleCube.cpp src/cube/CubeOperations.cpp -o rubiks_solver
./rubiks_solver
```

## Deployment

The project is configured for **Vercel**:
- `dictators-website/` builds as the static site
- `api/v1/` routes map to serverless functions
- `vercel.json` configures build output and API rewrites

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Three Fiber, Three.js |
| Animations | GSAP, ScrollTrigger, eased quaternion interpolation |
| API | Node.js, OpenAPI 3.1, Vercel Serverless Functions |
| Engine | C++17 |
| Version Control | Git, Bitbucket |
| Project Management | Jira |
| Documentation | Confluence |
