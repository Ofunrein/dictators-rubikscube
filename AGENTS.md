# AGENTS.md

## Cursor Cloud specific instructions

This is a 3D Rubik's Cube monorepo with three frontend apps and a C++ backend stub. See `README.md` for full run instructions.

### Services

| Service | Directory | Dev command | Default port |
|---|---|---|---|
| Rubik's Cube 3D renderer | `frontend/` | `npm run dev` | 5173 |
| Landing website + Simulator | `dicators-website/` | `npm run dev` | 5174 (use `--port 5174` to avoid conflict) |
| C++ backend (stub) | `backend/` | `g++ -std=c++17 src/main.cpp -o backend_skeleton && ./backend_skeleton` | N/A |

`the-dictators-landing/` is a duplicate of `dicators-website/` — skip unless explicitly needed.

### Non-obvious caveats

- The `frontend/` app has **no lint script**. Only `dicators-website/` and `the-dictators-landing/` have `npm run lint` (ESLint). Pre-existing lint errors exist in the codebase (4 errors, 2 warnings).
- The `frontend/` app uses **vanilla JS + three.js** (no React). The landing sites use **React 19 + react-three-fiber**.
- When running both `frontend/` and `dicators-website/` simultaneously, assign different ports (e.g. `--port 5173` and `--port 5174`) via `npm run dev -- --port XXXX`.
- The backend is a stub that prints "Backend skeleton ready" and exits. It has no HTTP server. The frontend's `src/net/api.js` returns a hardcoded stub response.
- To test the cube state API, run `window.setCubeState({...})` in the browser console on the `frontend/` app (see `README.md` for the expected state shape).
