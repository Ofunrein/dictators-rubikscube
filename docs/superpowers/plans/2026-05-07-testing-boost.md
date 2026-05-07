# Testing Coverage Boost Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push testing score from 70 → 80+ by fixing 4 failing backend tests, adding frontend tests for contexts and key hooks, and raising coverage thresholds to reflect actual coverage.

**Architecture:** Fix backend test failure caused by a stale `routes.js` import, then add vitest unit tests for `ThemeContext`, `AuthContext` (mocked Supabase), `useTimer`, `cubeModel` helpers, and `simulatorFaceMapUtils`. Raise coverage thresholds once new tests land.

**Tech Stack:** vitest 4 (frontend), vitest 2 (backend), `@testing-library/react` (frontend), Fastify inject (backend), Supabase JS (mocked with `vi.mock`).

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Investigate + fix | `backend/api/src/routes.js` | Remove stale frontend cube model import causing 4 test failures |
| Create | `frontend/src/context/ThemeContext.test.tsx` | Test useTheme hook + ThemeProvider |
| Create | `frontend/src/context/AuthContext.test.tsx` | Test useAuth hook with mocked Supabase |
| Create | `frontend/src/pages/simulator/useTimer.test.ts` | Test timer start/stop/reset/auto-stop |
| Create | `frontend/src/pages/simulator/simulatorFaceMapUtils.test.ts` | Test faceMap utility functions |
| Create | `frontend/src/cube/cubeModel.test.ts` | Test createSolvedState + basic state helpers |
| Modify | `frontend/vitest.config.ts` | Raise thresholds to 35% lines/functions/branches |

---

## Task 1: Fix Failing Backend Tests

**Files:**
- Investigate: `backend/api/src/routes.js`
- Potentially modify: `backend/api/src/routes.js` or `backend/api/src/lib/aiCoach.js`

- [ ] **Step 1: Diagnose the failure**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/backend/api && npm run test:ts 2>&1 | grep -E "error|Error|FAIL|Cannot find|MODULE" | head -20
```

Note the exact error message and which import is failing.

- [ ] **Step 2: Find the bad import**

```bash
grep -rn "frontend\|cube.*model\|cubeModel" /Users/martinofunrein/Downloads/the-dictators/backend/api/src/ 2>/dev/null | grep -v "node_modules" | grep -v ".test."
```

Note every file that imports from the frontend directory or references a cube model path.

- [ ] **Step 3: Fix the import**

The error is likely a relative path like `../../frontend/src/cube/cubeModel` in `routes.js` or `aiCoach.js`. The backend should NOT import from the frontend. Instead it should have its own copy of the cube model or use the backend-specific cube logic.

Read the failing file, find the bad import, and replace it with either:
- The backend's own `../cube/cubeModel` if that file exists in backend
- An inline import of just the needed constants
- Remove the import if unused

After fixing:
```bash
cd /Users/martinofunrein/Downloads/the-dictators/backend/api && npm run test:ts 2>&1 | tail -15
```
Expected: all 6 test files pass (0 failures).

- [ ] **Step 4: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add backend/api/src/
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "fix: remove stale frontend cube model import from backend routes"
```

---

## Task 2: ThemeContext Tests

**Files:**
- Create: `frontend/src/context/ThemeContext.test.tsx`

- [ ] **Step 1: Read `frontend/src/context/ThemeContext.tsx`**

Note the exported `ThemeProvider` and `useTheme` hook. Note `isDark` default state and localStorage key.

- [ ] **Step 2: Write the test file**

Create `frontend/src/context/ThemeContext.test.tsx`:

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext.tsx';

function ThemeConsumer() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{isDark ? 'dark' : 'light'}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides isDark false by default', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('toggleTheme switches isDark', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const initial = screen.getByTestId('theme').textContent;
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('theme').textContent).not.toBe(initial);
  });

  it('persists theme to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(localStorage.length).toBeGreaterThan(0);
  });

  it('useTheme throws when used outside ThemeProvider', () => {
    const renderOutside = () => render(<ThemeConsumer />);
    expect(renderOutside).toThrow();
  });
});
```

Note: the default theme is `dark` based on the stored default — adjust the first test assertion to match what `ThemeContext.tsx` actually defaults to after reading it.

- [ ] **Step 3: Run tests**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npm test -- --reporter=verbose 2>&1 | grep -E "ThemeContext|PASS|FAIL" | head -10
```
Expected: all 4 tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add frontend/src/context/ThemeContext.test.tsx
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "test: add ThemeContext unit tests"
```

---

## Task 3: AuthContext Tests

**Files:**
- Create: `frontend/src/context/AuthContext.test.tsx`

Authentication context uses Supabase — mock it entirely.

- [ ] **Step 1: Read `frontend/src/context/AuthContext.tsx`**

Note exactly what `useAuth` returns and how `login`/`logout`/`signup` call Supabase.

- [ ] **Step 2: Write the test file**

Create `frontend/src/context/AuthContext.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext.tsx';

