# Sprint 3 — Martin Ofunrein — Delivered Changes

**Branch:** `sprint-3-martin`  
**Scope updated:** April 21, 2026

**Repo naming clarification:** the active web app now lives in `frontend/`. The older prototype was renamed to `frontend-legacy/`. Historical sprint notes may still mention earlier folder names when they are describing work as it existed at that time.

## Plain-English summary

This sprint connected the website's Rubik's Cube simulator to Eric's real C++ solving code instead of relying only on frontend-only behavior.

In simple terms:
- the user turns or scrambles the cube in the website
- the website sends the current cube state to the backend
- the backend passes that state into Eric's C++ solver through a WASM bridge
- the solver returns either a move list or a solved state
- the frontend animates the returned solve moves when that replay is valid

Two other important UX changes also shipped:
- the cube flashing / color popping bug during turns was fixed
- the simulator action row was simplified back down to the core `Scramble`, `Solve`, and `Reset` buttons after teammate feedback

## April 17 hybrid solver update

The solver path is now size-aware instead of being "3x3 only plus frontend fallbacks."

Current design:
- 3x3 solving still uses Eric's compiled C++ / WASM solver
- 2x2 and 4x4 solving now use the vendored Python NxN solver
- the compiled C++ lane now also creates solved states, applies move lists, and generates scrambles for 2x2, 3x3, and 4x4
- every returned solve move list is replay-validated through the compiled move engine before the API returns it
- reverse-history solving is no longer a normal UI path

Public move notation now used across frontend, backend, validation, and replay:
- `U D L R F B` for outer turns
- `M E S` for odd-cube middle slices
- `r l u d f b` for 4x4 inner slices
- `x y z` for whole-cube rotations

## What was causing the cube flashing?

The flashing was not because Three.js itself was broken.

The real problem was the connection between:
- the visual 3D cubies on screen
- the logical cube state in code

Before the fix:
- a turn animation would visually rotate a layer
- but after that turn, the renderer snapped cubies back onto a static layout
- this made stickers appear to pop or flash because the model and the logical state were briefly out of sync

After the fix:
- the app keeps track of the cubies' updated positions after every move
- the cubies are reattached in their new rotated layout instead of being reset to an old one
- that keeps the 3D model and the cube state aligned

Short version:
- not a "Three.js is bad" issue
- it was a state-sync / animation-layout issue in how we were using Three.js

## How the whole system fits together

### Human explanation

Think of the app as four layers:

1. Frontend UI
- buttons, 3D cube, move history, timer
- this is what the user sees and clicks

2. Frontend networking layer
- takes the cube state and sends it to the backend API

3. Backend API + WASM adapter
- receives the cube state
- converts it into the exact format Eric's solver expects
- calls the compiled solver bundle

4. Eric's C++ solver
- does the actual solving work
- returns moves or a solved cube state

### System flow diagram

```mermaid
flowchart LR
    A[User clicks Scramble / Solve / Reset] --> B[SimulatorPage.jsx]
    B --> C[frontend/src/net/api.js]
    C --> D[backend/api/src/server.js]
    D --> E[backend/api/src/wasmSolver.js]
    E --> F[api/solver.js<br/>compiled Emscripten bundle]
    F --> G[backend/src/cube/solver_bridge.cpp]
    G --> H[CubeOperations.cpp / PuzzleCube.cpp<br/>Eric's C++ solver]
    H --> G
    G --> F
    F --> E
    E --> D
    D --> C
    C --> B
    B --> I[InteractiveCube.jsx animates result]
```

### Solve request sequence diagram

```mermaid
sequenceDiagram
    participant U as User
    participant S as SimulatorPage.jsx
    participant N as api.js
    participant A as server.js
    participant W as wasmSolver.js
    participant B as solver_bridge.cpp
    participant C as Eric C++ solver

    U->>S: Press Solve
    S->>N: solveCubeRemote(state)
    N->>A: POST /api/v1/cube/solve
    A->>W: solveCubeMoveListWithWasm(state)
    W->>B: ccall("solveCubeMoves", flatState)
    B->>C: solve3x3WithMoves(cube)
    C-->>B: move list
    B-->>W: space-separated move string
    W-->>A: JS move array
    A-->>N: JSON { moves, state, solver }
    N-->>S: parsed payload
    S->>S: queue moves for animation
    S-->>U: cube shows solve step-by-step
```

### High-level component map

