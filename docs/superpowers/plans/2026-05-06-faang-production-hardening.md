# FAANG Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the six highest-ROI gaps from FAANG entry-level portfolio evaluation: CI/CD pipeline, React Error Boundary, AI endpoint rate limiting, SimulatorPage component tests, coverage thresholds, and LICENSE + CONTRIBUTING.

**Architecture:** Add a GitHub Actions CI workflow that runs both test suites on every push; add a class-based React Error Boundary that wraps the entire app; scope `@fastify/rate-limit` to the `/v1/ai` prefix only so it doesn't throttle cube API calls; add `@testing-library/react` frontend component tests for SimulatorPage's coach UI; add coverage thresholds to both vitest configs; add MIT LICENSE and CONTRIBUTING.md.

**Tech Stack:** GitHub Actions, React 19 (class component for Error Boundary), `@fastify/rate-limit ^9`, `@testing-library/react ^16`, `@testing-library/user-event ^14`, vitest v8 coverage provider (frontend) + c8 (backend already node env).

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `.github/workflows/ci.yml` | Run backend + frontend tests on push/PR |
| Create | `frontend/src/components/ErrorBoundary.jsx` | Catch React render errors app-wide |
| Modify | `frontend/src/main.jsx` | Wrap app tree with ErrorBoundary |
| Modify | `backend/api/src/app.ts` | Register rate-limit plugin scoped to `/v1/ai` prefix |
| Modify | `backend/api/package.json` | Add `@fastify/rate-limit` dependency |
| Create | `frontend/src/pages/simulator/SimulatorPage.coach.test.jsx` | Component tests for AI Coach panel open/close, message render, scroll |
| Modify | `frontend/vite.config.js` | Add vitest config block with coverage thresholds |
| Modify | `backend/api/vitest.config.ts` | Add coverage thresholds |
| Create | `LICENSE` | MIT license |
| Create | `CONTRIBUTING.md` | Contribution guide |

---

## Task 1: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: ["**"]

jobs:
  backend:
    name: Backend Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend/api
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: backend/api/package-lock.json
      - run: npm ci
      - run: npm run test:ts

  frontend:
    name: Frontend Tests + Lint
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci --legacy-peer-deps
      - run: npm run lint
      - run: npm test
```

- [ ] **Step 2: Verify file exists**

```bash
cat .github/workflows/ci.yml
```
Expected: prints the YAML above with no errors.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for backend and frontend tests"
```

---

## Task 2: React Error Boundary

**Files:**
- Create: `frontend/src/components/ErrorBoundary.jsx`
- Modify: `frontend/src/main.jsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/ErrorBoundary.test.jsx`:

```jsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary.jsx';

// Suppress React's console.error noise for expected errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});
afterAll(() => {
  console.error = originalError;
});

function Bomb({ shouldThrow }) {
  if (shouldThrow) throw new Error('test explosion');
  return <p>Safe content</p>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeTruthy();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    expect(screen.getByText('test explosion')).toBeTruthy();
  });

  it('shows Try again button that resets the boundary', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Install testing library deps**

```bash
cd frontend && npm install --save-dev @testing-library/react @testing-library/user-event --legacy-peer-deps
```
Expected: installs without errors, `package.json` devDependencies gains both packages.

- [ ] **Step 3: Run test to verify it fails**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|Error"
```
Expected: FAIL — `Cannot find module './ErrorBoundary.jsx'`

- [ ] **Step 4: Create ErrorBoundary component**

```jsx
// frontend/src/components/ErrorBoundary.jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="p-8 text-center">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-red-500">
              Something went wrong
            </p>
            <p className="mb-6 font-mono text-sm text-gray-400">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded border border-red-500/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-red-500 hover:bg-red-500/10"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|✗"
```
Expected: all 3 ErrorBoundary tests PASS.

- [ ] **Step 6: Wrap app tree in main.jsx**

