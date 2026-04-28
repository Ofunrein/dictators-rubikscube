# Backend API (`backend/api/src/`)

This is the server-side code that powers the Rubik's Cube API. It handles
scramble generation, cube solving, move application, and request validation.

## File Layout

```
backend/api/src/
├── cube.js              Shared cube model (imports from the frontend so
│                        there's only ONE move engine for the whole project)
├── routes.js            All API endpoint handlers. This is the single source
│                        of truth — both the local dev server and the Vercel
│                        production handler use this same route table.
├── server.js            Local development HTTP server (port 5200)
├── validation.js        Request validation for all POST endpoints
├── mockServer.js        Fake API server for frontend testing without solvers
├── solverHybrid.test.js Integration tests for the solver pipeline
│
└── solvers/             All solver-related code lives here
    ├── wasmSolver.js        C++ WASM bridge — handles 3x3 solve/scramble
    ├── pythonNxNSolver.js   Python bridge — handles 2x2 and 4x4
    ├── pythonNotation.js    Translates between our notation and the Python
    │                        solver's notation (different sticker/move formats)
    ├── nxn_solver_bridge.py Python script spawned by pythonNxNSolver.js
    └── solvePipeline.js     Replay validation — re-applies solver moves to
                             verify the cube is actually solved before responding
```

## How a request flows

1. Request hits `api/v1/[...path].js` (Vercel) or `server.js` (local dev)
2. Both look up the route in `routes.js` and call the matching handler
3. Handler validates the request using `validation.js`
4. Handler calls the appropriate solver in `solvers/`
5. Response goes back to the frontend

## Solver routing

| Cube Size | Solver | File |
|-----------|--------|------|
| 3x3 | Eric's C++ algorithm compiled to WebAssembly | `solvers/wasmSolver.js` |
| 2x2, 4x4 | Vendored Python solver (`backend/vendor/`) | `solvers/pythonNxNSolver.js` |
| Any size | JS fallback (uses the frontend move engine) | `cube.js` |

## Running locally

```bash
# From the repo root:
npm run dev          # starts both frontend (5400) and API (5200)
npm run dev:api      # API server only

# Tests:
cd backend/api && npm test
```

## Where the C++ solver lives

The actual C++ source code is in `backend/src/cube/` (separate from this
directory). It gets compiled to WebAssembly and the compiled binary lives at
`api/solver.js` in the repo root. `solvers/wasmSolver.js` loads that binary.