```mermaid
classDiagram
    class SimulatorPage {
      owns queue state
      handles Solve / Scramble / Reset
      calls backend
    }

    class InteractiveCube {
      renders 3D cube
      animates turns
      keeps cubie layout synced
    }

    class SimulatorControls {
      action buttons
      move buttons
      history controls
    }

    class server {
      validates requests
      chooses solve path
      returns moves/state
    }

    class wasmSolver {
      flattens cube state
      calls WASM exports
      normalizes results
    }

    class solver_bridge {
      converts JS input to C++
      exports solveCube/solveCubeMoves
    }

    class EricSolver {
      CubeOperations.cpp
      PuzzleCube.cpp
      real solving logic
    }

    SimulatorPage --> InteractiveCube
    SimulatorPage --> SimulatorControls
    SimulatorPage --> server
    server --> wasmSolver
    wasmSolver --> solver_bridge
    solver_bridge --> EricSolver
```

## What shipped

### 1. Live simulator now uses Eric's C++ solver through the API

Delivered pieces:
- `backend/src/cube/solver_bridge.cpp`
  - WASM bridge for Eric's C++ solver
  - now exports the original 3x3 solve functions plus size-aware solved/apply/scramble helpers
- `api/solver.js`
  - rebuilt Emscripten single-file WASM bundle
- `backend/api/src/wasmSolver.js`
  - shared Node-side loader for the WASM solver
  - flattens frontend cube state to the C++ input format
  - normalizes the solved output back to canonical frontend orientation
- `backend/api/src/server.js`
  - `/v1/cube/solve` now uses the hybrid path: Eric WASM for 3x3, vendored NxN for 2x2/4x4
  - `/v1/cube/scramble` now comes from the compiled C++ lane for every supported size
  - returned solve moves are replay-validated before they are sent back to the frontend
- `api/v1/[...path].js`
  - production/Vercel API route mirrors the same hybrid + replay-validation behavior
- `frontend/src/net/api.js`
  - solve response now accepts solver move lists and solved cube state from the backend
  - scramble endpoint helper is available for frontend/backend integrations
- `frontend/src/pages/simulator/SimulatorPage.jsx`
  - solve button now calls the API
  - solve now animates backend-returned move lists only
  - only snaps to solved state if move-list replay ever fails validation and the backend falls back to solved-state output
  - scramble now comes from the backend so the UI animates the exact compiled scramble list on screen

### 2. Color pop / flashing fix for the 3D cube

The live simulator was snapping cubies back onto a static layout after each turn, which caused sticker/color popping during turns, especially slice moves.

Delivered fix:
- `frontend/src/pages/simulator/simulatorAnimation.js`
  - added slice move animation support for `M`, `E`, `S`
  - added `rotateCubiePosition(...)`
- `frontend/src/pages/simulator/InteractiveCube.jsx`
  - `InteractiveCube` now tracks mutable cubie layout state
  - animated cubies are reattached and kept in their rotated positions after each move
- `frontend/src/pages/simulator/SimulatorPage.jsx`
  - solved-state resets rebuild layout cleanly

### 3. Solve playback was slowed slightly for readability

The solve animation was intentionally made a little slower so users can follow what the solver is doing.

Delivered change:
- `frontend/src/pages/simulator/simulatorAnimation.js`
  - manual turn duration stays fast at `0.24s`
  - automated solve playback now runs at `0.46s` per move
- `frontend/src/pages/simulator/SimulatorPage.jsx`
  - move queue can now carry a per-sequence animation speed
- `frontend/src/pages/simulator/InteractiveCube.jsx`
  - animation loop now accepts the requested move duration

Result:
- normal cube interaction still feels responsive
- solver playback is easier to watch step-by-step

### 4. Timer / interaction polish that remains active

The simulator still includes the earlier timer improvements:
- timer only auto-starts after `Scramble` and the user's first manual move
- the manual timer button was moved into the left control panel under `Scramble / Solve / Reset`
- the visible best-time box was removed from the sidebar after teammate feedback
- the underlying timer hook still keeps a legacy best-time value in `localStorage` for future account/profile work

### 5. Control panel was simplified after teammate feedback

The simulator action panel now keeps only the primary actions:
- `Scramble`
- `Solve`
- `Reset`

Delivered change:
- `frontend/src/pages/simulator/SimulatorControls.jsx`
  - action area uses a single 3-button row
  - timer display/button now lives directly below that row
  - button spacing/text sizing was tightened so labels do not clip on narrow windows
- manual undo is still available by applying inverse moves such as `R'`, `U'`, `F'`, etc. from the move controls or keyboard
- `frontend/src/pages/simulator/SimulatorPage.jsx`
  - removed the explicit `Undo` and `Undo All` buttons after teammate review
  - `Solve` remains the dedicated "compute a real solve" path
  - timer auto-start cheating was blocked by requiring a scramble before the first automatic timer start