Replace the `<StrictMode>` block in `frontend/src/main.jsx`:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import App from './App.jsx'
import SimulatorPage from './pages/simulator/SimulatorPage.jsx'
import LearnPage from './pages/LearnPage.jsx'
import StepByStepPage from './pages/StepByStepPage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
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
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
```

- [ ] **Step 7: Run full frontend test suite**

```bash
cd frontend && npm test
```
Expected: all tests pass, no new failures.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/ErrorBoundary.jsx frontend/src/components/ErrorBoundary.test.jsx frontend/src/main.jsx frontend/package.json frontend/package-lock.json
git commit -m "feat: add React Error Boundary wrapping full app tree"
```

---

## Task 3: Rate Limiting on AI Endpoint

**Files:**
- Modify: `backend/api/package.json` (add `@fastify/rate-limit`)
- Modify: `backend/api/src/app.ts` (register plugin scoped to `/v1/ai`)
- Modify: `backend/api/tests/app.test.ts` (add rate limit behavior test)

- [ ] **Step 1: Write the failing test**

Open `backend/api/tests/app.test.ts` and add this describe block at the end (before the final closing brace of the file):

```typescript
describe('AI endpoint rate limiting', () => {
  it('returns 429 after 10 requests within 1 minute window', async () => {
    const app = buildApp({ logger: false });
    await app.ready();

    // Build a minimal valid AI help request body
    const body = JSON.stringify({
      mode: 'hint',
      context: {
        cubeState: buildSolvedState(3),
        moveHistory: [],
        scramble: [],
        tutorialStepIndex: null,
        timerMs: 0,
        idleMs: 0,
        solveDepth: 0,
        queueActive: false,
        isSolved: false,
      },
    });

    // 10 requests should all succeed (or fail for AI reasons, but not 429)
    for (let i = 0; i < 10; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/ai/help',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
        payload: body,
      });
      expect(res.statusCode).not.toBe(429);
    }

    // 11th request must be rate limited
    const limited = await app.inject({
      method: 'POST',
      url: '/v1/ai/help',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      payload: body,
    });
    expect(limited.statusCode).toBe(429);
    const parsed = JSON.parse(limited.body);
    expect(parsed.error.code).toBe('RATE_LIMITED');

    await app.close();
  });

  it('does not rate limit cube API endpoints', async () => {
    const app = buildApp({ logger: false });
    await app.ready();

    // 20 rapid requests to /v1/health should never 429
    for (let i = 0; i < 20; i++) {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/health',
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });
      expect(res.statusCode).toBe(200);
    }

    await app.close();
  });
});
```

Note: `buildSolvedState` must be imported from the cube lib — check the existing test file imports and use the same helper already imported there.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend/api && npm run test:ts 2>&1 | grep -E "FAIL|PASS|rate limit|429"
```
Expected: FAIL — test fails because no rate limiting is in place (11th request returns 200 or 400, not 429).

- [ ] **Step 3: Install `@fastify/rate-limit`**

```bash
cd backend/api && npm install @fastify/rate-limit@^9
```
Expected: installs without errors. `package.json` dependencies gains `"@fastify/rate-limit": "^9.x.x"`.

- [ ] **Step 4: Add scoped rate limiting to app.ts**

Edit `backend/api/src/app.ts`. Add the import at the top with the other imports:

```typescript
import rateLimit from '@fastify/rate-limit';
```

Then add this block inside `buildApp`, after `app.register(registerRoutes, { prefix: '/api/v1' });` and before `app.setNotFoundHandler`:

```typescript
  // Rate-limit only AI endpoints — 10 requests per minute per IP
  app.register(async (instance) => {
    await instance.register(rateLimit, {
      max: 10,
      timeWindow: '1 minute',
      keyGenerator: (request) => request.headers['x-forwarded-for'] as string ?? request.ip,
      errorResponseBuilder: (_request, context) => ({
        error: {
          code: 'RATE_LIMITED',
          message: `Rate limit exceeded. Retry in ${Math.ceil(context.ttl / 1000)} seconds.`,
          requestId: crypto.randomUUID(),
        },
      }),
    });

    instance.register(async (scoped) => {
      const aiRoutes = (await import('./routes/aiHelp.js')).default;
      scoped.register(aiRoutes, { prefix: '/ai' });
    });
  }, { prefix: '/v1' });

  app.register(async (instance) => {
    await instance.register(rateLimit, {
      max: 10,
      timeWindow: '1 minute',
      keyGenerator: (request) => request.headers['x-forwarded-for'] as string ?? request.ip,
      errorResponseBuilder: (_request, context) => ({
        error: {
          code: 'RATE_LIMITED',
          message: `Rate limit exceeded. Retry in ${Math.ceil(context.ttl / 1000)} seconds.`,
          requestId: crypto.randomUUID(),
        },
      }),
    });

    instance.register(async (scoped) => {
      const aiRoutes = (await import('./routes/aiHelp.js')).default;
      scoped.register(aiRoutes, { prefix: '/ai' });
    });
  }, { prefix: '/api/v1' });
