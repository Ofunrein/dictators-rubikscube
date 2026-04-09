# Architecture — Sprint 2

## System Overview

```
┌────────────────────────────────────────────────────────┐
│                    VERCEL PLATFORM                       │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Static Site (dictators-website/dist/)            │    │
│  │                                                   │    │
│  │  Landing Page         Simulator Page              │    │
│  │  ├── Hero (GSAP/R3F)  ├── StickerCubelet (R3F)   │    │
│  │  ├── Features         ├── Move Controls (18)      │    │
│  │  ├── Team             ├── Timer & History         │    │
│  │  └── CTA              ├── Tutorial (5 steps)      │    │
│  │                       ├── Algorithm Quick-Ref      │    │
│  │                       ├── 2D Face Map             │    │
│  │                       └── Keyboard Shortcuts      │    │
│  └────────────────┬──────────────────────────────────┘    │
│                   │ fetch /api/v1/*                        │
│  ┌────────────────▼──────────────────────────────────┐    │
│  │  Serverless Functions (api/v1/[...path].js)       │    │
│  │                                                    │    │
│  │  GET  /v1/health           → service heartbeat     │    │
│  │  GET  /v1/cube/state/solved → solved 3×3 state     │    │
│  │  POST /v1/cube/moves/apply → apply single move     │    │
│  │  POST /v1/cube/scramble    → generate scramble      │    │
│  │  POST /v1/cube/solve       → request solution       │    │
│  │                                                    │    │
│  │  Imports: cube.js, validation.js, moves.js         │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────┘

                         │
                         ▼ (Sprint 3 — wire to live endpoint)
┌────────────────────────────────────────────────────────┐
│                  C++ BACKEND ENGINE                      │
│              backend/src/cube/                           │
│                                                          │
│  PuzzleCube.h/.cpp     — N×N×N state model               │
│  CubeOperations.cpp    — 7-step solver                   │
│    Step 1: Daisy                                         │
│    Step 2: White cross                                   │
│    Step 3: First layer corners                           │
│    Step 4: Second layer edges                            │
│    Step 5: Yellow cross                                  │
│    Step 6: Yellow face                                   │
│    Step 7: Final layer (corners + edges)                 │
│  CubeMoves.hpp         — U, D, L, R, F, B definitions   │
│                                                          │
│  tests/scrambleAndSolveTest.cpp — 100-iteration stress   │
└────────────────────────────────────────────────────────┘
```

## Data Flow

1. **User interacts** with the 3D cube (click button, press key, or drag)
2. **SimulatorPage** calls `applyMove(state, move)` from `moves.js`
3. **CubeState** updates → cube re-renders with new sticker colors
4. **API calls** (scramble, solve) go to `/api/v1/*` → serverless function → same `moves.js` logic
5. **Shared move logic** — frontend and API import the same `moves.js` module, guaranteeing state parity

## Key Design Decisions

- **Sticker-mesh rendering** — dark cubie bodies with separate plane geometry stickers (ported from `frontend/src/main.js`)
- **Contract-first API** — OpenAPI 3.1 spec defines the contract before implementation
- **Single-origin deployment** — Vercel serves both static site and API functions, eliminating CORS
- **18-move engine** — M, E, S slice turns added alongside the 12 standard face turns
- **Shared logic, zero duplication** — serverless functions import backend modules directly
