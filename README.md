# 3D Rubik's Cube - Sprint 1 Skeleton

This repository contains a Sprint-1-friendly scaffold for a 3D online Rubik's cube game with:
- `dicators-website/`: current React + three.js website and simulator
- `frontend/`: legacy Vite + three.js prototype renderer
- `backend/`: C++ backend placeholders
- `docs/`: architecture notes

## Run frontend + API together (recommended)

```bash
cd dicators-website
npm install
cd ..
npm run dev
```

This starts:
- frontend dev server on `http://localhost:5173`
- API server on `http://localhost:4011`

If needed, point the frontend at a different backend URL:

```bash
VITE_API_BASE_URL=http://localhost:5001 npm --prefix dicators-website run dev
```

## Frontend-only run instructions

```bash
cd dicators-website
npm install
npm run dev
```

Then open the local Vite URL shown in terminal (typically `http://localhost:5173`).

## Cube State API (frontend)

The frontend exposes:

```js
window.setCubeState(state)
```

Expected `state` shape:
- Faces: `U`, `R`, `F`, `D`, `L`, `B`
- Each face is an array of length `9`
- Face order contract: `U R F D L B`

Index layout for every face (row-major):

```text
0 1 2
3 4 5
6 7 8
```

Example:

```js
window.setCubeState({
  U: Array(9).fill('white'),
  R: Array(9).fill('red'),
  F: ['green', 'green', 'green', 'green', 'black', 'green', 'green', 'green', 'green'],
  D: Array(9).fill('yellow'),
  L: Array(9).fill('orange'),
  B: Array(9).fill('blue')
});
```

Visual sanity expectation:
- The front-center sticker (`F[4]`) should visibly change (black in the example above).

Local QA screenshot step (optional):
- Run the frontend locally, apply the example in browser devtools, and capture `docs/cube-render.png` showing the updated front-center sticker.

Build check:

```bash
npm --prefix dicators-website run build
```

## Backend run instructions

```bash
cd backend
g++ -std=c++17 src/main.cpp -o backend_skeleton
./backend_skeleton
```

Expected output:

```text
Backend skeleton ready
```
CMake does not automatically detect new source files.

(Whenever you add a new .cpp file to the project, you must explicitly list it in CMakeLists.txt. If you forget to do this, the file will not be compiled or linked into the executable.)

## API scaffold (Sprint 2)

A contract-first API scaffold now lives at `backend/api` with:

- OpenAPI contract: `backend/api/openapi.yaml`
- Spec-driven mock server: `npm run mock` (port `4010`)
- Validation + route skeleton server: `npm run serve` (port `4011`)

Run it with:

```bash
cd backend/api
npm run mock
# or
npm run serve
```

Or run frontend + API together from repo root:

```bash
npm run dev
```
