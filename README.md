# The Dictators — 3D Rubik's Cube Platfor

![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)

An interactive, browser-based 3D Rubik's Cube platform with real-time manipulation, guided tutorials, and a full-stack API.

## [Live Demo](https://dictators-rubikscube.vercel.app](https://dictators-rubikscube.vercel.app/simulator)

![Demo](docs/demo.gif)

## Features

| Feature | Description |
|---------|-------------|
| **3D Simulator** | Sticker-mesh Rubik's Cube with smooth move animations |
| **Size-Aware Engine** | Supports 2x2, 3x3, and 4x4 cubes |
| **Full Move Notation** | Face turns (U/D/L/R/F/B), slices (M/E/S), inner slices (r/l/u/d/f/b for 4x4) |
| **Tutorial System** | Step-by-step learning: cross, F2L, OLL, PLL |
| **Step-by-Step Guide** | Interactive solving guide with GIF animations, algorithm buttons, and live 3D cube |
| **Leaderboard** | 6 boards (2x2/3x3 × fastest/avg/solves) with result count dropdown — live Supabase data |
| **Profile** | Per-size stats with rank display — live Supabase data |
| **Learn** | Guided learning modules with visual beginner guide and notation reference |
| **Authentication** | Sign up, log in, log out via Supabase Auth |
| **Database** | Supabase Postgres — users, solve stats, leaderboard rankings |
| **Algorithm Reference** | Quick-apply sequences (Sexy Move, Sune, U-Perm, etc.) |
| **REST API** | 5 endpoints: health, solved state, apply move, scramble, solve |
| **C++ WASM Solver** | Eric's CFOP solver compiled to WebAssembly — handles 3x3 |
| **Python NxN Solver** | Vendored solver for 2x2 and 4x4 cubes |
| **Branded Landing Page** | GSAP animations, React Three Fiber hero, responsive design |
| **Timer & History** | Move counting, solve timing, full move log |
| **2D Face Map** | Real-time unfolded cube visualization |
| **Keyboard Shortcuts** | Full notation mapped to keyboard (u/d/l/r/f/b/m/e/s) |

## Engineering Highlights

- **Shared cube engine:** the browser and API use the same cube model and move logic, keeping sticker state, scrambles, and notation behavior aligned across client and server.
- **Hybrid solver stack:** 3x3 solving routes through a C++17 solver compiled to WebAssembly, while 2x2 and 4x4 support uses a vendored Python NxN solver.
- **Verified solve pipeline:** returned solver moves are replayed against the cube engine before responses are sent, reducing notation and state-format mismatch risk.
- **Single active API contract:** local development and Vercel production both delegate cube and coach behavior to the same route table, with OpenAPI documenting the HTTP surface.
- **Interactive 3D UI:** React Three Fiber, queued move animation, keyboard controls, and a live 2D face map keep visual and logical cube state in sync.
- **Product persistence:** Supabase Auth and Postgres-backed stats power account, leaderboard, and profile workflows.
- **Automated checks:** GitHub Actions runs frontend lint/tests/build, Playwright smoke tests, and backend type-check/tests.

## Screenshots

| Page | Preview |
|------|---------|
| Landing | ![Landing](docs/screenshots/landing.png) |
| Simulator | ![Simulator](docs/screenshots/simulator.png) |
| Step-by-Step Guide | ![Guide](docs/screenshots/step-guide-solving.png) |
| Leaderboard | ![Leaderboard](docs/screenshots/leaderboard.png) |
| Learn | ![Learn](docs/screenshots/learn-page.png) |
| Profile | ![Profile](docs/screenshots/profile.png) |

## Quick Start

```bash
npm install
npm run dev
```

Before running, make sure `frontend/.env` exists with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

See `frontend/.env.example` for the required variables. Get the values from the team's Supabase project.

## Deployment

The app is deployed on Vercel. Frontend is a static Vite build; backend runs as Vercel Serverless Functions.