- `frontend/src/pages/simulator/SimulatorFaceMap.jsx`
  - `U` and `D` face previews were flipped to match the current 3D viewing angle more intuitively

Behavior decision:
- `Solve` means "run Eric's solver from this state" for standard face-turn states
- inverse moves are the intended manual way to step moves back when the user wants to undo something directly
- slice states still use inverse-history behavior under solve fallback because the backend solver can still wedge on `M`, `E`, `S`

### 6. Simulator page refactor for readability and teammate handoff

The simulator feature was split into a dedicated feature folder so the main page is no longer carrying all rendering, timer, controls, tutorial, and animation code in one file.

Delivered refactor:
- `frontend/src/pages/simulator/SimulatorPage.jsx`
  - now acts as the feature coordinator only
  - owns page layout, move queue state, solve/reset/scramble handlers, timer wiring, and canvas fallback wiring
- `frontend/src/pages/simulator/InteractiveCube.jsx`
  - contains the 3D cube renderer and move animation flow
  - was cleaned up further with small local helpers for layout sync and layer animation
- `frontend/src/pages/simulator/SimulatorControls.jsx`
  - left panel controls and move buttons
- `frontend/src/pages/simulator/TutorialPanel.jsx`
  - right panel algorithm help / tutorial actions
- `frontend/src/pages/simulator/SimulatorFaceMap.jsx`
  - flat face-state readout
- `frontend/src/pages/simulator/CanvasFallbackPanel.jsx`
  - renderer failure fallback panel
- `frontend/src/pages/simulator/useTimer.js`
  - timer and best-time persistence
- `frontend/src/pages/simulator/useCubeControls.js`
  - keyboard + sticker-selection controls
- `frontend/src/pages/simulator/simulatorConstants.js`
  - feature constants and helpers
- `frontend/src/pages/simulator/simulatorAnimation.js`
  - animation helpers and cubie rotation math
- `frontend/src/pages/simulator/simulatorAnimation.test.js`
  - coverage for animation helpers
- `backend/api/src/wasmSolver.js` and `backend/api/src/server.js`
  - now carry short inline comments around the WASM bridge and solve fallback flow so new teammates can follow the backend path without digging into generated glue code

Folder decision:
- all simulator-only code now lives under `frontend/src/pages/simulator/`
- this keeps simulator logic together and makes ownership clearer for teammates
- `SimulatorPage.jsx` still exists because the route needs a page-level coordinator, but it is no longer the only simulator file

## Important solver note

Eric's C++ backend solver is now the real engine behind the live solve endpoint for both solved-state output and move-list output.

Current state:
- `solveCube` is verified and working through WASM
- `solveCubeMoves` is now also wired into the live API path for standard face-turn states
- the compiled lane now also exports size-aware solved/apply/scramble helpers used by 2x2, 3x3, and 4x4 routes
- the move-list path includes whole-cube rotations such as `x` and `y`, so the simulator now supports animating those rotations too
- 4x4 public inner-slice notation is now lowercase `r l u d f b`

Because of that, the frontend currently:
- sends size-aware cube states to the API
- receives replay-validated move lists back from the backend when solving succeeds
- animates that returned move list live in the simulator
- keeps the solved-state backend path only as a guarded fallback if move-list replay ever comes back invalid
- uses the backend scramble API route for the visible simulator scramble button too

This means the simulator now uses one shared canonical move surface across manual turns, backend solve replay, and backend scrambles instead of mixing local history tricks into the normal solve path.

The solve button remains dedicated to actual solving rather than manual history-stepping.

## When the app uses Eric's solver vs the NxN solver

The current rule is:

- 3x3:
  - use Eric's compiled C++ solver
- 2x2 and 4x4:
  - use the vendored NxN solver, then replay-check the normalized move list through the compiled engine

That separation is important because:
- the compiled engine is our source of truth for move application and replay
- the vendored NxN solver is only trusted after its output survives canonical replay

## Architecture decisions to keep

### 1. Keep both `backend/api/` and repo-root `api/`

We intentionally need both folders.

- `backend/api/`
  - local Node API for development
  - easy to run directly with `npm --prefix backend/api run serve`
  - used behind the Vite dev proxy
- `api/v1/`
  - Vercel production/serverless entrypoint
  - required because Vercel expects API routes at the repo root `api/` convention

