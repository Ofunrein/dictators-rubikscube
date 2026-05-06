# LearnPage Decompose + Vanilla Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose the 1,370-line `LearnPage.jsx` into focused sub-components, add 2 missing slides (7-step method + algorithm cheat sheet) ported from `dictators-website/website-learnpage`, and add `npm run lint` to the frontend CI job.

**Architecture:** Extract the giant inline `<style>` block to `LearnPage.css`; split each slide into its own component under `frontend/src/pages/learn/`; extract navigation state into a `useLearnSlides` hook; add the two new slides so the React learn page reaches parity with the vanilla companion site. CI task is independent and should be done first.

**Tech Stack:** React 19, JSX, Tailwind (existing), custom CSS (LearnPage.css), @testing-library/react (already installed), vitest 4.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `.github/workflows/ci.yml` | Add `npm run lint` step to frontend job |
| Create | `frontend/src/pages/learn/LearnPage.css` | All static CSS extracted from `<style jsx>` block |
| Create | `frontend/src/pages/learn/useLearnSlides.js` | Slide navigation state + handlers |
| Create | `frontend/src/pages/learn/learnConstants.js` | Algorithm table data, step data |
| Create | `frontend/src/pages/learn/SlideHero.jsx` | Slide 0 — hero with CTA buttons |
| Create | `frontend/src/pages/learn/SlideOverview.jsx` | Slide 1 — 3-card overview grid |
| Create | `frontend/src/pages/learn/SlideNotation.jsx` | Slide 2 — face moves + modifiers reference |
| Create | `frontend/src/pages/learn/SlideStepByStep.jsx` | Slide 3 (NEW) — 7-step solve method |
| Create | `frontend/src/pages/learn/SlideAlgorithms.jsx` | Slide 4 (NEW) — algorithm cheat sheet table |
| Create | `frontend/src/pages/learn/SlideResources.jsx` | Slide 5 — resources + simulator CTA |
| Modify | `frontend/src/pages/LearnPage.jsx` | Orchestrator only: imports all slides, wires hook, renders chrome |
| Create | `frontend/src/pages/learn/useLearnSlides.test.js` | Hook tests |
| Create | `frontend/src/pages/learn/SlideAlgorithms.test.jsx` | Algo table render tests |
| Create | `frontend/src/pages/learn/SlideStepByStep.test.jsx` | Step card render tests |

---

## Task 1: Add `npm run lint` to CI

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Read current ci.yml frontend job**

```bash
cat /path/to/repo/.github/workflows/ci.yml
```

Confirm the frontend job steps are: Checkout → Setup Node → Install deps → Run tests → Build. The lint step is missing between Install and Run tests.

- [ ] **Step 2: Add lint step**

In `.github/workflows/ci.yml`, in the `frontend` job, add this step between "Install dependencies" and "Run tests":

```yaml
      - name: Lint
        run: npm run lint
```

Full frontend job steps after edit:
```yaml
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
```

- [ ] **Step 3: Verify lint passes locally first**

```bash
cd frontend && npm run lint
```
Expected: exits 0, no errors. If there are lint errors, fix them before committing — do NOT add `|| true` to the CI step.

- [ ] **Step 4: Validate YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo "VALID"
```
Expected: `VALID`

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "ci: add lint step to frontend CI job"
```

---

## Task 2: Extract CSS to `LearnPage.css`

**Files:**
- Create: `frontend/src/pages/learn/LearnPage.css`
- Modify: `frontend/src/pages/LearnPage.jsx`

The current `LearnPage.jsx` has a `<style jsx>` block from line ~351 to line ~1367. This is ~1016 lines of plain CSS that should live in a `.css` file.

- [ ] **Step 1: Create the `learn/` subdirectory**

```bash
mkdir -p frontend/src/pages/learn
```

- [ ] **Step 2: Extract CSS**

Read `frontend/src/pages/LearnPage.jsx`. Find the `<style jsx>{`` ... ``}</style>` block. Copy everything **between** the backtick delimiters (the raw CSS, not the JSX wrapper) into a new file `frontend/src/pages/learn/LearnPage.css`.

The CSS file should start with `.learn-page {` and contain only CSS — no JSX, no template literal syntax.

- [ ] **Step 3: Remove style block from LearnPage.jsx, add import**

In `frontend/src/pages/LearnPage.jsx`:

1. Delete the entire `<style jsx>{`` ... ``}</style>` block from the JSX return.
2. Add this import at the top of the file (after the existing imports):

```jsx
import './learn/LearnPage.css';
```

- [ ] **Step 4: Verify page still renders**

