# 3D Rubik's Cube - Sprint 1 Skeleton

This repository contains a Sprint-1-friendly scaffold for a 3D online Rubik's cube game with:
- `frontend/`: Vite + three.js rotating cubie demo
- `backend/`: C++ backend placeholders
- `docs/`: architecture notes

## Frontend run instructions

```bash
cd frontend
npm install
npm run dev
```

Then open the local Vite URL shown in terminal (typically `http://localhost:5173`).

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
