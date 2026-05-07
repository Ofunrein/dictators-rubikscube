# Route-Based Code Splitting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `React.lazy` + `Suspense` to `main.jsx` so each route's bundle is loaded on demand instead of bundled into one giant chunk.

**Architecture:** Replace the 6 static page imports in `main.jsx` with dynamic `React.lazy` imports. Wrap `<Routes>` in a `<Suspense>` boundary with a minimal loading fallback. `App.jsx` (landing page) stays eagerly loaded since it is the first thing every visitor sees.

**Tech Stack:** React 19 (built-in `lazy` + `Suspense`), Vite 8 (automatic code-split chunk per dynamic import).

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `frontend/src/main.jsx` | Replace static imports with `React.lazy`, add `Suspense` |

---

## Task 1: Add lazy loading to all page routes

**Files:**
- Modify: `frontend/src/main.jsx`

- [ ] **Step 1: Read current `frontend/src/main.jsx`**

Confirm the 5 page imports that will become lazy:
- `SimulatorPage` → `./pages/simulator/SimulatorPage.jsx`
- `LearnPage` → `./pages/LearnPage.jsx`
- `StepByStepPage` → `./pages/StepByStepPage.jsx`
- `LeaderboardPage` → `./pages/LeaderboardPage.jsx`
- `ProfilePage` → `./pages/ProfilePage.jsx`

`App` stays eager — it is the landing page hit on first load.

- [ ] **Step 2: Rewrite `frontend/src/main.jsx`**

```jsx
import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import App from './App.jsx'

const SimulatorPage = lazy(() => import('./pages/simulator/SimulatorPage.jsx'));
const LearnPage = lazy(() => import('./pages/LearnPage.jsx'));
const StepByStepPage = lazy(() => import('./pages/StepByStepPage.jsx'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading…</span>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<App />} />
                <Route path="/simulator/*" element={<SimulatorPage />} />
                <Route path="/page/simulator/*" element={<SimulatorPage />} />
                <Route path="/learn" element={<LearnPage />} />
                <Route path="/step-by-step" element={<StepByStepPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
```

- [ ] **Step 3: Run lint**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npm run lint 2>&1 | tail -5
```
Expected: 0 errors.

- [ ] **Step 4: Run tests**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npm test 2>&1 | tail -8
```
Expected: all tests pass (lazy + Suspense don't affect unit tests).

- [ ] **Step 5: Verify build splits into chunks**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npm run build 2>&1 | grep "\.js" | head -20
```
Expected: multiple chunk files (simulator, learn, leaderboard, profile, step-by-step each get their own chunk). Previously it was one large `index.js`.

- [ ] **Step 6: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add frontend/src/main.jsx
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "perf: add route-based code splitting with React.lazy and Suspense"
```

- [ ] **Step 7: Push**

```bash
git push github main
```

---

## Self-Review

### Spec Coverage
| Requirement | Task | Status |
|---|---|---|
| React.lazy on all non-landing routes | Task 1 | ✓ |
| Suspense fallback wraps Routes | Task 1 | ✓ |
| App (landing) stays eagerly loaded | Task 1 | ✓ |
| Build produces split chunks | Task 1 step 5 | ✓ |

### Placeholder Scan
No TBD, no "implement later". All code shown. ✓

### Type Consistency
`lazy(() => import(...))` returns `LazyExoticComponent` — React 19 types handle this automatically. ✓