```

**Important:** Also remove the `/v1/ai` registration from `registerRoutes` in `backend/api/src/routes/index.ts` to avoid double-registering the AI routes. Remove this line:

```typescript
  app.register(aiHelpRoutes, { prefix: '/ai' });
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend/api && npm run test:ts 2>&1 | grep -E "FAIL|PASS|rate limit|429"
```
Expected: rate limit tests PASS, all other tests still PASS.

- [ ] **Step 6: Run full backend test suite**

```bash
cd backend/api && npm run test:ts
```
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/api/src/app.ts backend/api/src/routes/index.ts backend/api/package.json backend/api/package-lock.json backend/api/tests/app.test.ts
git commit -m "feat: scope rate limiting to AI endpoints (10 req/min per IP)"
```

---

## Task 4: SimulatorPage Coach UI Component Tests

**Files:**
- Create: `frontend/src/pages/simulator/SimulatorPage.coach.test.jsx`

This task requires `@testing-library/react` and `@testing-library/user-event` — already installed in Task 2.

The coach UI lives entirely inside `SimulatorPage.jsx`. We test it by rendering the component in a test environment where Three.js canvas is mocked (it will fail to render WebGL in jsdom — we mock it).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/pages/simulator/SimulatorPage.coach.test.jsx`:

```jsx
/**
 * SimulatorPage.coach.test.jsx
 *
 * Tests the AI Coach panel UI in isolation.
 * Three.js/WebGL is mocked because jsdom has no canvas support.
 * API calls are mocked via vi.stubGlobal('fetch', ...) pattern.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SimulatorPage from './SimulatorPage.jsx';

// Mock Three.js canvas — jsdom can't run WebGL
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="canvas-mock">{children}</div>,
  useFrame: vi.fn(),
  useThree: () => ({ gl: { domElement: document.createElement('canvas') }, camera: {}, scene: {} }),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  PerspectiveCamera: () => null,
}));

// Stub fetch for AI coach API calls
function makeFetchStub(response) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(response),
  });
}

const MOCK_COACH_RESPONSE = {
  requestId: 'test-req-1',
  coachMessage: {
    id: 'msg-1',
    role: 'assistant',
    mode: 'hint',
    content: 'Try moving the top layer clockwise.',
    moves: ['U'],
    nextActions: ['Look at your cross', 'Align the edges'],
    disclaimer: '',
  },
};

function renderSimulator() {
  return render(
    <BrowserRouter>
      <SimulatorPage />
    </BrowserRouter>
  );
}

describe('AI Coach panel', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not show coach panel on mount', () => {
    renderSimulator();
    expect(screen.queryByText('AI Cube Coach')).toBeNull();
  });

  it('opens coach panel when AI Coach button is clicked', async () => {
    const user = userEvent.setup();
    renderSimulator();
    await user.click(screen.getByRole('button', { name: /open ai cube coach/i }));
    expect(screen.getByText('AI Cube Coach')).toBeTruthy();
    expect(screen.getByText('Ready')).toBeTruthy();
  });

  it('closes coach panel when close button is clicked', async () => {
    const user = userEvent.setup();
    renderSimulator();
    await user.click(screen.getByRole('button', { name: /open ai cube coach/i }));
    expect(screen.getByText('AI Cube Coach')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /close ai cube coach/i }));
    expect(screen.queryByText('AI Cube Coach')).toBeNull();
  });

  it('renders assistant message content after successful API response', async () => {
    vi.stubGlobal('fetch', makeFetchStub(MOCK_COACH_RESPONSE));
    const user = userEvent.setup();
    renderSimulator();
    await user.click(screen.getByRole('button', { name: /open ai cube coach/i }));

    // Click one of the quick-action buttons (Hint, Guide, etc.)
    const hintButton = screen.getByRole('button', { name: /hint/i });
    await user.click(hintButton);

    await waitFor(() => {
      expect(screen.getByText('Try moving the top layer clockwise.')).toBeTruthy();
    });
    expect(screen.getByText('U')).toBeTruthy();
    expect(screen.getByText(/look at your cross/i)).toBeTruthy();
  });

  it('renders error message when API call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const user = userEvent.setup();
    renderSimulator();
    await user.click(screen.getByRole('button', { name: /open ai cube coach/i }));

    const hintButton = screen.getByRole('button', { name: /hint/i });
    await user.click(hintButton);

    await waitFor(() => {
      expect(screen.getByText('Coach Error')).toBeTruthy();
    });
  });

  it('shows loading state while API call is in progress', async () => {
    // Never resolves
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    const user = userEvent.setup();
    renderSimulator();
    await user.click(screen.getByRole('button', { name: /open ai cube coach/i }));

    const hintButton = screen.getByRole('button', { name: /hint/i });
    await user.click(hintButton);

    await waitFor(() => {
      expect(screen.getByText('Thinking')).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|coach|Coach"
```
Expected: FAIL — mocks may be incomplete or component issues surface. This is expected on first run.

- [ ] **Step 3: Add jsdom environment to vite.config.js**

The frontend vitest currently has no config. The test needs jsdom. We'll add it in Task 5 (coverage config). For now, add a `vitest.config.js` alongside vite:

Create `frontend/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/**/*.test.{js,jsx}'],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 35,
      },
    },
  },
});
```

- [ ] **Step 4: Install jsdom and v8 coverage**

```bash
cd frontend && npm install --save-dev jsdom @vitest/coverage-v8 --legacy-peer-deps
```
Expected: installs without errors.

- [ ] **Step 5: Run tests again**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | tail -30
```
Expected: ErrorBoundary tests PASS. SimulatorPage coach tests — some may pass, some may fail depending on how deep the Three.js mock goes. Fix any remaining mock issues by adding additional vi.mock() calls for any un-mocked Three.js imports that surface in the error output.