| Environment | URL |
|---|---|
| Production | [dictators-rubikscube.vercel.app](https://dictators-rubikscube.vercel.app) |
| API (production) | `https://dictators-rubikscube.vercel.app/api/v1` |

**Deploy your own fork:**
1. Import the repo into Vercel
2. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` as frontend env vars
3. Set `DATABASE_URL`, `AI_PROVIDER_API_KEY`, `JWT_ACCESS_SECRET` as backend env vars
4. Deploy — Vercel auto-detects `vercel.json` build config

## Start Here

If you are reviewing the product and architecture, read in this order:

1. This root `README.md`
2. [docs/architecture.md](docs/architecture.md)
3. [docs/README.md](docs/README.md)
4. [backend/api/openapi.yaml](backend/api/openapi.yaml)

If you are maintaining the repo, use the contributor and archive links in
[docs/README.md](docs/README.md).

Important:
- this root README is the canonical onboarding document
- `frontend/README.md` only adds local frontend context
- `frontend-legacy/` is a legacy prototype and not the current app
- the shipped API path is `backend/api/src/routes.js`, used by both local dev and the Vercel adapter
- the Fastify/Prisma files under `backend/api/src/app.ts` and `backend/api/prisma/` are an experimental Postgres persistence path, not the default runtime

## Run Frontend + API Together

```bash
npm install
npm run dev
```

Starts:
- Frontend dev server on `http://localhost:5400`
- API server on `http://localhost:5200`

Important:
- `frontend/` is the active frontend used by `npm run dev`
- `frontend-legacy/` is an older prototype and is not the live app
- In local dev, the frontend still calls `/api/v1/*`
- Vite proxies `/api/v1/*` from `5400` to the local API on `5200`
- Direct local API routes are also available at `http://localhost:5200/v1/*`

Why the API is on `5200`:
- Vite already uses `5400` for the frontend
- keeping the API on `5200` avoids a port collision
- this mirrors a clean split: browser app on one port, API on another, with the frontend proxy hiding that split during development

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Landing page | Hero, features, team |
| `/simulator` | `SimulatorPage.jsx` | Interactive 3D cube |
| `/step-by-step` | `StepByStepPage.jsx` | Guided solving with GIFs and live cube |
| `/learn` | `LearnPage.jsx` | Learning modules |
| `/leaderboard` | `LeaderboardPage.jsx` | 6 leaderboards (2x2/3x3 × fastest/avg/solves) |
| `/profile` | `ProfilePage.jsx` | Per-size stats with rank display |

## Project Structure

```
the-dictators/
├── api/                              Vercel serverless (production)
│   ├── solver.js                     Compiled C++ WASM binary
│   └── v1/[...path].js              Thin adapter — delegates to routes.js
│
├── frontend/                         React + Vite + Tailwind (the live app)
│   └── src/
│       ├── components/               Landing page sections (Hero, Features, Team, etc.)
│       ├── cube/                     Shared cube model — used by BOTH frontend and backend
│       │   ├── cubeModel.ts          State format, face order, validation
│       │   ├── moves.ts              Size-aware move engine (all rotations)
│       │   └── CubeState.ts          State wrapper class
│       ├── lib/                      Supabase integration
│       │   ├── supabase.ts           Supabase client init
│       │   ├── auth.ts               Sign up, log in, log out, session
│       │   └── stats.ts              Leaderboard and profile data queries
│       ├── net/api.ts                Frontend API client (fetch calls to backend)
│       ├── pages/simulator/          The simulator page
│       │   ├── SimulatorPage.tsx     Main page — wires everything together
│       │   ├── InteractiveCube.tsx   3D cube (Three.js / React Three Fiber)
│       │   ├── SimulatorControls.tsx Left panel: buttons, move history
│       │   ├── TutorialPanel.tsx     Right panel: learning guide
│       │   ├── useTimer.ts           Timer hook
│       │   ├── useCubeControls.ts    Keyboard + mouse input
│       │   ├── useSimulatorQueue.ts  Move queue + animation lifecycle
│       │   ├── useSimulatorActions.ts Scramble, solve, reset actions
│       │   ├── simulatorAnimation.ts GSAP animation config
│       │   └── simulatorConstants.ts Key mappings, move groups
│       ├── pages/step-by-step/           Step-by-step solving guide
│       │   ├── GuidePanel.tsx            Left panel: text, GIFs, algorithm buttons
│       │   └── stepsData.ts              25-slide guide data with algorithms
│       ├── pages/StepByStepPage.tsx      Guide + live cube side-by-side
│       ├── pages/LeaderboardPage.tsx     6 leaderboards (2x2/3x3 × 3 stats)
│       ├── pages/ProfilePage.tsx         Per-size stats with rank display
│       ├── pages/LearnPage.tsx           6-slide learn page orchestrator
│       │   └── learn/                    Slide components + CSS
│       │       ├── SlideHero.tsx
│       │       ├── SlideOverview.tsx
│       │       ├── SlideNotation.tsx
│       │       ├── SlideStepByStep.tsx
│       │       ├── SlideAlgorithms.tsx
│       │       ├── SlideResources.tsx
│       │       ├── useLearnSlides.ts
│       │       ├── learnConstants.ts
│       │       └── LearnPage.css
│       └── utils/                    Shared utilities
│
├── backend/
│   ├── api/src/                      Node.js API server
│   │   ├── README.md                 Detailed backend guide (start here!)
│   │   ├── routes.js                 All endpoint handlers (single source of truth)
│   │   ├── server.js                 Local dev HTTP server (port 5200)
│   │   ├── cube.js                   Bridge — imports shared cube model from frontend
│   │   ├── validation.js             Request validation
│   │   ├── mockServer.js             Fake API for frontend testing
│   │   ├── solverHybrid.test.js      Integration tests
│   │   └── solvers/                  All solver implementations
│   │       ├── wasmSolver.js         C++ WASM bridge (3x3)
│   │       ├── pythonNxNSolver.js    Python bridge (2x2, 4x4)
│   │       ├── pythonNotation.js     Notation translation
│   │       ├── nxn_solver_bridge.py  Python subprocess
│   │       └── solvePipeline.js      Replay validation
│   ├── src/cube/                     C++ solver source (Eric)
│   │   ├── PuzzleCube.h/.cpp        Cube state + rotation logic
│   │   ├── CubeOperations.cpp       CFOP solving algorithm (872 lines)
│   │   └── solver_bridge.cpp        Emscripten/WASM bridge
│   └── vendor/                       Vendored Python NxN solver
│
├── frontend-legacy/                  Legacy prototype — NOT used, kept for reference
├── docs/                             Architecture, API contracts, and documentation index
├── scripts/                          Dev tooling (setup, dev runner)
├── vercel.json                       Vercel build config + API rewrites
└── package.json                      Workspace root
```

## How Everything Connects (The Big Picture)

```
                         ┌─────────────────────────────────┐
                         │          YOUR BROWSER            │
                         │   http://localhost:5400           │
                         └──────────────┬──────────────────┘
                                        │
         ┌──────────────┬───────────────┼───────────────┬──────────────────┐
         │              │               │               │                  │
  Landing Page   Simulator Page  Step-by-Step     LearnPage        LeaderboardPage /
(components/   (simulator/*.tsx)  Guide Page    (LearnPage.tsx)      ProfilePage
   *.jsx)              │        (StepByStepPage                           │
                       │             .tsx)                                │
            ┌──────────┴──────────┐    │                                  │
            │                     │    │                                  │
      3D Cube Rendering    Move Buttons/│                                  │
      (InteractiveCube)    Keyboard Input                                 │
            │              (useCubeControls)                              │
            └──────────┬──────────┘    │                                  │
                       │               │                                  │
                cube/moves.js ◄────────┘                                  │
             (shared move engine)                                          │
                       │                                                   │
                net/api.js                                                 │
            (calls the backend)                                            │
                       │                                                   │
         ┌─────────────┴──────────────────────────────────────────────────┘
         │                                              │
  ┌──────┴──────┐                          ┌────────────┴────────────┐
  │   API        │                          │       Supabase         │
  │  routes.js  │                          │   (Auth + Postgres)    │
  └──────┬──────┘                          └────────────┬────────────┘
         │                                              │
  ┌──────┴──────────┐                    ┌──────────────┴──────────────┐
  │                 │                    │                             │
3x3 Solve      2x2/4x4              lib/auth.js                  lib/stats.js
(C++ WASM)  Scramble/(Python)     (sign up/login)         (leaderboard/profile)
  │                 │
  └────────┬────────┘
           │
    solvePipeline
  (replay validation)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/health` | Service heartbeat |
| GET | `/v1/cube/state/solved?size=3` | Returns solved state (2, 3, or 4) |
| POST | `/v1/cube/moves/apply` | Apply a move to a state |
| POST | `/v1/cube/scramble` | Generate scramble + resulting state |
| POST | `/v1/cube/solve` | Solve a cube (3x3 via WASM, 2x2/4x4 via Python) |

Both the local dev server (port 5200) and the Vercel production handler use the same route table in `routes.js` — one source of truth.

> Full OpenAPI 3.0 spec: [`backend/api/openapi.yaml`](./backend/api/openapi.yaml)

## Backend Runtime Source of Truth

The active runtime is intentionally small:

- Local development starts `backend/api/src/server.js`.
- Production requests enter through `api/v1/[...path].js`.
- Both adapters delegate endpoint behavior to `backend/api/src/routes.js`.

That route table is the source of truth for cube operations, scramble generation, solve routing, and AI coach endpoints. A separate Fastify/Prisma implementation also exists in `backend/api/src/app.ts`, `backend/api/src/index.ts`, and `backend/api/prisma/`; treat it as an experimental Postgres auth/session/persistence backend until it is explicitly wired into the default scripts or deployment path.

## Cube State Contract

Faces: `U`, `R`, `F`, `D`, `L`, `B` — each an array of `size * size` sticker tokens.

```
3x3 index layout (row-major):
0 1 2
3 4 5
6 7 8

2x2: 4 stickers per face    (24 total)
3x3: 9 stickers per face    (54 total)
4x4: 16 stickers per face   (96 total)
```

Sticker tokens: `W` (white/up), `R` (red/right), `G` (green/front), `Y` (yellow/down), `O` (orange/left), `B` (blue/back).

## Build

```bash
cd frontend
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
- `frontend/` builds as the static site
- `api/v1/` routes map to serverless functions
- `vercel.json` configures build output and API rewrites

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.x (strict mode — all frontend and backend source) |
| Frontend | React 19, Vite 8, Tailwind CSS, React Three Fiber, Three.js |
| Animations | GSAP, ScrollTrigger, eased quaternion interpolation |
| API | Node.js route table, OpenAPI 3.1, Vercel Serverless Functions |
| 3x3 Solver | C++17 compiled to WebAssembly via Emscripten |
| NxN Solver | Python 3 (vendored rubiks-cube-NxNxN-solver) |
| Database | Supabase (Postgres + Auth) |
| Testing/CI | Vitest, Playwright smoke tests, GitHub Actions |