```bash
cd frontend && npm run dev
```
Open `http://localhost:5400/learn`. Visually confirm the learn page looks identical to before.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/learn/LearnPage.css frontend/src/pages/LearnPage.jsx
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "refactor: extract LearnPage inline styles to LearnPage.css"
```

---

## Task 3: Extract `useLearnSlides` Hook + `learnConstants.js`

**Files:**
- Create: `frontend/src/pages/learn/useLearnSlides.js`
- Create: `frontend/src/pages/learn/learnConstants.js`
- Create: `frontend/src/pages/learn/useLearnSlides.test.js`

- [ ] **Step 1: Write failing hook tests**

Create `frontend/src/pages/learn/useLearnSlides.test.js`:

```js
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLearnSlides } from './useLearnSlides.js';

describe('useLearnSlides', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at slide 0', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    expect(result.current.currentSlide).toBe(0);
    expect(result.current.isTransitioning).toBe(false);
  });

  it('goToSlide changes currentSlide', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    act(() => result.current.goToSlide(2));
    expect(result.current.currentSlide).toBe(2);
  });

  it('goToSlide sets isTransitioning to true then false after 750ms', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    act(() => result.current.goToSlide(1));
    expect(result.current.isTransitioning).toBe(true);
    act(() => vi.advanceTimersByTime(750));
    expect(result.current.isTransitioning).toBe(false);
  });

  it('goToSlide ignores out-of-bounds index', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    act(() => result.current.goToSlide(-1));
    expect(result.current.currentSlide).toBe(0);
    act(() => result.current.goToSlide(6));
    expect(result.current.currentSlide).toBe(0);
  });

  it('goToSlide ignores same slide', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    act(() => result.current.goToSlide(0));
    expect(result.current.isTransitioning).toBe(false);
  });

  it('nextSlide advances by 1, prevSlide goes back by 1', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    act(() => { result.current.nextSlide(); vi.advanceTimersByTime(750); });
    expect(result.current.currentSlide).toBe(1);
    act(() => { result.current.prevSlide(); vi.advanceTimersByTime(750); });
    expect(result.current.currentSlide).toBe(0);
  });

  it('nextSlide does not go past last slide', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    act(() => { result.current.goToSlide(5); vi.advanceTimersByTime(750); });
    act(() => result.current.nextSlide());
    expect(result.current.currentSlide).toBe(5);
  });

  it('prevSlide does not go below 0', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    act(() => result.current.prevSlide());
    expect(result.current.currentSlide).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "useLearnSlides|FAIL|Cannot find"
```
Expected: FAIL — `Cannot find module './useLearnSlides.js'`

- [ ] **Step 3: Create `learnConstants.js`**

Create `frontend/src/pages/learn/learnConstants.js`:

```js
export const STEPS = [
  {
    id: 1,
    difficulty: 'Easy',
    layer: 'First Layer',
    title: 'White Cross',
    desc: 'Start by forming a plus sign (+) on the white face. Match each edge piece\'s second color to the center of its adjacent face.',
    algorithms: [],
    tips: ['Always start with white — it\'s convention.', 'Hold the cube with white center on top.', 'Don\'t worry about corners yet.'],
  },
  {
    id: 2,
    difficulty: 'Easy',
    layer: 'First Layer',
    title: 'White Corners',
    desc: 'Insert the four corner pieces to complete the first layer.',
    algorithms: [{ notation: "R U R' U'", name: 'Right Trigger' }],
    tips: [],
  },
  {
    id: 3,
    difficulty: 'Medium',
    layer: 'Second Layer',
    title: 'Second Layer Edges',
    desc: 'Flip the cube so white is on the bottom. Insert middle-layer edge pieces.',
    algorithms: [
      { notation: "U R U' R' U' F' U F", name: 'Insert Right' },
      { notation: "U' L' U L U F U' F'", name: 'Insert Left' },
    ],
    tips: [],
  },
  {
    id: 4,
    difficulty: 'Medium',
    layer: 'Last Layer',
    title: 'Yellow Cross',
    desc: 'Form a yellow cross on the top face.',
    algorithms: [{ notation: "F R U R' U' F'", name: 'FRU' }],
    tips: [],
  },
  {
    id: 5,
    difficulty: 'Hard',
    layer: 'Last Layer',
    title: 'Yellow Face',
    desc: 'Orient all yellow corners so the entire top face is yellow.',
    algorithms: [{ notation: "R U R' U R U2 R'", name: 'Sune' }],
    tips: [],
  },
  {
    id: 6,
    difficulty: 'Hard',
    layer: 'Last Layer',
    title: 'Position Yellow Corners',
    desc: 'Move yellow corners to their correct positions.',
    algorithms: [{ notation: "U R U' L' U R' U' L", name: 'Corner Swap' }],
    tips: [],
  },
  {
    id: 7,
    difficulty: 'Hard',
    layer: 'Last Layer',
    title: 'Position Yellow Edges',
    desc: 'The final step! Cycle the last-layer edges into place.',
    algorithms: [
      { notation: "R U' R U R U R U' R' U' R2", name: 'CW Cycle' },
      { notation: "R2 U R U R' U' R' U' R' U R'", name: 'CCW Cycle' },
    ],
    tips: [],
  },
];

export const ALGORITHMS = [
  { step: 2, name: 'Right Trigger', notation: "R U R' U'", use: 'Insert white corners' },
  { step: 3, name: 'Insert Right', notation: "U R U' R' U' F' U F", use: 'Edge goes right' },
  { step: 3, name: 'Insert Left', notation: "U' L' U L U F U' F'", use: 'Edge goes left' },
  { step: 4, name: 'FRU', notation: "F R U R' U' F'", use: 'Yellow cross' },
  { step: 5, name: 'Sune', notation: "R U R' U R U2 R'", use: 'Orient yellow corners' },
  { step: 6, name: 'Corner Swap', notation: "U R U' L' U R' U' L", use: 'Position corners' },
  { step: 7, name: 'CW Cycle', notation: "R U' R U R U R U' R' U' R2", use: 'Cycle edges CW' },
  { step: 7, name: 'CCW Cycle', notation: "R2 U R U R' U' R' U' R' U R'", use: 'Cycle edges CCW' },
];
```

- [ ] **Step 4: Create `useLearnSlides.js`**

Create `frontend/src/pages/learn/useLearnSlides.js`:

```js
import { useState, useRef } from 'react';

export function useLearnSlides(totalSlides) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const slidesRef = useRef([]);

  const goToSlide = (index) => {
    if (index < 0 || index >= totalSlides || index === currentSlide || isTransitioning) return;

    setIsTransitioning(true);
    setCurrentSlide(index);

    if (slidesRef.current[index]) {
      slidesRef.current[index].scrollTop = 0;
    }

    setTimeout(() => setIsTransitioning(false), 750);
  };

  const nextSlide = () => goToSlide(currentSlide + 1);
  const prevSlide = () => goToSlide(currentSlide - 1);

  return { currentSlide, isTransitioning, slidesRef, goToSlide, nextSlide, prevSlide };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "useLearnSlides|PASS|FAIL"
```
Expected: all 8 useLearnSlides tests PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/learn/useLearnSlides.js \
        frontend/src/pages/learn/useLearnSlides.test.js \
        frontend/src/pages/learn/learnConstants.js
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "feat: extract useLearnSlides hook and learnConstants"
```

---

## Task 4: Extract Existing Slide Components (Slides 0–2)

**Files:**
- Create: `frontend/src/pages/learn/SlideHero.jsx`
- Create: `frontend/src/pages/learn/SlideOverview.jsx`
- Create: `frontend/src/pages/learn/SlideNotation.jsx`

No tests needed for these — they are pure static presentational components. The existing LearnPage visual regression (running dev server) is sufficient validation.

- [ ] **Step 1: Create `SlideHero.jsx`**

```jsx
// frontend/src/pages/learn/SlideHero.jsx
export default function SlideHero({ onStart, onNotation }) {
  return (
    <div className="slide-inner hero-centered">
      <p className="hero-badge">// Solving Guide</p>
      <h1 className="hero-title">Learn the <span className="gradient-text">Cube</span></h1>
      <p className="hero-subtitle">Follow our visual, beginner-friendly guide to solve the Rubik's Cube from scratch.</p>
      <div className="hero-actions">
        <button className="btn btn-primary" onClick={onStart}>Start Learning</button>
        <button className="btn btn-outline" onClick={onNotation}>Learn Notation</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `SlideOverview.jsx`**

```jsx
// frontend/src/pages/learn/SlideOverview.jsx
export default function SlideOverview() {
  return (
    <div className="slide-inner">
      <div className="section-header">
        <span className="section-tag">Introduction</span>
        <h2 className="section-title">How This Guide Works</h2>
        <p className="section-desc">We break the solve into manageable layers. Each step builds on the last, turning chaos into order one piece at a time.</p>
      </div>
      <div className="overview-grid">
        <div className="overview-card">
          <div className="card-icon">📚</div>
          <h3>Layer-by-Layer</h3>
          <p>Solve the cube one horizontal layer at a time — the most intuitive method for beginners.</p>
        </div>
        <div className="overview-card">
          <div className="card-icon">👁️</div>
          <h3>Visual &amp; Step-by-Step</h3>
          <p>Each step comes with diagrams, animations, and clear algorithm notation so you never feel lost.</p>
        </div>
        <div className="overview-card">
          <div className="card-icon">🎮</div>
          <h3>Practice in the Simulator</h3>
          <p>Try each algorithm in the companion 3D simulator. Experiment, undo, and build muscle memory.</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `SlideNotation.jsx`**

```jsx
// frontend/src/pages/learn/SlideNotation.jsx
const FACE_MOVES = [
  { letter: 'R', label: 'Right' },
  { letter: 'L', label: 'Left' },
  { letter: 'U', label: 'Up' },
  { letter: 'D', label: 'Down' },
  { letter: 'F', label: 'Front' },
  { letter: 'B', label: 'Back' },
  { letter: 'M', label: 'Middle (between R and L)' },
  { letter: 'E', label: 'Equator (between U and D)' },
  { letter: 'S', label: 'Standing (between F and B)' },
];

const MODIFIERS = [
  { code: 'R', desc: 'Clockwise 90° turn of the right face' },
  { code: "R'", desc: 'Counter-clockwise 90° turn ("R prime")' },
  { code: 'R2', desc: '180° turn (direction doesn\'t matter)' },
];

export default function SlideNotation() {
  return (
    <div className="slide-inner">
      <div className="section-header">
        <span className="section-tag">Fundamentals</span>
        <h2 className="section-title">Cube Notation</h2>
        <p className="section-desc">Before we start solving, learn the shorthand that describes every possible move on the cube.</p>
      </div>
      <div className="notation-layout">
        <div className="notation-group">
          <h3 className="notation-group-title">Face Moves</h3>
          <p className="notation-group-desc">Each letter represents a 90° clockwise turn of that face. Add ' for counter-clockwise, or 2 for 180°.</p>
          <div className="notation-grid">
            {FACE_MOVES.map(({ letter, label }) => (
              <div key={letter} className="notation-tile">
                <span className="move-letter">{letter}</span>
                <span className="move-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="notation-group">
          <h3 className="notation-group-title">Modifiers</h3>
          <p className="notation-group-desc">Combine face letters with these modifiers to describe every possible move.</p>
          <div className="modifier-list">
            {MODIFIERS.map(({ code, desc }) => (
              <div key={code} className="modifier-item">
                <code>{code}</code>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/learn/SlideHero.jsx \
        frontend/src/pages/learn/SlideOverview.jsx \
        frontend/src/pages/learn/SlideNotation.jsx
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "feat: extract SlideHero, SlideOverview, SlideNotation components"
```

---

## Task 5: New Slide — `SlideStepByStep.jsx`

**Files:**
- Create: `frontend/src/pages/learn/SlideStepByStep.jsx`
- Create: `frontend/src/pages/learn/SlideStepByStep.test.jsx`

This slide is ported from `dictators-website/website-learnpage/index.html` slide 3. It renders the 7-step timeline using `STEPS` from `learnConstants.js`.

- [ ] **Step 1: Write failing tests**

Create `frontend/src/pages/learn/SlideStepByStep.test.jsx`:

```jsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SlideStepByStep from './SlideStepByStep.jsx';

describe('SlideStepByStep', () => {
  it('renders section title', () => {
    render(<SlideStepByStep />);
    expect(screen.getByText('7 Steps to Solved')).toBeTruthy();
  });

  it('renders all 7 step cards', () => {
    render(<SlideStepByStep />);
    expect(screen.getByText('White Cross')).toBeTruthy();
    expect(screen.getByText('White Corners')).toBeTruthy();
    expect(screen.getByText('Second Layer Edges')).toBeTruthy();
    expect(screen.getByText('Yellow Cross')).toBeTruthy();
    expect(screen.getByText('Yellow Face')).toBeTruthy();
    expect(screen.getByText('Position Yellow Corners')).toBeTruthy();
    expect(screen.getByText('Position Yellow Edges')).toBeTruthy();
  });

  it('renders key algorithm for step 2', () => {
    render(<SlideStepByStep />);
    expect(screen.getByText("R U R' U'")).toBeTruthy();
    expect(screen.getByText('Right Trigger')).toBeTruthy();
  });

  it('renders difficulty and layer badges', () => {
    render(<SlideStepByStep />);
    const easyBadges = screen.getAllByText('Easy');
    expect(easyBadges.length).toBe(2);
    const firstLayerBadges = screen.getAllByText('First Layer');
    expect(firstLayerBadges.length).toBe(2);
  });

  it('renders congratulations banner on last step', () => {
    render(<SlideStepByStep />);
    expect(screen.getByText(/congratulations/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "SlideStepByStep|Cannot find"
```
Expected: FAIL — `Cannot find module './SlideStepByStep.jsx'`

- [ ] **Step 3: Create `SlideStepByStep.jsx`**

```jsx
// frontend/src/pages/learn/SlideStepByStep.jsx
import { STEPS } from './learnConstants.js';

const DIFFICULTY_CLASS = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };

export default function SlideStepByStep() {
  return (
    <div className="slide-inner">
      <div className="section-header">
        <span className="section-tag">The Method</span>
        <h2 className="section-title">7 Steps to Solved</h2>
        <p className="section-desc">Follow each step in order. By the end, you'll have a fully solved cube.</p>
      </div>
      <div className="steps-timeline">
        {STEPS.map((step, i) => (
          <article key={step.id} className="step-card" id={`step-${step.id}`}>
            <div className="step-marker">
              <span className="step-number">{step.id}</span>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
            <div className="step-body">
              <div className="step-meta">
                <span className={`step-difficulty ${DIFFICULTY_CLASS[step.difficulty]}`}>{step.difficulty}</span>
                <span className="step-layer">{step.layer}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
              {step.algorithms.length > 0 && (
                <div className="step-algorithm">
                  <h4>Key Algorithm{step.algorithms.length > 1 ? 's' : ''}</h4>
                  {step.algorithms.map((algo) => (
                    <div key={algo.name} className="algo-display">
                      <code>{algo.notation}</code>
                      <span className="algo-name">{algo.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {step.tips.length > 0 && (
                <div className="step-tips">
                  <h4>Tips</h4>
                  <ul>{step.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                </div>
              )}
              {step.id === 7 && (
                <div className="step-complete-banner">🎉 Congratulations — the cube is solved!</div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add required CSS classes for step timeline to `LearnPage.css`**

Append to the end of `frontend/src/pages/learn/LearnPage.css`:

```css
/* Step-by-step timeline */
.steps-timeline { display: flex; flex-direction: column; gap: 0; max-width: 720px; margin: 0 auto; }
.step-card { display: flex; gap: 20px; padding-bottom: 32px; }
.step-marker { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.step-number { width: 36px; height: 36px; border-radius: 50%; background: #dc2626; color: #fff; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: .85rem; font-weight: 700; flex-shrink: 0; }
.step-line { flex: 1; width: 2px; background: rgba(220,38,38,.2); margin-top: 8px; min-height: 32px; }
.step-body { flex: 1; padding-top: 6px; }
.step-meta { display: flex; gap: 8px; margin-bottom: 8px; }
.step-difficulty { font-size: .7rem; font-family: monospace; text-transform: uppercase; letter-spacing: .05em; padding: 2px 8px; border-radius: 4px; }
.step-difficulty.easy { background: rgba(34,197,94,.15); color: #22c55e; }
.step-difficulty.medium { background: rgba(234,179,8,.15); color: #eab308; }
.step-difficulty.hard { background: rgba(220,38,38,.15); color: #dc2626; }
.step-layer { font-size: .7rem; font-family: monospace; text-transform: uppercase; letter-spacing: .05em; color: #888; padding: 2px 8px; }
.step-body h3 { margin: 0 0 8px; font-size: 1.1rem; font-weight: 600; }
.step-body p { margin: 0 0 12px; font-size: .9rem; color: #888; line-height: 1.6; }
.step-algorithm { margin-top: 12px; padding: 12px; background: rgba(220,38,38,.08); border: 1px solid rgba(220,38,38,.2); border-radius: 8px; }
.step-algorithm h4 { margin: 0 0 8px; font-size: .75rem; font-family: monospace; text-transform: uppercase; letter-spacing: .08em; color: #dc2626; }
.algo-display { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.algo-display:last-child { margin-bottom: 0; }
.algo-display code { font-family: monospace; font-size: .95rem; color: #f5f5f5; background: rgba(255,255,255,.06); padding: 4px 10px; border-radius: 4px; }
.algo-name { font-size: .75rem; color: #888; }
.step-tips { margin-top: 12px; }
.step-tips h4 { margin: 0 0 6px; font-size: .75rem; font-family: monospace; text-transform: uppercase; letter-spacing: .08em; color: #888; }
.step-tips ul { margin: 0; padding-left: 20px; }
.step-tips li { font-size: .85rem; color: #888; line-height: 1.7; }
.step-complete-banner { margin-top: 16px; padding: 12px 16px; background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.25); border-radius: 8px; font-family: monospace; font-size: .85rem; color: #22c55e; }
```

- [ ] **Step 5: Run tests to verify pass**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "SlideStepByStep|PASS|FAIL"
```
Expected: all 5 SlideStepByStep tests PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/learn/SlideStepByStep.jsx \
        frontend/src/pages/learn/SlideStepByStep.test.jsx \
        frontend/src/pages/learn/LearnPage.css
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "feat: add SlideStepByStep component - 7-step solve method from companion site"
```

---

## Task 6: New Slide — `SlideAlgorithms.jsx`

**Files:**
- Create: `frontend/src/pages/learn/SlideAlgorithms.jsx`
- Create: `frontend/src/pages/learn/SlideAlgorithms.test.jsx`

This slide is ported from `dictators-website/website-learnpage/index.html` slide 4. It renders the algorithm cheat sheet table using `ALGORITHMS` from `learnConstants.js`. Includes copy-to-clipboard on each algorithm row.

- [ ] **Step 1: Write failing tests**

Create `frontend/src/pages/learn/SlideAlgorithms.test.jsx`:

```jsx
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SlideAlgorithms from './SlideAlgorithms.jsx';

describe('SlideAlgorithms', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders section title', () => {
    render(<SlideAlgorithms onCopy={() => {}} />);
    expect(screen.getByText('Algorithm Cheat Sheet')).toBeTruthy();
  });

  it('renders all 8 algorithms', () => {
    render(<SlideAlgorithms onCopy={() => {}} />);
    expect(screen.getByText('Right Trigger')).toBeTruthy();
    expect(screen.getByText('Insert Right')).toBeTruthy();
    expect(screen.getByText('Insert Left')).toBeTruthy();
    expect(screen.getByText('FRU')).toBeTruthy();
    expect(screen.getByText('Sune')).toBeTruthy();
    expect(screen.getByText('Corner Swap')).toBeTruthy();
    expect(screen.getByText('CW Cycle')).toBeTruthy();
    expect(screen.getByText('CCW Cycle')).toBeTruthy();
  });

  it('renders algorithm notation as code elements', () => {
    render(<SlideAlgorithms onCopy={() => {}} />);
    expect(screen.getByText("R U R' U'")).toBeTruthy();
    expect(screen.getByText("F R U R' U' F'")).toBeTruthy();
  });

  it('calls onCopy with notation when row is clicked', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(<SlideAlgorithms onCopy={onCopy} />);
    const rightTriggerCode = screen.getByText("R U R' U'");
    await user.click(rightTriggerCode);
    expect(onCopy).toHaveBeenCalledWith("R U R' U'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "SlideAlgorithms|Cannot find"
```
Expected: FAIL — `Cannot find module './SlideAlgorithms.jsx'`

- [ ] **Step 3: Create `SlideAlgorithms.jsx`**

```jsx
// frontend/src/pages/learn/SlideAlgorithms.jsx
import { ALGORITHMS } from './learnConstants.js';

export default function SlideAlgorithms({ onCopy }) {
  return (
    <div className="slide-inner">
      <div className="section-header">
        <span className="section-tag">Quick Reference</span>
        <h2 className="section-title">Algorithm Cheat Sheet</h2>
        <p className="section-desc">All the algorithms you need in one place. Click any algorithm to copy it.</p>
      </div>
      <div className="algo-table-wrap">
        <table className="algo-table">
          <thead>
            <tr>
              <th>Step</th>
              <th>Name</th>
              <th>Algorithm</th>
              <th>Use Case</th>
            </tr>
          </thead>
          <tbody>
            {ALGORITHMS.map((algo) => (
              <tr key={algo.name}>
                <td><span className="step-badge">{algo.step}</span></td>
                <td>{algo.name}</td>
                <td>
                  <code
                    className="copyable"
                    onClick={() => onCopy(algo.notation)}
                    style={{ cursor: 'pointer' }}
                  >
                    {algo.notation}
                  </code>
                </td>
                <td>{algo.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add algorithm table CSS to `LearnPage.css`**

Append to the end of `frontend/src/pages/learn/LearnPage.css`:

```css
/* Algorithm cheat sheet table */
.algo-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,.06); }
.algo-table { width: 100%; border-collapse: collapse; font-size: .9rem; }
.algo-table thead tr { border-bottom: 1px solid rgba(255,255,255,.08); }
.algo-table th { padding: 12px 16px; text-align: left; font-family: monospace; font-size: .7rem; text-transform: uppercase; letter-spacing: .1em; color: #888; font-weight: 500; }
.algo-table td { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.04); vertical-align: middle; }
.algo-table tbody tr:last-child td { border-bottom: none; }
.algo-table tbody tr:hover { background: rgba(255,255,255,.02); }
.algo-table code.copyable:hover { background: rgba(220,38,38,.15); color: #dc2626; }
.algo-table code { font-family: monospace; font-size: .9rem; background: rgba(255,255,255,.06); padding: 3px 8px; border-radius: 4px; transition: background .15s, color .15s; }
.step-badge { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(220,38,38,.15); color: #dc2626; font-family: monospace; font-size: .75rem; font-weight: 700; }
```

- [ ] **Step 5: Run tests to verify pass**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "SlideAlgorithms|PASS|FAIL"
```
Expected: all 4 SlideAlgorithms tests PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/learn/SlideAlgorithms.jsx \
        frontend/src/pages/learn/SlideAlgorithms.test.jsx \
        frontend/src/pages/learn/LearnPage.css
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "feat: add SlideAlgorithms component - algorithm cheat sheet from companion site"
```

---

## Task 7: Extract `SlideResources.jsx`

**Files:**
- Create: `frontend/src/pages/learn/SlideResources.jsx`

- [ ] **Step 1: Create `SlideResources.jsx`**

```jsx
// frontend/src/pages/learn/SlideResources.jsx
import { useNavigate } from 'react-router-dom';

const RESOURCES = [
  { type: 'Guide', title: "Beginner's Full Tutorial", desc: 'A comprehensive walkthrough for absolute beginners.', action: (navigate) => navigate('/step-by-step') },
  { type: 'Reference', title: 'OLL Algorithms', desc: 'All 57 OLL cases with diagrams.', action: () => window.open('/OLL_Algorithms.pdf', '_blank') },
  { type: 'Reference', title: 'PLL Algorithms', desc: 'All 21 PLL cases for permuting the last layer.', action: () => window.open('/PLL_Algorithms.pdf', '_blank') },
  { type: 'Diagram', title: 'Color Scheme & Notation Map', desc: 'Visual reference for color placement and notation.', action: () => window.open('/Color_Scheme_Notation_Map.pdf', '_blank') },
];

export default function SlideResources() {
  const navigate = useNavigate();

  return (
    <div className="slide-inner dense">
      <div className="section-header">
        <span className="section-tag">Go Further</span>
        <h2 className="section-title">Additional Resources</h2>
        <p className="section-desc">Guides, diagrams, and reference material to deepen your understanding.</p>
      </div>
      <div className="resources-grid">
        {RESOURCES.map((r) => (
          <div key={r.title} className="resource-card" onClick={() => r.action(navigate)} style={{ cursor: 'pointer' }}>
            <div className="resource-info">
              <span className="resource-type">{r.type}</span>
              <h3>{r.title}</h3>
              <p>{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="simulator-cta" onClick={() => navigate('/simulator')} style={{ cursor: 'pointer' }}>
        <h3>Ready to try?</h3>
        <p>Put your skills to the test in the interactive 3D simulator.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/learn/SlideResources.jsx
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "feat: extract SlideResources component"
```

---

## Task 8: Refactor `LearnPage.jsx` to Use All Sub-Components

**Files:**
- Modify: `frontend/src/pages/LearnPage.jsx`

This is the final wiring task. After this, `LearnPage.jsx` should be under 120 lines. The `slides` array and all inline JSX content is replaced with component imports. `totalSlides` changes from 4 to 6.

- [ ] **Step 1: Read current `LearnPage.jsx` to understand its full structure**

Note which parts remain in the orchestrator:
- Theme object (`theme`)
- `copyToClipboard` + `showToastMessage` functions (used by Algorithms slide)
- Touch handlers (swipe navigation)
- The return JSX: wrapper div, slides container, indicators, arrow buttons, toast

- [ ] **Step 2: Write the new `LearnPage.jsx`**

Replace the full content of `frontend/src/pages/LearnPage.jsx` with:

```jsx
/**
 * LearnPage.jsx — /learn route
 *
 * Orchestrator for the learn page slideshow. Each slide is its own component.
 * Navigation state lives in useLearnSlides hook.
 * Static data (steps, algorithms) lives in learnConstants.js.
 */
import { useState, useEffect } from 'react';

import PageNavbar from '../components/PageNavbar';
import { useTheme } from '../context/ThemeContext';
import { useLearnSlides } from './learn/useLearnSlides.js';
import SlideHero from './learn/SlideHero.jsx';
import SlideOverview from './learn/SlideOverview.jsx';
import SlideNotation from './learn/SlideNotation.jsx';
import SlideStepByStep from './learn/SlideStepByStep.jsx';
import SlideAlgorithms from './learn/SlideAlgorithms.jsx';
import SlideResources from './learn/SlideResources.jsx';
import './learn/LearnPage.css';

const TOTAL_SLIDES = 6;

export default function LearnPage() {
  const { isDark } = useTheme();
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const { currentSlide, isTransitioning, slidesRef, goToSlide, nextSlide, prevSlide } = useLearnSlides(TOTAL_SLIDES);

  const theme = {
    bg: isDark ? '#0a0a0a' : '#ffffff',
    text: isDark ? '#f5f5f5' : '#1a1a1a',
  };

  const showToastMessage = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => showToastMessage(`Copied: ${text}`),
      () => showToastMessage('Copy failed'),
    );
  };

  // Touch/swipe handlers
  useEffect(() => {
    let touchStartX = 0;
    const onTouchStart = (e) => { touchStartX = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) dx < 0 ? nextSlide() : prevSlide();
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [nextSlide, prevSlide]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextSlide, prevSlide]);

  const slides = [
    <SlideHero key={0} onStart={() => goToSlide(1)} onNotation={() => goToSlide(2)} />,
    <SlideOverview key={1} />,
    <SlideNotation key={2} />,
    <SlideStepByStep key={3} />,
    <SlideAlgorithms key={4} onCopy={copyToClipboard} />,
    <SlideResources key={5} />,
  ];

  return (
    <div className="learn-page" style={{ backgroundColor: theme.bg, color: theme.text }}>
      <PageNavbar />

      <div className="slides-wrapper" aria-label="Learning guide slides">
        <div
          className={`slides-track${isTransitioning ? ' transitioning' : ''}`}
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <section
              key={i}
              className="slide"
              data-index={i}
              aria-hidden={i !== currentSlide}
              ref={(el) => { slidesRef.current[i] = el; }}
            >
              {slide}
            </section>
          ))}
        </div>
      </div>

      <div className="slide-indicators" aria-label="Slide navigation">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`slide-dot${i === currentSlide ? ' active' : ''}`}
            onClick={() => goToSlide(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      <button
        className="slide-arrow slide-arrow-prev"
        onClick={prevSlide}
        disabled={currentSlide === 0}
        aria-label="Previous slide"
      >‹</button>
      <button
        className="slide-arrow slide-arrow-next"
        onClick={nextSlide}
        disabled={currentSlide === TOTAL_SLIDES - 1}
        aria-label="Next slide"
      >›</button>

      {showToast && (
        <div className="toast-notification" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run all tests**

```bash
cd frontend && npm test 2>&1 | tail -20
```
Expected: all tests pass. Count should be higher than before (new step/algo tests included).

- [ ] **Step 4: Verify dev server**

```bash
cd frontend && npm run dev
```
Open `http://localhost:5400/learn`. Verify:
- 6 slide dots appear at the bottom (was 4)
- Arrow navigation works
- Slide 3 (Step-by-Step) shows 7 step cards
- Slide 4 (Algorithms) shows table with 8 rows
- Clicking an algorithm in slide 4 copies it and shows toast
- Keyboard arrows work
- Swipe works (mobile emulation in browser devtools)

- [ ] **Step 5: Verify file size**

```bash
wc -l frontend/src/pages/LearnPage.jsx
```
Expected: under 120 lines (was 1,370).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/LearnPage.jsx
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "refactor: wire LearnPage orchestrator - 6 slides, all logic in hooks/components"
```

---

## Task 9: Delete `dictators-website/website-learnpage/`

Content fully ported to React. The vanilla directory is now redundant.

**Files:**
- Delete: `dictators-website/website-learnpage/` (entire directory)

- [ ] **Step 1: Verify all 3 vanilla slides are present in React**

Confirm these routes work in the running dev server before deleting:
- `http://localhost:5400/learn` → slide 3 shows 7 step cards, slide 4 shows algo table

- [ ] **Step 2: Delete the directory**

```bash
rm -rf dictators-website/website-learnpage
```

- [ ] **Step 3: Verify no imports reference the deleted path**

```bash
grep -r "website-learnpage" frontend/src/ --include="*.jsx" --include="*.js"
```
Expected: no output (nothing imports it).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "chore: remove vanilla website-learnpage dir - content fully ported to React"
```

---

## Task 10: Run Lint + Full Test Suite + Push

- [ ] **Step 1: Full lint check**

```bash
cd frontend && npm run lint
```
Expected: exits 0. Fix any issues before proceeding.

- [ ] **Step 2: Full test suite**

```bash
cd frontend && npm test
```
Expected: all tests pass.

- [ ] **Step 3: Push to personal GitHub**

```bash
git push github main
```

---

## Self-Review

### Spec Coverage

| Requirement | Task | Status |
|---|---|---|
| `npm run lint` in CI | Task 1 | ✓ |
| LearnPage decomposed into sub-components | Tasks 4–8 | ✓ |
| CSS extracted from inline block | Task 2 | ✓ |
| useLearnSlides hook extracted + tested | Task 3 | ✓ |
| SlideStepByStep (vanilla slide 3) ported | Task 5 | ✓ |
| SlideAlgorithms (vanilla slide 4) ported | Task 6 | ✓ |
| SlideResources extracted | Task 7 | ✓ |
| LearnPage.jsx under 120 lines | Task 8 | ✓ |
| ALGORITHMS data in learnConstants | Task 3 | ✓ |
| STEPS data in learnConstants | Task 3 | ✓ |

### Placeholder Scan
- No TBD, TODO, or "implement later" ✓
- All code blocks contain complete code ✓
- All test files shown before implementation ✓
- All commands include expected output ✓

### Type Consistency
- `useLearnSlides(totalSlides)` — used with `TOTAL_SLIDES` (6) in Task 8 ✓
- `STEPS` and `ALGORITHMS` exported from `learnConstants.js`, imported in slide components ✓
- `goToSlide`, `nextSlide`, `prevSlide`, `currentSlide`, `isTransitioning`, `slidesRef` — all returned by hook, all consumed in LearnPage ✓
- `onCopy` prop on `SlideAlgorithms` — provided in LearnPage, tested in SlideAlgorithms tests ✓
- `onStart`, `onNotation` props on `SlideHero` — provided in LearnPage ✓

---

**Note:** `dictators-website/website-learnpage/` is deleted in Task 9 after all content is ported.