Common additional mocks needed (add to the test file if the error names a specific import):

```jsx
// If 'three' direct imports fail in jsdom:
vi.mock('three', () => ({
  WebGLRenderer: vi.fn(() => ({ render: vi.fn(), setSize: vi.fn(), domElement: document.createElement('canvas') })),
  Scene: vi.fn(),
  PerspectiveCamera: vi.fn(() => ({ position: { set: vi.fn() } })),
  BoxGeometry: vi.fn(),
  MeshStandardMaterial: vi.fn(),
  Mesh: vi.fn(() => ({ rotation: {}, position: {} })),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn(() => ({ position: { set: vi.fn() } })),
  Color: vi.fn(),
  Vector3: vi.fn(() => ({ set: vi.fn(), normalize: vi.fn(), clone: vi.fn() })),
  Raycaster: vi.fn(() => ({ setFromCamera: vi.fn(), intersectObjects: vi.fn(() => []) })),
  Vector2: vi.fn(),
  MeshLambertMaterial: vi.fn(),
  PlaneGeometry: vi.fn(),
  Group: vi.fn(() => ({ add: vi.fn(), children: [], rotation: {}, position: {} })),
}));
```

- [ ] **Step 6: Run full frontend test suite**

```bash
cd frontend && npm test
```
Expected: all tests pass (ErrorBoundary + coach panel).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/simulator/SimulatorPage.coach.test.jsx frontend/vitest.config.js frontend/package.json frontend/package-lock.json
git commit -m "test: add SimulatorPage AI coach panel component tests"
```

---

## Task 5: Coverage Thresholds

**Files:**
- Modify: `frontend/vitest.config.js` (already created in Task 4 — thresholds already set)
- Modify: `backend/api/vitest.config.ts`
- Modify: `backend/api/package.json` (add `@vitest/coverage-v8` for backend)

- [ ] **Step 1: Install backend coverage provider**

```bash
cd backend/api && npm install --save-dev @vitest/coverage-v8
```

- [ ] **Step 2: Update backend vitest.config.ts**

Replace the full content of `backend/api/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,js}'],
      exclude: [
        'src/**/*.test.{ts,js}',
        'src/server.js',
        'src/mockServer.ts',
        'src/solverHybrid.test.js',
      ],
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 50,
      },
    },
  },
});
```

- [ ] **Step 3: Run backend tests with coverage to confirm thresholds pass**

```bash
cd backend/api && npm run test:ts -- --coverage 2>&1 | tail -20
```
Expected: coverage report prints. If thresholds fail, lower them to the actual current percentages (round down to nearest 5) and commit — the point is to make thresholds explicit, not to artificially set them high.

- [ ] **Step 4: Run frontend tests with coverage**

```bash
cd frontend && npm test -- --coverage 2>&1 | tail -20
```
Expected: coverage report prints. Same rule — if thresholds fail, lower to actual.

- [ ] **Step 5: Commit**

```bash
git add backend/api/vitest.config.ts backend/api/package.json backend/api/package-lock.json frontend/vitest.config.js
git commit -m "test: add coverage thresholds to frontend and backend vitest configs"
```

---

## Task 6: LICENSE and CONTRIBUTING.md

**Files:**
- Create: `LICENSE`
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Create MIT LICENSE**

Create `LICENSE` in the repo root with today's year and your name:

```
MIT License

