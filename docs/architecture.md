# Architecture

This document describes the current project structure and runtime flow for the active Rubik's Cube platform.

## System Overview

```text
Browser
  -> Active frontend: frontend/ (Vite dev server on :5400)
  -> Frontend calls /api/v1/* through Vite proxy in local dev

frontend/
  -> Landing page (App.jsx + components/)
  -> Inner pages: /learn, /leaderboard, /profile (pages/)
  -> Simulator page (pages/simulator/)
  -> Shared cube model and move engine (src/cube/)
  -> Frontend API client (src/net/api.js)
  -> Global contexts (src/context/):
       ThemeContext  — dark/light toggle, persisted to localStorage
       AuthContext   — login/logout state, mock data until DB ready

backend/api/
  -> Local Node API server on :5200
  -> Shared route handlers and solver orchestration
  -> Imports the shared cube model from frontend/src/cube/

api/
  -> Vercel production handlers
  -> Thin production adapter around the same route behavior

backend/src/cube/
  -> C++ solver source and bridge code

backend/vendor/
  -> Vendored Python NxN solver support
```

## Current Runtime Flow

### Local development

1. `npm run dev` from the repo root starts:
   - frontend on `http://localhost:5400`
   - backend API on `http://localhost:5200`
2. The browser talks to the frontend on `5400`.
3. Frontend requests to `/api/v1/*` are proxied to the local API on `5200`.
4. The backend validates input, applies moves, generates scrambles, or delegates solve work.

### Production deployment

1. Vercel builds the static site from `frontend/`.
2. Vercel serves `api/v1/[...path].js` as serverless API routes.
3. The frontend and API still share the same public origin.

## Source Of Truth By Responsibility

### Frontend UI

- `frontend/src/components/`       — landing page sections + shared UI (Navbar, PageNavbar, AuthModal)
- `frontend/src/pages/simulator/`  — interactive 3D cube simulator
- `frontend/src/pages/`            — inner pages: LearnPage, LeaderboardPage, ProfilePage

### Global app state (contexts)

- `frontend/src/context/ThemeContext.jsx` — dark/light mode, shared across all pages
- `frontend/src/context/AuthContext.jsx`  — login/logout/currentUser, mock until DB connected

### Shared cube state and move logic

- `frontend/src/cube/`

This is important: the backend intentionally reuses the shared frontend cube model so the project has one move engine and one state contract.

### Backend route and solver orchestration

- `backend/api/src/routes.js`
- `backend/api/src/server.js`
- `backend/api/src/solvers/`

### Production API entrypoint

- `api/v1/[...path].js`

### Native solver code

- `backend/src/cube/`

### Reference-only legacy prototype

- `frontend-legacy/`

This folder is not part of the active app flow and should not be treated as the current frontend.

## Simulator Structure

The simulator is intentionally split into page-level pieces so the main page does not become one large unreadable file.

```text
frontend/src/pages/simulator/
  SimulatorPage.jsx          main page composition and state wiring
  InteractiveCube.jsx        3D scene and pointer interactions
  SimulatorControls.jsx      controls, history, timer actions
  TutorialPanel.jsx          tutorial and learning content
  SimulatorFaceMap.jsx       2D unfolded face map
  useCubeControls.js         keyboard, click, and drag move input
  useSimulatorQueue.js       queued move animation lifecycle
  useSimulatorActions.js     scramble, solve, reset, and size-change actions
  simulatorAnimation.js      animation timing and motion helpers
  simulatorTheme.js          light/dark Tailwind class mappings for simulator
  moveNotation.js            move-sequence normalization and inversion helpers
  simulatorFaceMapUtils.js   face-map normalization and orientation helpers
```

## Pages

| Route | File | Description |
|-------|------|-------------|
| / | App.jsx | Landing page with GSAP animations |
| /simulator | pages/simulator/SimulatorPage.jsx | Full interactive simulator |
| /step-by-step | pages/StepByStepPage.jsx | Guided solving with live cube |
| /learn | pages/LearnPage.jsx | Eric's learning modules |
| /leaderboard | pages/LeaderboardPage.jsx | 6 leaderboards with dropdown |
| /profile | pages/ProfilePage.jsx | Per-size stats + ranks |

## Step-by-Step Solving Guide

A guided simulator that walks users through a solve method one step at a time.

**Layout:** Guide panel on the left (~45% width) and an interactive cube on the right (~55%). On mobile the panels stack vertically.

**Files:**
- `frontend/src/pages/StepByStepPage.jsx` — page composition, scramble gate, step state
- `frontend/src/components/GuidePanel.jsx` — step text, GIFs, and algorithm buttons
- `frontend/src/data/stepsData.js` — step definitions (title, description, gif, algorithms)

**Shared simulator code:** Reuses `useSimulatorQueue`, `useCubeControls`, and `InteractiveCube` directly from the simulator package so the cube behavior is identical.

**GIFs:** Hosted in the `Ofunrein/cube-solving-guide-gifs` GitHub repository and referenced by URL.

**Key behaviors:**
- Scramble gate — the guide is locked until the user applies a scramble, ensuring the cube is in a solvable state before step 1.
- Carry-forward state — cube state persists across step transitions; the user is always working on the same physical cube.
- Algorithm buttons in `GuidePanel` call `enqueueMoves()` from `useSimulatorQueue` to animate each algorithm on the live cube.
- Locked to 3×3; the size selector, timer, and auto-solve controls from the main simulator are not shown.

## Sprint 3 Changes

**Bug fixes:**
- 2×2 solve routing was sending moves to the wrong handler; fixed by aligning size keys in the solver dispatch.
- Move history had a race between the queue flush and the history state update; resolved by moving the history append into the queue drain callback.
- `SimulatorFaceMap` wrapped in `React.memo` to prevent re-renders on every queue tick.

**New features:**
- Mobile navbar gains a hamburger menu with animated open/close transition.
- Leaderboard expanded from 3 tabs to 6 boards (3×3, 2×2, 4×4, 5×5, 6×6, 7×7) with a dropdown selector.
- Profile page shows per-size personal bests and ranks instead of a single aggregate view.

**Accessibility:**
- Introduced `--dictator-red` CSS custom property mapping to a WCAG AA-compliant red value used across button and accent styles.
- Heavy state updates in leaderboard and profile wrapped in `startTransition` to keep Interaction to Next Paint (INP) low.

## Auth and Theme System

Both contexts are mounted in `main.jsx` above the router so every route shares
the same state. The auth functions (login, signup, logout) are stubs — they set
local state with mock data. When the database is ready, replace only those
function bodies in `AuthContext.jsx`; no page components need to change.

## Why The Repo Is Split This Way

- `frontend/` stays focused on the active web app
- `backend/` stays focused on local API logic and solver integration
- `api/` stays small because it is only the production deployment adapter
- `docs/` holds project-level explanation instead of hiding it inside one app folder

This split is easier to scale than putting all frontend and backend files in the root, but it only works well when the root README stays the canonical onboarding document.
