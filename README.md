# 3D Rubik's Cube - Sprint 1 Skeleton

This repository contains a Sprint-1-friendly scaffold for a 3D online Rubik's cube game with:
- `frontend/`: Vite + three.js Rubik's cube renderer
- `backend/`: C++ backend placeholders
- `docs/`: architecture notes

## Frontend run instructions

```bash
cd frontend
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

> Full frontend build was not run in this environment due to blocked npm registry access. Code is expected to work when dependencies are installed locally.

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