Decision:
- do not delete either one
- they serve different runtimes
- local dev and deployed production would be harder to reason about if they were merged incorrectly

### 2. Keep the C++ solver behind the WASM adapter

Current live solve flow:
- C++ source lives in `backend/src/cube/`
- `backend/src/cube/solver_bridge.cpp` exports `solveCube`, `solveCubeMoves`, and `scrambleCube`
- `api/solver.js` is the generated Emscripten bundle used by Node/serverless code
- `backend/api/src/wasmSolver.js` is the shared JS adapter used by both local and production API routes

Decision:
- keep the C++ solver as the solving engine
- keep the JS/WASM adapter as the only integration point for API code
- do not call the C++ layer directly from frontend code

### 3. Keep move-list solving live for standard states, keep solved-state output as fallback

Decision:
- `solveCubeMoves` is the preferred live path for standard face-turn states
- returned move lists are replay-validated through the compiled move engine before the API returns them to the frontend
- `solveCube` remains available as the guarded fallback if replay validation fails
- the NxN path follows the same replay-validation rule after move normalization
- the simulator UI now uses the backend scramble sequence directly instead of generating a separate local scramble

### 4. Keep `SimulatorPage.jsx` as the coordinator

`SimulatorPage.jsx` is still around because it is the route-level entrypoint and has to assemble:
- layout
- timer wiring
- solve/reset/scramble handlers
- move queue state
- canvas failure handling
- child simulator panels

Decision:
- do not split it just for line count alone
- only extract more if a future chunk becomes independently reusable or test-worthy
- prefer simple local coordination over over-abstracted hooks

## Current simulator file layout

```text
frontend/src/pages/simulator/
├── CanvasFallbackPanel.jsx
├── InteractiveCube.jsx
├── SimulatorControls.jsx
├── SimulatorFaceMap.jsx
├── SimulatorPage.jsx
├── TutorialPanel.jsx
├── simulatorAnimation.js
├── simulatorAnimation.test.js
├── simulatorConstants.js
├── useCubeControls.js
└── useTimer.js
```

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
- Verified JS and C++ state mapping matched for:
  - face turns
  - `M`, `E`, `S` slice turns
- Verified JS and vendored NxN state mapping matched for:
  - 2x2 outer turns
  - 4x4 outer turns
  - 4x4 lowercase inner slices
- Verified 2x2, 3x3, and 4x4 solve move lists replay to solved through the compiled move engine

### API verification
- Fresh root dev session started with:
  - API on `http://localhost:5200`
  - frontend on `http://localhost:5400`
- Posted an empty request to:
  - `POST /v1/cube/scramble`
- Confirmed `200 OK`
- Confirmed response included:
  - scrambled cube state
  - `scrambler: "eric-cpp-wasm"`
- Posted a real scrambled cube state to:
  - `POST /v1/cube/solve`
- Confirmed `200 OK`
- Confirmed response included:
  - replay-valid solve move list
  - canonical solved cube state after applying that move list
  - `solver: "eric-cpp-wasm-moves"`

### Preview deployment
- Deployed this branch as a **Vercel preview deployment** on the existing linked project
  - project: `dictators-rubikscube`
  - branch: `sprint-3-martin`
- Preview URL:
  - `https://dictators-rubikscube-pyl0i4jge-ofunreins-projects.vercel.app`
- Inspect URL:
  - `https://vercel.com/ofunreins-projects/dictators-rubikscube/DSf9yvxedThQTgN6cYWRLPL9sXse`
- This was deployed as a normal branch preview, not as a separate new Vercel project

### Frontend verification
- `npm --prefix frontend run build` passed
- `npm --prefix frontend run test -- --run src/pages/simulatorAnimation.test.js` passed
- Verified simulator and backend scramble generators now stay face-turn only
- Verified whole-cube rotations returned by Eric's solver are accepted by move normalization and animation helpers
- Verified the simplified `Scramble` / `Solve` / `Reset` action row builds cleanly and keeps the action panel layout consistent
- Verified slower solve playback build/test path after increasing solver animation tempo to `0.46s` per move

## Teammate feedback follow-up

After the first round of integration, Corey Hanna reviewed the simulator changes and reported a few frontend regressions.

Feedback items now addressed:
- made the `stopTimer()` auto-stop path explicit and record-safe in `useTimer.js`
- removed the unused `useCallback` import warning in `InteractiveCube.jsx`
- tightened the `camera.fov` update path in `InteractiveCube.jsx`
- fixed the camera-lock behavior during scramble, solve, manual turns, and sticker selection by stabilizing the camera profile inputs
- fixed the stale sticker-selection / preview state so reset and scramble clear it correctly
- reduced the renderer instability that was happening when camera motion overlapped with simulator state updates

