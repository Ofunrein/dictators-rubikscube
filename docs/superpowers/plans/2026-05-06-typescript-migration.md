# Frontend TypeScript Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all 47 frontend source files from JavaScript/JSX to TypeScript/TSX, achieving 100% TypeScript coverage with strict mode enabled.

**Architecture:** Three-phase approach: (1) bootstrap TypeScript tooling and configs, (2) bulk-rename all source files, (3) fix type errors systematically from the bottom of the dependency tree upward (utils → lib → contexts → hooks → components → pages). Use minimal `as unknown as Type` casts only for third-party WebGL/Three.js boundaries; prefer explicit types everywhere else.

**Tech Stack:** TypeScript 5.x (already installed via backend — confirm in frontend), Vite 8 (built-in TS support via `@vitejs/plugin-react`), vitest 4 (built-in TS support), ESLint 9 with `@typescript-eslint`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `frontend/tsconfig.json` | Strict TS config for the app |
| Create | `frontend/tsconfig.node.json` | Config for Vite config file itself |
| Modify | `frontend/vite.config.js` → `.ts` | Add TS types to Vite config |
| Modify | `frontend/vitest.config.js` → `.ts` | Update coverage pattern for .ts/.tsx |
| Modify | `frontend/eslint.config.js` | Add @typescript-eslint parser + rules |
| Rename | All 47 `.jsx`/`.js` source files | `.jsx` → `.tsx`, `.js` → `.ts` |
| Modify | `frontend/src/context/ThemeContext.tsx` | Add explicit types to context |
| Modify | `frontend/src/context/AuthContext.tsx` | Add explicit types to context + user shape |
| Modify | `frontend/src/cube/CubeState.ts` | Add types to cube state class |
| Modify | `frontend/src/net/api.ts` | Add types to API response shapes |
| Modify | `frontend/src/pages/learn/useLearnSlides.ts` | Add types to hook |
| Modify | All simulator hooks | Add types to useTimer, useCubeControls, etc. |

---

## Task 1: Bootstrap TypeScript Tooling

**Files:**
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Modify: `frontend/package.json` (add TypeScript dev deps)

- [ ] **Step 1: Install TypeScript and type packages**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npm install --save-dev typescript @types/three @types/node @typescript-eslint/eslint-plugin @typescript-eslint/parser --legacy-peer-deps
```
Expected: installs without errors. `package.json` gains 4 new devDependencies.

- [ ] **Step 2: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `frontend/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Update `frontend/eslint.config.js` for TypeScript**

Read the current file first, then add TypeScript parser and rules. The updated config should look like this (replace the entire file):

```js
import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
/* eslint-disable-next-line import/no-unresolved */

export default [
  { ignores: ['dist', 'coverage', 'node_modules'] },
  // TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },
  // JS/JSX files (test files, config files)
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
];
```

- [ ] **Step 5: Rename `vite.config.js` to `vite.config.ts` and update it**

```ts
/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PORT = process.env.VITE_API_PORT ?? '5200';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.VITE_DEV_PORT ?? '5400'),
    strictPort: true,
    proxy: {
      '/api/v1': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

- [ ] **Step 6: Rename `vitest.config.js` to `vitest.config.ts` and update coverage pattern**

```ts
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
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: [
        'src/main.tsx',
        'src/**/*.test.{ts,tsx,js,jsx}',
      ],
      thresholds: {
        lines: 15,
        functions: 10,
        branches: 15,
      },
    },
  },
});
```

- [ ] **Step 7: Commit the tooling bootstrap**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add frontend/tsconfig.json \
        frontend/tsconfig.node.json \
        frontend/vite.config.ts \
        frontend/vitest.config.ts \
        frontend/eslint.config.js \
        frontend/package.json \
        frontend/package-lock.json
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "chore: bootstrap TypeScript tooling - tsconfig, vite.config.ts, vitest.config.ts"
```

---

## Task 2: Bulk Rename All Source Files

**Files:**
- Rename: all 47 `.jsx` → `.tsx` and `.js` → `.ts` files under `frontend/src/`

Do NOT rename test files (`.test.jsx`, `.test.js`) — they stay as JS for now.

- [ ] **Step 1: Rename all .jsx source files to .tsx**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend/src