Copyright (c) 2026 Martin Ofunrein

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Create CONTRIBUTING.md**

Create `CONTRIBUTING.md` in the repo root:

```markdown
# Contributing

## Setup

```bash
# Backend
cd backend/api && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Requires: Node 20+, a `.env` file in `backend/api/` — copy `.env.example` and fill in values.

## Branches

Use descriptive names: `feature/x`, `fix/y`, `docs/z`. No AI-tool prefixes.

## Tests

Run before every commit:

```bash
# Backend
cd backend/api && npm run test:ts

# Frontend
cd frontend && npm test
```

CI runs both on every push. PRs must pass CI before merge.

## Commits

Follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.

## Code Style

- Frontend: React JSX, Tailwind utility classes, custom hooks for logic
- Backend: TypeScript strict mode, Zod for validation, Fastify for routing
- Run `npm run lint` in `frontend/` before committing UI changes
```

- [ ] **Step 3: Commit**

```bash
git add LICENSE CONTRIBUTING.md
git commit -m "docs: add MIT license and contributing guide"
```

---

## Self-Review

### Spec Coverage

| Improvement | Task | Status |
|---|---|---|
| CI/CD GitHub Actions | Task 1 | ✓ covered |
| React Error Boundary | Task 2 | ✓ covered |
| Rate limiting on AI endpoint | Task 3 | ✓ covered |
| SimulatorPage component tests | Task 4 | ✓ covered |
| Coverage thresholds | Task 5 | ✓ covered |
| LICENSE + CONTRIBUTING.md | Task 6 | ✓ covered |

### Placeholder Scan

- No TBD, TODO, or "implement later" present ✓
- All code steps show complete code ✓
- Test code shown before implementation code in every task ✓
- Commands include expected output ✓

### Type Consistency

- `buildApp` — used consistently, matches `backend/api/src/app.ts` export
- `MOCK_COACH_RESPONSE` shape matches `AiHelpResponse` contract from routes
- `@fastify/rate-limit` v9 matches Fastify v4 peer dep requirement ✓

---

**Estimated score impact after completion: 76.9 → ~84 / 100**