Follow-up UX decision:
- `Undo` and `Undo All` were later removed after teammate feedback to keep the simulator UI focused on the primary actions

Result:
- the concrete page-level regressions Corey flagged from the new simulator integration were addressed without backing out the solve integration or the simplified control layout

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
- `frontend/src/net/api.js`
- `frontend/src/main.jsx`
- `frontend/src/pages/simulator/CanvasFallbackPanel.jsx`
- `frontend/src/pages/simulator/InteractiveCube.jsx`
- `frontend/src/pages/simulator/SimulatorControls.jsx`
- `frontend/src/pages/simulator/SimulatorFaceMap.jsx`
- `frontend/src/pages/simulator/SimulatorPage.jsx`
- `frontend/src/pages/simulator/TutorialPanel.jsx`
- `frontend/src/pages/simulator/simulatorAnimation.js`
- `frontend/src/pages/simulator/simulatorAnimation.test.js`
- `frontend/src/pages/simulator/simulatorConstants.js`
- `frontend/src/pages/simulator/useCubeControls.js`
- `frontend/src/pages/simulator/useTimer.js`

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
  - calls the same WASM-backed solve path used in local development

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

Main file:
- `scripts/dev.mjs`
  - the only dev script that matters — starts both the frontend and local API from the repo root
  - auto-installs npm dependencies for `backend/api` and `frontend` if `node_modules` is missing
  - auto-detects Python via `py / python / python3` candidates
  - on Windows: attempts `winget install Python.Python.3` if Python is not found
  - on Mac: attempts `brew install python3` if Python is not found
  - warns clearly if auto-install fails so the user knows what to run manually

`setup.mjs` and `dev-frontend.mjs` were deleted — `dev.mjs` handles everything they did.

In short:
- `scripts/` is not app logic
- `npm run dev` from the repo root is the only command teammates need

---

## April 20 additions — Dev tooling, Vercel Python solver, UI polish, and new pages

### 7. Cross-platform dev script and Python auto-install

**Problem:** `npm run dev` failed on Windows with a `spawn EINVAL` error because Node's `child_process.spawn` requires `shell: true` on Windows for npm-based commands. `setup.mjs` and `dev-frontend.mjs` were separate scripts that duplicated logic already in `dev.mjs`.

**What shipped:**
- `scripts/dev.mjs` — rewritten to be the single all-in-one dev command
  - `shell: true` on all `spawn` / `spawnSync` calls (Windows fix)
  - auto-installs npm deps for `backend/api` and `frontend` if `node_modules` is missing
  - `--legacy-peer-deps` flag for frontend install (resolves `@vitejs/plugin-react` vs `vite 8` peer conflict)
  - `pythonFound()` tries `py`, `python`, `python3` candidates in platform-correct order
  - `tryInstallPython()` attempts `winget` on Windows and `brew` on Mac
  - clear warning printed if auto-install fails so the teammate knows the exact manual step
- `scripts/setup.mjs` — deleted (was redundant)
- `scripts/dev-frontend.mjs` — deleted (was redundant)
- `package.json` — removed `setup` and `dev:frontend` scripts; `npm run dev` is now the only command needed

**Files changed:**
- `scripts/dev.mjs`
- `scripts/setup.mjs` (deleted)
- `scripts/dev-frontend.mjs` (deleted)
- `package.json`

---

### 8. Python NxN solver — Windows and Mac cross-platform fix

**Problem:** The Python bridge hardcoded `python3` as the executable and assumed Unix venv path (`bin/python3`). Both assumptions fail on Windows.

**What shipped:**
- `backend/api/src/solvers/pythonNxNSolver.js`
  - `IS_WINDOWS` flag drives all platform branching
  - `pythonBin` uses `Scripts\python.exe` on Windows, `bin/python3` on Unix
  - `findPythonCommand()` tries `py`, `python`, `python3` (Windows) or `python3`, `python` (Unix) before failing
  - `gcc` compilation for the IDA binary is wrapped in try/catch — non-fatal warning on Windows (gcc absent), does not break 2x2 or 4x4 solving
  - `shell: true` on all `execFileAsync` calls on Windows

**Files changed:**
- `backend/api/src/solvers/pythonNxNSolver.js`

---

### 9. Vercel — Python NxN solver for 2x2 and 4x4

**Problem:** Vercel serverless functions run in a Node.js environment with no Python available, so the local Python bridge cannot be used in production.