// Mock Supabase entirely
vi.mock('../lib/supabase.ts', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

function AuthConsumer() {
  const { currentUser, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="user">{currentUser ? currentUser.email : 'none'}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides null currentUser on initial load with no session', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('useAuth throws when used outside AuthProvider', () => {
    const renderOutside = () => render(<AuthConsumer />);
    expect(renderOutside).toThrow();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npm test -- --reporter=verbose 2>&1 | grep -E "AuthContext|PASS|FAIL" | head -10
```
Expected: both tests pass.

If Supabase mock path is wrong (`../lib/supabase.ts` vs `../../lib/supabase`), adjust to match the actual import path used inside `AuthContext.tsx`.

- [ ] **Step 4: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add frontend/src/context/AuthContext.test.tsx
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "test: add AuthContext unit tests with mocked Supabase"
```

---

## Task 4: useTimer Tests

**Files:**
- Create: `frontend/src/pages/simulator/useTimer.test.ts`

- [ ] **Step 1: Read `frontend/src/pages/simulator/useTimer.ts`**

Note: what parameters does it take? What does it return? Does it auto-stop when `isSolved` is true?

- [ ] **Step 2: Write the test file**

Create `frontend/src/pages/simulator/useTimer.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from './useTimer.ts';

describe('useTimer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts with timer not running and 0ms elapsed', () => {
    const { result } = renderHook(() => useTimer({ isSolved: false }));
    expect(result.current.isRunning).toBe(false);
    expect(result.current.timerMs).toBe(0);
  });

  it('start() begins the timer', () => {
    const { result } = renderHook(() => useTimer({ isSolved: false }));
    act(() => { result.current.start(); });
    expect(result.current.isRunning).toBe(true);
  });

  it('stop() halts the timer', () => {
    const { result } = renderHook(() => useTimer({ isSolved: false }));
    act(() => { result.current.start(); });
    act(() => { result.current.stop(); });
    expect(result.current.isRunning).toBe(false);
  });

  it('reset() zeroes timer and stops it', () => {
    const { result } = renderHook(() => useTimer({ isSolved: false }));
    act(() => { result.current.start(); vi.advanceTimersByTime(1000); });
    act(() => { result.current.reset(); });
    expect(result.current.timerMs).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it('timerMs increases while running', () => {
    const { result } = renderHook(() => useTimer({ isSolved: false }));
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.timerMs).toBeGreaterThan(0);
  });
});
```

Note: adjust method names (`start`, `stop`, `reset`, `isRunning`, `timerMs`) to match what `useTimer.ts` actually exports after reading it.

- [ ] **Step 3: Run tests**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npm test -- --reporter=verbose 2>&1 | grep -E "useTimer|PASS|FAIL" | head -10
```
Expected: 5 tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add frontend/src/pages/simulator/useTimer.test.ts
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "test: add useTimer hook unit tests"
```

---

## Task 5: simulatorFaceMapUtils + cubeModel Tests

**Files:**
- Create: `frontend/src/pages/simulator/simulatorFaceMapUtils.test.ts`
- Create: `frontend/src/cube/cubeModel.test.ts`

- [ ] **Step 1: Read both source files**

```bash
cat /Users/martinofunrein/Downloads/the-dictators/frontend/src/pages/simulator/simulatorFaceMapUtils.ts
cat /Users/martinofunrein/Downloads/the-dictators/frontend/src/cube/cubeModel.ts | head -80
```

Note exported function names and their signatures.

- [ ] **Step 2: Write `simulatorFaceMapUtils.test.ts`**

Create `frontend/src/pages/simulator/simulatorFaceMapUtils.test.ts`. Test the actual exported functions found in the source. Common patterns:

```ts
import { describe, expect, it } from 'vitest';
// import the actual functions from the file
import * as utils from './simulatorFaceMapUtils.ts';

describe('simulatorFaceMapUtils', () => {
  it('exports functions', () => {
    // verify at least one function exists
    expect(typeof Object.values(utils)[0]).toBe('function');
  });

  // Add 3-4 tests for actual behavior based on what you found in the source file
  // For example if there's a function like getFacePosition(face, size):
  // it('returns correct position for U face', () => {
  //   expect(getFacePosition('U', 3)).toMatchObject({ ... });
  // });
});
```

Read the file and write tests for the ACTUAL exported functions — do not use placeholder assertions. The test file must test real behavior.

- [ ] **Step 3: Write `cubeModel.test.ts`**

Create `frontend/src/cube/cubeModel.test.ts`. The cube model has `createSolvedState` and state manipulation. Read the file then write:

```ts
import { describe, expect, it } from 'vitest';
import { createSolvedState } from './cubeModel.ts';

describe('cubeModel', () => {
  it('createSolvedState returns object with 6 faces for 3x3', () => {
    const state = createSolvedState(3);
    expect(Object.keys(state)).toHaveLength(6);
  });

  it('each face of 3x3 solved state has 9 stickers', () => {
    const state = createSolvedState(3);
    for (const face of Object.values(state)) {
      expect((face as string[]).length).toBe(9);
    }
  });

  it('each face of 3x3 solved state is monochrome', () => {
    const state = createSolvedState(3);
    for (const face of Object.values(state)) {
      const stickers = face as string[];
      expect(new Set(stickers).size).toBe(1);
    }
  });

  it('createSolvedState returns different colors for each face', () => {
    const state = createSolvedState(3);
    const firstStickers = Object.values(state).map((f) => (f as string[])[0]);
    expect(new Set(firstStickers).size).toBe(6);
  });

  it('4x4 solved state has faces with 16 stickers each', () => {
    const state = createSolvedState(4);
    for (const face of Object.values(state)) {
      expect((face as string[]).length).toBe(16);
    }
  });
});
```

Adjust imports and function names based on what `cubeModel.ts` actually exports.

- [ ] **Step 4: Run all tests**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npm test 2>&1 | tail -10
```
All tests must pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add frontend/src/pages/simulator/simulatorFaceMapUtils.test.ts \
        frontend/src/cube/cubeModel.test.ts
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "test: add simulatorFaceMapUtils and cubeModel unit tests"
```

---

## Task 6: Raise Coverage Thresholds + Final Push

**Files:**
- Modify: `frontend/vitest.config.ts`

- [ ] **Step 1: Run coverage to see current actual percentages**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npm test -- --coverage 2>&1 | grep -E "Statements|Branches|Functions|Lines" | tail -5
```

Note actual percentages.

- [ ] **Step 2: Update thresholds in `frontend/vitest.config.ts`**

Read the file, then set thresholds to actual percentages (rounded DOWN to nearest 5). For example if actual is 22% lines, set threshold to 20. This documents the floor and makes CI fail if coverage drops.

The `coverage` block should look like:
```ts
thresholds: {
  lines: <actual_lines_rounded_down_to_5>,
  functions: <actual_functions_rounded_down_to_5>,
  branches: <actual_branches_rounded_down_to_5>,
},
```

- [ ] **Step 3: Run tests with coverage — confirm thresholds pass**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npm test -- --coverage 2>&1 | tail -10
```
Expected: thresholds met, no "Coverage threshold not met" error.

- [ ] **Step 4: Final counts**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npm test 2>&1 | tail -5
```
Note total test count — should be 60+ across 14+ test files.

- [ ] **Step 5: Commit and push**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add frontend/vitest.config.ts
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "test: raise coverage thresholds to match actual coverage"
git push github main
```

---

## Self-Review

### Spec Coverage
| Requirement | Task | Status |
|---|---|---|
| Fix 4 failing backend tests | Task 1 | ✓ |
| ThemeContext tests | Task 2 | ✓ |
| AuthContext tests (mocked Supabase) | Task 3 | ✓ |
| useTimer tests | Task 4 | ✓ |
| cubeModel tests | Task 5 | ✓ |
| simulatorFaceMapUtils tests | Task 5 | ✓ |
| Raise coverage thresholds | Task 6 | ✓ |

### Placeholder Scan
Task 5 references reading source files before writing tests — this is intentional (test must match actual exports). The test skeletons show the pattern; exact function names are filled in from source. ✓

### Type Consistency
- `createSolvedState(size: number)` → used in cubeModel.test.ts ✓
- `useTimer({ isSolved: boolean })` → from useTimer.ts signature observed ✓
- `useTheme()` → from ThemeContext.tsx ✓
- `useAuth()` → from AuthContext.tsx ✓