find . -name "*.jsx" ! -name "*.test.jsx" | while read f; do
  mv "$f" "${f%.jsx}.tsx"
done
```

- [ ] **Step 2: Rename all .js source files to .ts**

```bash
find . -name "*.js" ! -name "*.test.js" ! -name "*.config.js" | while read f; do
  mv "$f" "${f%.js}.ts"
done
```

- [ ] **Step 3: Rename `frontend/src/main.tsx` (was main.jsx)**

Confirm `main.tsx` exists:
```bash
ls /Users/martinofunrein/Downloads/the-dictators/frontend/src/main.tsx
```

- [ ] **Step 4: Check TypeScript errors (expect many — this is normal)**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npx tsc --noEmit 2>&1 | head -40
```
Expected: many errors — this is the baseline. Note the count.

- [ ] **Step 5: Commit the renames**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add -A
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "chore: rename all .jsx→.tsx and .js→.ts source files"
```

---

## Task 3: Fix Utility and Constants Type Errors

**Files:**
- Modify: `frontend/src/utils/isPlainObject.ts`
- Modify: `frontend/src/pages/simulator/simulatorConstants.ts`
- Modify: `frontend/src/pages/simulator/simulatorTheme.ts`
- Modify: `frontend/src/pages/simulator/moveNotation.ts`
- Modify: `frontend/src/pages/learn/learnConstants.ts`

These are pure data/utility files with no React deps — easiest to type.

- [ ] **Step 1: Fix `src/utils/isPlainObject.ts`**

Read the file, then add explicit parameter and return types. Pattern:
```ts
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}
```

- [ ] **Step 2: Fix `src/pages/simulator/simulatorConstants.ts`**

Read the file. Add explicit `Record<string, string[]>` or similar types to the exported constants (FACE_ORDER, move group maps, keymap). Pattern: if a variable is `const X = { ... }`, TypeScript infers it — only add types where inference fails.

After reading, add types only where `tsc --noEmit` reports an error for this file.

- [ ] **Step 3: Fix `src/pages/simulator/simulatorTheme.ts`**

Read the file. Add return type annotation to the `getThemeClasses` function:
```ts
export function getThemeClasses(isDark: boolean): Record<string, string> {
```

- [ ] **Step 4: Fix `src/pages/simulator/moveNotation.ts`**

Read the file. Add types to any exported functions (likely string parsing functions). Pattern:
```ts
export function parseMoveNotation(move: string): string { ... }
```

- [ ] **Step 5: Fix `src/pages/learn/learnConstants.ts`**

Add explicit types for the STEPS and ALGORITHMS arrays. Add these interface definitions at the top of the file:

```ts
export interface Step {
  id: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  layer: string;
  title: string;
  desc: string;
  algorithms: Algorithm[];
  tips: string[];
}

export interface Algorithm {
  notation: string;
  name: string;
}

export interface AlgorithmEntry {
  step: number;
  name: string;
  notation: string;
  use: string;
}
```

Then annotate:
```ts
export const STEPS: Step[] = [ ... ];
export const ALGORITHMS: AlgorithmEntry[] = [ ... ];
```

- [ ] **Step 6: Run tsc, confirm error count dropped**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npx tsc --noEmit 2>&1 | wc -l
```

- [ ] **Step 7: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add frontend/src/utils/isPlainObject.ts \
        frontend/src/pages/simulator/simulatorConstants.ts \
        frontend/src/pages/simulator/simulatorTheme.ts \
        frontend/src/pages/simulator/moveNotation.ts \
        frontend/src/pages/learn/learnConstants.ts
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "feat(ts): type utilities and constants"
```

---

## Task 4: Fix Lib / Net / Cube Layer

**Files:**
- Modify: `frontend/src/lib/auth.ts`
- Modify: `frontend/src/lib/stats.ts`
- Modify: `frontend/src/lib/supabase.ts`
- Modify: `frontend/src/net/api.ts`
- Modify: `frontend/src/cube/cubeModel.ts`
- Modify: `frontend/src/cube/moves.ts`
- Modify: `frontend/src/cube/CubeState.ts`

- [ ] **Step 1: Run tsc to see errors in these files**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npx tsc --noEmit 2>&1 | grep "src/lib/\|src/net/\|src/cube/"
```

- [ ] **Step 2: Fix `src/lib/supabase.ts`**

Read the file. The Supabase client is typed — usually just add an import of the client type. If it exports `supabase`, ensure:
```ts
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);
export { supabase };
```

- [ ] **Step 3: Fix `src/net/api.ts`**

Read the file. Add response type interfaces for API calls. Pattern:
```ts
export interface SolveResponse {
  moves: string[];
  state: unknown;
}

export async function solveCubeRemote(payload: unknown): Promise<SolveResponse> { ... }
```
For complex response shapes, use `as SolveResponse` cast if structure is not statically known.

- [ ] **Step 4: Fix `src/cube/CubeState.ts`**

Read the file. The CubeState class likely has untyped state. Add types:
```ts
export type CubeFace = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';
export type StickerColor = 'W' | 'R' | 'G' | 'Y' | 'O' | 'B';
export type FaceState = StickerColor[];
export type CubeStateData = Record<CubeFace, FaceState>;
```

- [ ] **Step 5: Fix `src/lib/auth.ts` and `src/lib/stats.ts`**

Read each file. Add types to function parameters and return values. Use `Promise<void>` or `Promise<UserData>` as appropriate. For unknown external data, use `unknown` with a type guard or `as Type`.

- [ ] **Step 6: Fix `src/cube/cubeModel.ts` and `src/cube/moves.ts`**

Read each file. These are likely large files with complex state manipulation. Strategy:
- Export the main data type: `export type CubeModel = { ... }`
- Add parameter types to all exported functions
- For internal complex logic, use type assertions only where inference fails

- [ ] **Step 7: Run tsc — confirm lib/net/cube errors cleared**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npx tsc --noEmit 2>&1 | grep "src/lib/\|src/net/\|src/cube/" | wc -l
```
Expected: 0.

- [ ] **Step 8: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add frontend/src/lib/ frontend/src/net/ frontend/src/cube/
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "feat(ts): type lib, net, and cube layers"
```

---

## Task 5: Fix Context Types

**Files:**
- Modify: `frontend/src/context/ThemeContext.tsx`
- Modify: `frontend/src/context/AuthContext.tsx`

Contexts are used everywhere — fixing them unblocks many downstream errors.

- [ ] **Step 1: Fix `src/context/ThemeContext.tsx`**

Read the file. Add explicit context type:

```tsx
interface ThemeContextValue {
  theme: string;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

- [ ] **Step 2: Fix `src/context/AuthContext.tsx`**

Read the file. Add explicit user shape and context type. The user shape was observed:

```tsx
interface UserStats {
  solves: number;
  solvesBySize: Record<number, number>;
  best: Record<number, number | null>;
  avg: Record<number, number | null>;
  ranks: Record<number, number | null>;
}

interface CurrentUser {
  id: string;
  username: string;
  email: string;
  joinedAt: string;
  stats: UserStats;
}

interface AuthContextValue {
  currentUser: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUserStats: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 3: Run tsc — check context errors cleared**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npx tsc --noEmit 2>&1 | grep "src/context/" | wc -l
```
Expected: 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add frontend/src/context/
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "feat(ts): type ThemeContext and AuthContext"
```

---

## Task 6: Fix Simple Components and Learn Slide Components

**Files:**
- Modify: `frontend/src/components/ErrorBoundary.tsx`
- Modify: `frontend/src/components/PageNavbar.tsx`
- Modify: `frontend/src/pages/learn/SlideHero.tsx`
- Modify: `frontend/src/pages/learn/SlideAlgorithms.tsx`
- Modify: `frontend/src/pages/learn/SlideStepByStep.tsx`
- Modify: `frontend/src/pages/learn/SlideResources.tsx`
- Modify: `frontend/src/pages/learn/SlideOverview.tsx`
- Modify: `frontend/src/pages/learn/SlideNotation.tsx`
- Modify: `frontend/src/pages/learn/useLearnSlides.ts`
- Modify: `frontend/src/pages/LearnPage.tsx`
- Modify: other landing components (App.tsx, CTA.tsx, Footer.tsx, Hero.tsx, etc.)

- [ ] **Step 1: Run tsc to see errors in components and learn pages**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npx tsc --noEmit 2>&1 | grep "src/components/\|src/pages/learn/"
```

- [ ] **Step 2: Fix `src/components/ErrorBoundary.tsx`**

Add React import type. The class component already extends `Component` — add explicit state and props types:

```tsx
import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { ... }
  static getDerivedStateFromError(error: Error): State { ... }
  componentDidCatch(error: Error, info: ErrorInfo): void { ... }
  render(): ReactNode { ... }
}
```

- [ ] **Step 3: Fix learn slide components**

For each slide component that takes props, add prop interfaces. Most take `() => void` callbacks:

`SlideHero.tsx`:
```tsx
interface SlideHeroProps {
  onStart: () => void;
  onNotation: () => void;
}
export default function SlideHero({ onStart, onNotation }: SlideHeroProps) { ... }
```

`SlideAlgorithms.tsx`:
```tsx
interface SlideAlgorithmsProps {
  onCopy: (notation: string) => void;
}
export default function SlideAlgorithms({ onCopy }: SlideAlgorithmsProps) { ... }
```

`SlideStepByStep.tsx`, `SlideOverview.tsx`, `SlideNotation.tsx`, `SlideResources.tsx` — no props, no change needed beyond renaming.

- [ ] **Step 4: Fix `src/pages/learn/useLearnSlides.ts`**

```ts
import { useState, useRef, useEffect, RefObject } from 'react';

interface UseLearnSlidesReturn {
  currentSlide: number;
  isTransitioning: boolean;
  slidesRef: RefObject<HTMLElement[]>;
  goToSlide: (index: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
}

export function useLearnSlides(totalSlides: number): UseLearnSlidesReturn {
  ...
}
```

Note: `slidesRef` stores an array via callback refs. Use `React.MutableRefObject<(HTMLElement | null)[]>` if the above causes issues:
```ts
const slidesRef = useRef<(HTMLElement | null)[]>([]);
```

- [ ] **Step 5: Fix landing page components**

For the simple stateless components (CTA.tsx, Footer.tsx, Protocol.tsx, Team.tsx, Philosophy.tsx, Features.tsx), TypeScript usually infers return types automatically. Run tsc and only fix what it actually reports.

Common pattern for any component with props:
```tsx
interface Props {
  // list props here
}
export default function ComponentName({ prop1, prop2 }: Props): JSX.Element { ... }
```

For components with no props: TypeScript is happy with `function Foo() { return <div/> }` — no annotation needed.

- [ ] **Step 6: Run tsc — check learn and component errors cleared**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npx tsc --noEmit 2>&1 | grep "src/components/\|src/pages/learn/" | wc -l
```
Expected: 0.

- [ ] **Step 7: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add frontend/src/components/ frontend/src/pages/learn/ frontend/src/pages/LearnPage.tsx frontend/src/App.tsx
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "feat(ts): type components and learn page"
```

---

## Task 7: Fix Simulator Hooks

**Files:**
- Modify: `frontend/src/pages/simulator/useTimer.ts`
- Modify: `frontend/src/pages/simulator/useCubeControls.ts`
- Modify: `frontend/src/pages/simulator/useSimulatorQueue.ts`
- Modify: `frontend/src/pages/simulator/useSimulatorActions.ts`
- Modify: `frontend/src/pages/simulator/simulatorFaceMapUtils.ts`
- Modify: `frontend/src/pages/simulator/simulatorAnimation.ts`

- [ ] **Step 1: Run tsc to see simulator hook errors**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npx tsc --noEmit 2>&1 | grep "simulator/use\|simulatorAnimation\|simulatorFaceMap"
```

- [ ] **Step 2: Fix `src/pages/simulator/useTimer.ts`**

Read the file. Add types for timer state and return value:
```ts
interface TimerState {
  running: boolean;
  elapsedMs: number;
  startTime: number | null;
}

interface UseTimerReturn {
  timerMs: number;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}
```

- [ ] **Step 3: Fix `src/pages/simulator/useCubeControls.ts`**

Read the file. Add types for the hook parameters and return:
```ts
interface UseCubeControlsParams {
  cubeSize: number;
  dispatchManualMove: (move: string) => void;
  manualInputLocked: boolean;
}

interface UseCubeControlsReturn {
  selectedSticker: unknown; // refine after reading file
  clearSelectedSticker: () => void;
  // add other returns found in file
}
```

- [ ] **Step 4: Fix `src/pages/simulator/useSimulatorQueue.ts` and `useSimulatorActions.ts`**

These are complex hooks. Strategy: read each file, add types to parameters and return values. For any `CubeState` or cube-related types, import from `../../cube/CubeState`. For setState functions, use `React.Dispatch<React.SetStateAction<T>>`.

Common patterns needed:
```ts
import { Dispatch, SetStateAction, MutableRefObject } from 'react';
import { CubeStateData } from '../../cube/CubeState';

interface UseSimulatorQueueParams {
  cubeStateObjRef: MutableRefObject<unknown>; // or import CubeState class
  canAnimateMoves: boolean;
  solveStackRef: MutableRefObject<string[]>;
  setDisplayState: Dispatch<SetStateAction<CubeStateData>>;
}
```

For any params you can't easily type, use `unknown` initially — it's still better than `any` for TypeScript coverage signal.

- [ ] **Step 5: Run tsc — simulator hook errors cleared**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npx tsc --noEmit 2>&1 | grep "simulator/use\|simulatorAnimation\|simulatorFaceMap" | wc -l
```
Expected: 0 or close to 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add frontend/src/pages/simulator/useTimer.ts \
        frontend/src/pages/simulator/useCubeControls.ts \
        frontend/src/pages/simulator/useSimulatorQueue.ts \
        frontend/src/pages/simulator/useSimulatorActions.ts \
        frontend/src/pages/simulator/simulatorFaceMapUtils.ts \
        frontend/src/pages/simulator/simulatorAnimation.ts
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "feat(ts): type simulator hooks"
```

---

## Task 8: Fix Complex Page Components

**Files:**
- Modify: `frontend/src/pages/simulator/SimulatorPage.tsx`
- Modify: `frontend/src/pages/simulator/SimulatorControls.tsx`
- Modify: `frontend/src/pages/simulator/InteractiveCube.tsx`
- Modify: `frontend/src/pages/simulator/TutorialPanel.tsx`
- Modify: `frontend/src/pages/simulator/SimulatorFaceMap.tsx`
- Modify: `frontend/src/pages/simulator/CanvasFallbackPanel.tsx`
- Modify: `frontend/src/pages/StepByStepPage.tsx`
- Modify: `frontend/src/pages/LeaderboardPage.tsx`
- Modify: `frontend/src/pages/ProfilePage.tsx`
- Modify: `frontend/src/pages/step-by-step/GuidePanel.tsx`
- Modify: `frontend/src/pages/step-by-step/stepsData.ts`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Run tsc to see all remaining errors**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -60
```
Note the total error count.

- [ ] **Step 2: Fix `src/pages/simulator/SimulatorPage.tsx`**

This is the largest component. Read the file. Key types to add:
- Props for any child components it renders
- Typed event handlers (keyboard, touch): `KeyboardEvent`, `TouchEvent`
- Canvas error state types
- The coachMessages array type:
  ```ts
  interface CoachMessage {
    id: string;
    role: 'user' | 'assistant';
    mode: string;
    content: string;
    moves: string[];
    nextActions: string[];
    disclaimer: string;
  }
  ```
- For Three.js/R3F canvas elements that TypeScript complains about, use `as unknown as Type` or add a `// @ts-ignore` with a comment explaining the WebGL boundary

- [ ] **Step 3: Fix `src/pages/simulator/InteractiveCube.tsx`**

Read the file. This uses React Three Fiber heavily. Key patterns:
- Import Three.js types: `import type { Mesh, Group, WebGLRenderer } from 'three'`
- For R3F hooks (`useFrame`, `useThree`): these are already typed via `@react-three/fiber`
- For any `useRef` holding Three.js objects:
  ```ts
  const meshRef = useRef<THREE.Mesh>(null);
  ```
- Where R3F types are complex/unavailable, use `unknown` rather than `any`

- [ ] **Step 4: Fix `src/pages/simulator/SimulatorControls.tsx`**

Read the file. Add prop interface for whatever SimulatorPage passes in. Pattern:
```tsx
interface SimulatorControlsProps {
  // list all props from usage in SimulatorPage
}
export default function SimulatorControls(props: SimulatorControlsProps) { ... }
```

- [ ] **Step 5: Fix remaining page components**

For `StepByStepPage.tsx`, `LeaderboardPage.tsx`, `ProfilePage.tsx`:
- These are simpler pages — read each and add types to any untyped state or function params
- For mock data arrays, add explicit types: `const mockData: LeaderboardEntry[] = [...]`

- [ ] **Step 6: Fix `src/main.tsx`**

This should be straightforward after the previous tasks. The lazy imports are typed automatically. Add `import type { FC } from 'react'` if needed for `PageLoader`.

- [ ] **Step 7: Run final tsc check**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npx tsc --noEmit 2>&1 | grep -v "node_modules"
```
Goal: 0 errors. If errors remain in Three.js/WebGL boundaries, add targeted `// @ts-ignore` comments with explanation.

- [ ] **Step 8: Run full test suite**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npm test 2>&1 | tail -10
```
Expected: all tests pass.

- [ ] **Step 9: Run lint**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npm run lint 2>&1 | tail -8
```
Expected: 0 errors (warnings for `@typescript-eslint/no-explicit-any` are OK — we set it to warn not error).

- [ ] **Step 10: Run build to confirm Vite handles TypeScript**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend && npm run build 2>&1 | tail -10
```
Expected: successful build.

- [ ] **Step 11: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add frontend/src/pages/
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "feat(ts): type all page components and simulator"
```

---

## Task 9: Final Cleanup and Push

- [ ] **Step 1: Remove old JS config files**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend
ls vite.config.js vitest.config.js 2>/dev/null && rm -f vite.config.js vitest.config.js || echo "Already removed"
```

- [ ] **Step 2: Update CI to handle TypeScript**

The CI already runs `npm run build` and `npm test` — no changes needed. TypeScript errors will fail the build step if any slip through.

Optionally add a type-check step to CI:
```bash
# In .github/workflows/ci.yml frontend job, add after Lint step:
# - name: Type check
#   run: npx tsc --noEmit
```
Add this if you want CI to fail on type errors before build.

- [ ] **Step 3: Run complete final verification**

```bash
cd /Users/martinofunrein/Downloads/the-dictators/frontend
npx tsc --noEmit 2>&1 | grep -v "node_modules" | wc -l
npm run lint 2>&1 | tail -3
npm test 2>&1 | tail -5
npm run build 2>&1 | tail -5
```
All expected: 0 tsc errors, 0 lint errors, all tests pass, build succeeds.

- [ ] **Step 4: Final commit and push**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add -A
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "chore: finalize TypeScript migration - 100% TS coverage, strict mode"
git push github main
```

---

## Self-Review

### Spec Coverage

| Requirement | Task | Status |
|---|---|---|
| `tsconfig.json` with `strict: true` | Task 1 | ✓ |
| All `.jsx` renamed to `.tsx` | Task 2 | ✓ |
| All `.js` renamed to `.ts` | Task 2 | ✓ |
| Vite/Vitest updated for TypeScript | Task 1 | ✓ |
| ESLint updated with TS parser | Task 1 | ✓ |
| Context types (ThemeContext, AuthContext) | Task 5 | ✓ |
| Cube/lib/net types | Task 4 | ✓ |
| Component prop interfaces | Task 6 | ✓ |
| Simulator hook types | Task 7 | ✓ |
| Complex page types | Task 8 | ✓ |
| 0 tsc errors final state | Task 9 | ✓ |
| All tests still pass | Task 8+9 | ✓ |

### Placeholder Scan
No TBD, no "implement later". All code patterns shown with complete signatures. ✓

### Type Consistency
- `CubeStateData` defined in Task 4 (`CubeState.ts`), used in Task 7 (`useSimulatorQueue.ts`)
- `AlgorithmEntry` defined in Task 3 (`learnConstants.ts`), used in Task 6 (`SlideAlgorithms.tsx`)
- `CoachMessage` defined in Task 8, used in `SimulatorPage.tsx` state
- `AuthContextValue` defined in Task 5, consumed everywhere via `useAuth()`
- All hook return types (`UseLearnSlidesReturn`, `UseTimerReturn`) consumed in page components ✓