**What shipped:**
- `api/nxn-solve.py` — new Python serverless function (Vercel convention: `api/*.py`)
  - handles 2x2 and 4x4 via the vendored `rubikscubennnsolver` library
  - handles 3x3 via `kociemba` (lighter weight for serverless)
  - replicates `flattenStateForSolver()` and `normalizeSolverMoves()` from `pythonNotation.js` in pure Python
  - includes CORS headers for browser fetch
- `requirements.txt` — added at repo root so Vercel installs `kociemba` at build time
- `vercel.json` — added `/api/v1/cube/solve` rewrite to `/api/nxn-solve` before the catch-all `/api/v1/:path*` rewrite so the Python function is hit for solve requests

**Files changed:**
- `api/nxn-solve.py` (new)
- `requirements.txt` (new)
- `vercel.json`

---

### 10. Simulator UI polish — light/dark mode, cube orientation, button contrast

**What shipped:**

#### Default cube orientation
- `frontend/src/pages/simulator/InteractiveCube.jsx` — `CUBE_ROTATION` changed to `[0.2, 0.3, 0]`
- `frontend/src/components/RubiksCube3D.jsx` — `baseRotation` and initial `rotation` prop updated to match

#### Light/dark theme variables (SimulatorPage)
- Added `--sim-card`, `--sim-btn-border`, `--sim-face-border` CSS custom properties
- `--sim-border` darkened in light mode from `#E5E0D8` to `#A89F94`
- `--sim-face-border` introduced to fix Tailwind opacity-modifier breakdown on rgba variables

#### Face map border fix
- `SimulatorFaceMap.jsx` — face card borders switched from `border-[--sim-border]/50` to `border-[--sim-face-border]`
- Root cause: Tailwind's `/50` opacity modifier generates `rgb(var(...) / 0.5)` which is invalid CSS when the variable already contains `rgba(...)`, causing the browser to fall back to `currentColor` (white) — visually harsh white outlines in dark mode
- Fix: bake opacity directly into `--sim-face-border` so no modifier is needed

#### Button contrast (SimulatorControls)
- Default button borders changed from `border-dictator-chrome/20` to `border-[--sim-btn-border]`
- `--sim-btn-border` is `rgba(176,176,176,0.12)` dark / `rgba(44,42,38,0.15)` light — pale ghost-button style in default state

#### Sticker cell softening (SimulatorFaceMap)
- Sticker cells changed from `border-2 border-black/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]` to `border border-black/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]`

**Files changed:**
- `frontend/src/pages/simulator/SimulatorPage.jsx`
- `frontend/src/pages/simulator/SimulatorControls.jsx`
- `frontend/src/pages/simulator/SimulatorFaceMap.jsx`
- `frontend/src/pages/simulator/InteractiveCube.jsx`
- `frontend/src/components/RubiksCube3D.jsx`

---

### 11. New pages and authentication system

**What shipped:**

#### Global contexts — `frontend/src/context/`

- `AuthContext.jsx`
  - `AuthProvider` wraps the whole app (mounted in `main.jsx`)
  - `currentUser` state: `null` when logged out, populated mock object when logged in
  - `login()`, `signup()`, `logout()` are stubs — replace bodies with real API calls when DB is ready
  - `useAuth()` hook for any component to read auth state
- `ThemeContext.jsx`
  - `ThemeProvider` wraps the whole app (mounted above `AuthProvider` in `main.jsx`)
  - persists to `localStorage` under key `simulator-theme`
  - replaces the old per-component `useTheme.js` hook — state is now shared across all routes
  - `SimulatorPage` updated to import from this context instead of the old local hook
  - `useTheme()` hook for any component to read or toggle the theme

#### Auth modal — `frontend/src/components/AuthModal.jsx`

- Floating overlay component, not a route
- Login / Sign Up tabs with form validation
- Escape key and backdrop click to dismiss
- Calls `AuthContext` stubs on submit; closes on success
- Triggered from Navbar (mobile hamburger), App.jsx (desktop top-right), and SimulatorPage header

#### Page navbar — `frontend/src/components/PageNavbar.jsx`

- Shared nav used by Learn, Leaderboard, and Profile pages
- Landing page keeps `Navbar.jsx` (scroll-aware pill with GSAP)
- Features: logo → home, Learn/Compete links with active underline, auth state (Log In / Sign Up or profile avatar), light/dark toggle, Simulator shortcut
- All colors branch on `isDark` from `ThemeContext`

#### Routes — `frontend/src/pages/`

- `LearnPage.jsx` — `/learn`
  - Coming-soon placeholder holding space for the future learning system
  - Shows planned content cards: Beginner Method, CFOP/Fridrich, Video Guides, Algorithm Trainer
  - Replace file content when learning system is built; route and navbar wiring stay as-is
- `LeaderboardPage.jsx` — `/leaderboard`
  - Mock global rankings with 3x3 / 2x2 / 4x4 tab switcher
  - Rank icons: Crown (1st), Medal (2nd/3rd), number (4+)
  - Times ≥ 60 seconds formatted as M:SS.ms
  - Replace `MOCK_ENTRIES` with a `fetch()` call when DB is ready
- `ProfilePage.jsx` — `/profile`
  - Redirects to home if `currentUser === null`
  - Sections: avatar + username + email, stats summary cards, per-cube breakdown table, recent solves list
  - All data comes from `AuthContext.currentUser` — no page changes needed when DB is wired up

#### Landing page and routing updates

- `App.jsx` — added fixed top-right Log In / Sign Up buttons (desktop only, `hidden md:flex`); renders `AuthModal`
- `Navbar.jsx` — mobile hamburger now includes Log In / Sign Up (or profile avatar) so auth is reachable at any screen size; nav links updated to route to `/learn` and `/leaderboard`
- `main.jsx` — wraps with `ThemeProvider` and `AuthProvider`; adds routes for `/learn`, `/leaderboard`, `/profile`
- `SimulatorPage.jsx` — Log In / profile icon added next to the light/dark toggle in the header

#### Inner pages — light/dark mode support

All three inner pages read `isDark` from `ThemeContext` and apply conditional Tailwind classes for backgrounds, borders, and text. Secondary text uses `text-dictator-ink/75` in light mode instead of `text-dictator-chrome` (`#B0B0B0`) which is unreadable on light backgrounds. Borders use `border-dictator-ink/20` instead of `border-dictator-sand` for visible separation.

**Files changed (new):**
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/context/ThemeContext.jsx`
- `frontend/src/components/AuthModal.jsx`
- `frontend/src/components/PageNavbar.jsx`
- `frontend/src/pages/LearnPage.jsx`
- `frontend/src/pages/LeaderboardPage.jsx`
- `frontend/src/pages/ProfilePage.jsx`

**Files changed (updated):**
- `frontend/src/App.jsx`
- `frontend/src/main.jsx`
- `frontend/src/components/Navbar.jsx`
- `frontend/src/pages/simulator/SimulatorPage.jsx`

---

### 12. Documentation pass

Applied the repo-organization checklist to all new and changed files.

**What was updated:**

- File-level doc comments added to all 7 new files (AuthContext, ThemeContext, AuthModal, PageNavbar, LearnPage, LeaderboardPage, ProfilePage) — each explains purpose, how it connects to the rest of the system, and what a teammate needs to change when the database is wired up
- `main.jsx` — added route map and context explanation
- `App.jsx` — explained why auth buttons live in App.jsx rather than inside Navbar
- `Navbar.jsx` — clarified landing-page-only scope and how mobile auth works
- `docs/architecture.md` — added contexts section, inner pages section, auth/theme system section, `simulatorTheme.js` to the simulator file map
- `frontend/README.md` — added `context/` and `pages/` folders with per-file descriptions

**Files changed:**
- `docs/architecture.md`
- `docs/sprint-3-martin.md` (this file)
- `frontend/README.md`
- all 7 new frontend files (doc comment added)
- `frontend/src/App.jsx`
- `frontend/src/main.jsx`
- `frontend/src/components/Navbar.jsx`

---

## Updated files touched this sprint (full list)

### From earlier in the sprint (unchanged)
- `api/solver.js`
- `api/v1/[...path].js`
- `backend/api/src/server.js`
- `backend/api/src/wasmSolver.js`
- `backend/src/cube/CubeOperations.cpp`
- `backend/src/cube/CubeOperations.h`
- `backend/src/cube/PuzzleCube.cpp`
- `backend/src/cube/PuzzleCube.h`
- `backend/src/cube/solver_bridge.cpp`
- `frontend/src/net/api.js`
- `frontend/src/pages/simulator/CanvasFallbackPanel.jsx`
- `frontend/src/pages/simulator/InteractiveCube.jsx`
- `frontend/src/pages/simulator/SimulatorControls.jsx`
- `frontend/src/pages/simulator/SimulatorFaceMap.jsx`
- `frontend/src/pages/simulator/SimulatorPage.jsx`
- `frontend/src/pages/simulator/TutorialPanel.jsx`
- `frontend/src/pages/simulator/simulatorAnimation.js`
- `frontend/src/pages/simulator/simulatorAnimation.test.js`
- `frontend/src/pages/simulator/simulatorConstants.js`
- `frontend/src/pages/simulator/useCubeControls.js`
- `frontend/src/pages/simulator/useTimer.js`

### Added April 20
- `api/nxn-solve.py` (new)
- `requirements.txt` (new)
- `vercel.json`
- `scripts/dev.mjs`
- `scripts/setup.mjs` (deleted)
- `scripts/dev-frontend.mjs` (deleted)
- `package.json`
- `backend/api/src/solvers/pythonNxNSolver.js`
- `frontend/src/context/AuthContext.jsx` (new)
- `frontend/src/context/ThemeContext.jsx` (new)
- `frontend/src/components/AuthModal.jsx` (new)
- `frontend/src/components/PageNavbar.jsx` (new)
- `frontend/src/pages/LearnPage.jsx` (new)
- `frontend/src/pages/LeaderboardPage.jsx` (new)
- `frontend/src/pages/ProfilePage.jsx` (new)
- `frontend/src/App.jsx`
- `frontend/src/main.jsx`
- `frontend/src/components/Navbar.jsx`
- `frontend/src/components/RubiksCube3D.jsx`
- `docs/architecture.md`
- `frontend/README.md`

---

## 4x4 on Vercel — known limitation and current status (April 21)

### What works

| Size | Vercel (deployed) | Local (`npm run dev`) |
|------|------------------|-----------------------|
| 2x2  | ✅ `python-nxn-2` via pre-built wheel | ✅ vendored library |
| 3x3  | ✅ `kociemba-3x3` | ✅ Eric's C++ WASM |
| 4x4  | ❌ blocked (see below) | ✅ vendored library |

### Why 4x4 cannot run on Vercel

The `rubikscubennnsolver` library solves 4x4 using precomputed lookup tables downloaded at runtime from S3. Those tables are ~400 MB. Vercel serverless functions:

- Have a read-only filesystem except for `/tmp`
- `/tmp` fills up before the tables finish downloading → `[Errno 28] No space left on device`

This is a hard Vercel platform limit unrelated to our code.

### Why 2x2 works on Vercel but 4x4 doesn't

The 2x2 solver uses a direct non-table algorithm (`solve_non_table()`). No files are downloaded, no disk space needed. The 4x4 solver has no equivalent — it requires lookup tables.

### How we got the library onto Vercel

`rubikscubennnsolver` is not on PyPI and its `setup.py` uses `distutils` (removed in Python 3.12+). Vercel's build environment runs Python 3.14 so the library cannot be installed from source. The fix:

1. Installed Python 3.11 locally via `uv python install 3.11`
2. Built a wheel from our patched vendored copy: `pip wheel ./backend/vendor/rubiks-cube-NxNxN-solver --no-deps -w api/wheels/`
3. Committed `api/wheels/rubikscubennnsolver-1.0.0-py3-none-any.whl` to the repo
4. `requirements.txt` points at the local wheel — Vercel installs it directly, no compilation needed

The vendored copy was also patched:
- `rubikscubennnsolver/LookupTable.py` — `import resource` wrapped in `try/except` (Windows fix)
- `rubiks-cube-solver.py` — same fix
- `LookupTable.py` download function already used `urllib` in our vendored copy (the GitHub HEAD had `wget`)

### Size selector UI — temporarily hidden

`frontend/src/pages/simulator/SimulatorControls.jsx` — the SIZE button row (2x2 / 3x3 / 4x4) is commented out with a block comment explaining why. The code is preserved in place.

**To restore:** uncomment the block in `SimulatorControls.jsx`. This is worth doing once either:
- Eric's C++ WASM solver is extended to support 4x4 (no Python/lookup tables needed)
- The app is hosted on a platform with persistent storage (Railway, Render) where lookup tables can be downloaded once on server startup

### Options to fix 4x4 on Vercel in a future sprint

1. **Extend Eric's WASM solver** — if `solver_bridge.cpp` exports 4x4 solving, zero extra infrastructure needed
2. **Move the API to Railway or Render** — persistent server, tables download once on cold start, stay in memory
3. **Accept local-only for 4x4** — show a "local dev only" indicator on the 4x4 button when deployed

---

## Current dev server

Fresh root dev session was started from repo root with:

```bash
npm run dev
```

At verification time it was serving:
- frontend: `http://localhost:5400`
- API: `http://localhost:5200`
