# Guided Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the read-only StepByStepPage with an interactive guided simulator that combines the solving guide (text + GIFs + algorithm buttons) with a live 3D Rubik's Cube.

**Architecture:** Rewrite `StepByStepPage.jsx` as a side-by-side layout — guide panel on the left, 3D interactive cube on the right. All cube logic is imported from existing `pages/simulator/` hooks and components (no duplication). The `STEPS` data array gains an `algorithms` field; clickable algorithm pills call `enqueueMoves()` to animate moves on the live cube.

**Tech Stack:** React, Three.js (@react-three/fiber), Tailwind CSS, existing simulator hooks (useSimulatorQueue, useCubeControls)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/pages/StepByStepPage.jsx` | Rewrite | Page shell: cube state ownership, hook wiring, side-by-side layout, responsive breakpoints |
| `frontend/src/pages/step-by-step/GuidePanel.jsx` | Create | Left panel: step text, GIF, algorithm buttons, prev/next nav, progress dots |
| `frontend/src/pages/step-by-step/stepsData.js` | Create | `STEPS` array with `algorithms` field per step, `CDN` constant |

No changes to any file in `pages/simulator/` — all reused as-is via imports.

---

### Task 1: Extract STEPS data into its own module

**Files:**
- Create: `frontend/src/pages/step-by-step/stepsData.js`

- [ ] **Step 1: Create the stepsData.js file**

Move the `STEPS` array and `CDN` constant out of `StepByStepPage.jsx` into a dedicated data module. Add the `algorithms` field to every step entry. Each algorithm has a `label` (human name) and `moves` (notation string).

```js
// frontend/src/pages/step-by-step/stepsData.js
export const CDN = 'https://raw.githubusercontent.com/Ofunrein/cube-solving-guide-gifs/main';

export const STEPS = [
  {
    step: 0,
    title: 'Introduction',
    subtitle: 'Notation & Terminology',
    text: `This guide walks you through solving a 3×3 Rubik's Cube using the beginner layer-by-layer method.\n\n"Tiles" are the 9 colored squares on each face. "Pieces" are the physical cubies they sit on. Corner pieces have 3 tiles; edge pieces have 2. The center tile determines a face's color.\n\nNotation: U (Up), D (Down), L (Left), R (Right), F (Front), B (Back). An apostrophe (') means counterclockwise. A "2" means turn twice.`,
    gif: null,
    algorithms: [],
  },
  {
    step: 1,
    title: 'Step 1',
    subtitle: 'The Daisy',
    text: `Form a "daisy" by moving all four white edge tiles next to the yellow center tile. There's no specific algorithm — just move white edges to the top face without displacing ones already in place. Corner colors don't matter yet.`,
    gif: `${CDN}/Daisy.gif`,
    algorithms: [],
  },
  {
    step: 2,
    title: 'Step 2',
    subtitle: 'The White Cross',
    text: `With the daisy formed, look at the other color on each white edge piece. Rotate the top layer until that side color matches the center tile of its side face. Then rotate that side face twice (e.g. F2) to send the white edge down.`,
    gif: `${CDN}/White_Cross_From_Daisy.gif`,
    algorithms: [],
  },
  {
    step: 2,
    title: 'Step 2',
    subtitle: 'White Cross — Result',
    text: `You should now have a white cross on the bottom with each edge's side color matching the center tile of its face.`,
    gif: `${CDN}/White_Cross_Solved.gif`,
    algorithms: [],
  },
  {
    step: 3,
    title: 'Step 3',
    subtitle: 'First Layer — Corner Insert',
    text: `Flip the cube so white is on the bottom. Find a white corner tile on the top row of a side face. Rotate the top layer until the other side color matches a center tile. Then insert:\n\n• Right side: R U R'\n• Left side: L' U' L`,
    gif: `${CDN}/First_Layer_Tile_Insert.gif`,
    algorithms: [
      { label: 'Right insert', moves: "R U R'" },
      { label: 'Left insert', moves: "L' U' L" },
    ],
  },
  {
    step: 3,
    title: 'Step 3',
    subtitle: 'First Layer — Bottom Row Tile',
    text: `If a white tile is stuck in the bottom row instead of the top, move it up first:\n\n• Right side: R U' R'\n• Left side: L' U L\n\nThen use the normal insertion algorithm.`,
    gif: `${CDN}/First_Layer_Bottom_Row_Tile.gif`,
    algorithms: [
      { label: 'Right bump up', moves: "R U' R'" },
      { label: 'Left bump up', moves: "L' U L" },
    ],
  },
  {
    step: 3,
    title: 'Step 3',
    subtitle: 'First Layer — Top Face Tile',
    text: `If the white tile is on the top face, rotate the top layer until it's above an unsolved corner. Then:\n\n• Right side: R U2 R'\n• Left side: L' U2 L\n\nThis moves it to the top row so you can insert normally.`,
    gif: `${CDN}/First_Layer_Top_Tile.gif`,
    algorithms: [
      { label: 'Right drop', moves: "R U2 R'" },
      { label: 'Left drop', moves: "L' U2 L" },
    ],
  },
  {
    step: 3,
    title: 'Step 3',
    subtitle: 'First Layer — Result',
    text: `After inserting all four white corner pieces, you should have a solved white face and a complete first layer.`,
    gif: `${CDN}/First_Layer_Solved.gif`,
    algorithms: [],
  },
  {
    step: 4,
    title: 'Step 4',
    subtitle: 'Second Layer — Right Insert',
    text: `Find a non-yellow edge piece in the top layer. Line up the side color with its matching center tile. If the top color matches the right side:\n\nU R U' R' U' F' U F`,
    gif: `${CDN}/Second_Layer_Right_Insert.gif`,
    algorithms: [
      { label: 'Right insert', moves: "U R U' R' U' F' U F" },
    ],
  },
  {
    step: 4,
    title: 'Step 4',
    subtitle: 'Second Layer — Left Insert',
    text: `If the top color matches the left side:\n\nU' L' U L U F U' F'`,
    gif: `${CDN}/Second_Layer_Left_Insert.gif`,
    algorithms: [
      { label: 'Left insert', moves: "U' L' U L U F U' F'" },
    ],
  },
  {
    step: 4,
    title: 'Step 4',
    subtitle: 'Second Layer — Mismatch Fix',
    text: `If all top-layer edges have yellow but the second layer isn't solved, you have a mismatch. "Boot" the misplaced edge by inserting any other edge into its spot using the left/right algorithm. The mismatched piece goes to the top layer where you can re-insert it correctly.`,
    gif: `${CDN}/Second_Layer_Mismatch.gif`,
    algorithms: [
      { label: 'Boot right', moves: "U R U' R' U' F' U F" },
      { label: 'Boot left', moves: "U' L' U L U F U' F'" },
    ],
  },
  {
    step: 4,
    title: 'Step 4',
    subtitle: 'Second Layer — Result',
    text: `With all four non-yellow edge pieces correctly inserted, the second layer is solved.`,
    gif: `${CDN}/Second_Layer_Solved.gif`,
    algorithms: [],
  },
  {
    step: 5,
    title: 'Step 5',
    subtitle: 'Yellow Cross — Dot',
    text: `Time to make a yellow cross on top. The only algorithm you need is the "dog algorithm":\n\nF U R U' R' F'\n\n(FUR-URF, like a dog's fur and bark!)\n\nIf you have a yellow dot (no yellow edges on top), just perform the algorithm.`,
    gif: `${CDN}/Yellow_Cross_Dot.gif`,
    algorithms: [
      { label: 'Dog algorithm', moves: "F U R U' R' F'" },
    ],
  },
  {
    step: 5,
    title: 'Step 5',
    subtitle: 'Yellow Cross — Bar',
    text: `If you have a yellow bar (two opposite yellow edges), orient it left-to-right, then perform:\n\nF U R U' R' F'`,
    gif: `${CDN}/Yellow_Cross_Bar.gif`,
    algorithms: [
      { label: 'Dog algorithm', moves: "F U R U' R' F'" },
    ],
  },
  {
    step: 5,
    title: 'Step 5',
    subtitle: 'Yellow Cross — Crescent',
    text: `If you have a yellow crescent (two perpendicular yellow edges), orient them pointing up-and-left, then perform:\n\nF U R U' R' F'`,
    gif: `${CDN}/Yellow_Cross_Crescent.gif`,
    algorithms: [
      { label: 'Dog algorithm', moves: "F U R U' R' F'" },
    ],
  },
  {
    step: 6,
    title: 'Step 6',
    subtitle: 'Yellow Face — Cross Pattern',
    text: `Now solve the entire yellow face using the "spinning algorithm":\n\nR U R' U R U2 R'\n\nIf you have no yellow corners on top (cross pattern), move the top layer so a yellow corner is on the left face, then perform the algorithm.`,
    gif: `${CDN}/Top_Face_Cross.gif`,
    algorithms: [
      { label: 'Spinning algorithm', moves: "R U R' U R U2 R'" },
    ],
  },
  {
    step: 6,
    title: 'Step 6',
    subtitle: 'Yellow Face — Tank Pattern',
    text: `If two yellow corners are on the same side (tank pattern), position the yellow corner tile on the top-left of the front face, then:\n\nR U R' U R U2 R'`,
    gif: `${CDN}/Top_Face_Tank.gif`,
    algorithms: [
      { label: 'Spinning algorithm', moves: "R U R' U R U2 R'" },
    ],
  },
  {
    step: 6,
    title: 'Step 6',
    subtitle: 'Yellow Face — Figure-8 Pattern',
    text: `If two yellow corners are diagonally opposite (figure-8), position a yellow corner on the top-left of the front face, then:\n\nR U R' U R U2 R'`,
    gif: `${CDN}/Top_Face_Figure8.gif`,
    algorithms: [
      { label: 'Spinning algorithm', moves: "R U R' U R U2 R'" },
    ],
  },
  {
    step: 6,
    title: 'Step 6',
    subtitle: 'Yellow Face — Fish Pattern',
    text: `If one yellow corner is on top (fish pattern), make the fish point down-and-left, then:\n\nR U R' U R U2 R'\n\nIf you get the fish again, orient it down-and-right and repeat.`,
    gif: `${CDN}/Top_Face_Fish.gif`,
    algorithms: [
      { label: 'Spinning algorithm', moves: "R U R' U R U2 R'" },
    ],
  },
  {
    step: 7,
    title: 'Step 7',
    subtitle: 'Third Layer Corners — Opposites',
    text: `Position the yellow corner pieces correctly using the "double-back algorithm":\n\nR' F R' B2 R F' R' B2 R2\n\nRotate the top layer until two corners match their side colors. If the correct corners are diagonally opposite, just perform the algorithm.`,
    gif: `${CDN}/Corner_Solve_Opposites.gif`,
    algorithms: [
      { label: 'Double-back algorithm', moves: "R' F R' B2 R F' R' B2 R2" },
    ],
  },
  {
    step: 7,
    title: 'Step 7',
    subtitle: 'Third Layer Corners — Tail Lights',
    text: `If the two correct corners are on the same side (like taillights on a car), put them at the back, then:\n\nR' F R' B2 R F' R' B2 R2\n\nAfterward, rotate the top layer to align all corners.`,
    gif: `${CDN}/Corner_Solve_Tail_Lights.gif`,
    algorithms: [
      { label: 'Double-back algorithm', moves: "R' F R' B2 R F' R' B2 R2" },
    ],
  },
  {
    step: 8,
    title: 'Step 8',
    subtitle: 'Final Edges — No Solved Face',
    text: `Last step! Position the final edge pieces using the "front flipper algorithm":\n\nF2 U L R' F2 L' R U F2\n\nIf no side face is fully solved, just perform the algorithm.`,
    gif: `${CDN}/Last_Edges_No_Solved_Side_Face.gif`,
    algorithms: [
      { label: 'Front flipper', moves: "F2 U L R' F2 L' R U F2" },
    ],
  },
  {
    step: 8,
    title: 'Step 8',
    subtitle: 'Final Edges — Solved Face',
    text: `If one side face is solved, move it to the back, then:\n\nF2 U L R' F2 L' R U F2\n\nIf not solved yet, perform the algorithm again.`,
    gif: `${CDN}/Last_Edges_Solved_Side_Face_Part1.gif`,
    algorithms: [
      { label: 'Front flipper', moves: "F2 U L R' F2 L' R U F2" },
    ],
  },
  {
    step: 8,
    title: 'Step 8',
    subtitle: 'Final Edges — Repeat',
    text: `Sometimes you need to repeat the front flipper algorithm a second time. That's normal.`,
    gif: `${CDN}/Last_Edges_Solved_Side_Face_Part2.gif`,
    algorithms: [
      { label: 'Front flipper', moves: "F2 U L R' F2 L' R U F2" },
    ],
  },
  {
    step: 8,
    title: 'Congratulations!',
    subtitle: 'Cube Solved',
    text: `You've solved the Rubik's Cube! With practice, you'll memorize these algorithms and solve faster each time. Head to the simulator to practice.`,
    gif: `${CDN}/Solved_Cube.gif`,
    algorithms: [],
  },
];

export const TOTAL_STEPS = 8;
```

- [ ] **Step 2: Verify the file is importable**

Run: `cd /Users/martinofunrein/Downloads/the-dictators/frontend && node -e "import('./src/pages/step-by-step/stepsData.js').then(m => console.log(m.STEPS.length + ' steps, ' + m.STEPS.filter(s => s.algorithms.length > 0).length + ' with algorithms')).catch(e => console.error(e.message))"`

Expected: `25 steps, 19 with algorithms`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/step-by-step/stepsData.js
git commit -m "feat(learn): extract STEPS data with algorithms field"
```

---

### Task 2: Build the GuidePanel component

**Files:**
- Create: `frontend/src/pages/step-by-step/GuidePanel.jsx`

- [ ] **Step 1: Create GuidePanel.jsx**

This component receives the current step data, navigation callbacks, and a callback to enqueue algorithm moves. It renders the step header, GIF, text, algorithm buttons, and prev/next navigation.

```jsx
// frontend/src/pages/step-by-step/GuidePanel.jsx
import { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { TOTAL_STEPS } from './stepsData';

function parseAlgorithmMoves(movesStr) {
  return movesStr.split(/\s+/).filter(Boolean);
}

export default function GuidePanel({
  currentStep,
  currentIndex,
  totalSlides,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onApplyAlgorithm,
  queueActive,
  isDark,
  onNavigateSimulator,
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  const cardBg = isDark ? 'bg-[#111] border-white/8' : 'bg-white border-dictator-ink/10';
  const muted = isDark ? 'text-white/50' : 'text-dictator-ink/50';
  const textBody = isDark ? 'text-white/80' : 'text-dictator-ink/80';
  const navBtn = isDark
    ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
    : 'border-dictator-ink/15 bg-white text-dictator-ink/60 hover:bg-dictator-ink/5 hover:text-dictator-ink';
  const navBtnDisabled = isDark
    ? 'border-white/5 bg-white/[0.02] text-white/15 cursor-not-allowed'
    : 'border-dictator-ink/8 bg-dictator-ink/[0.02] text-dictator-ink/15 cursor-not-allowed';
  const dotActive = 'bg-dictator-red';
  const dotInactive = isDark ? 'bg-white/15' : 'bg-dictator-ink/15';

  const isLastSlide = currentIndex === totalSlides - 1;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Progress bar */}
      <div className={`h-0.5 shrink-0 ${isDark ? 'bg-white/5' : 'bg-dictator-ink/5'}`}>
        <div
          className="h-full bg-dictator-red transition-all duration-500 ease-out"
          style={{ width: `${((currentIndex + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {/* Step header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-dictator-red mb-1">
              {currentStep.title}
            </p>
            <h2 className={`font-heading text-lg tracking-tight ${isDark ? 'text-white' : 'text-dictator-ink'}`}>
              {currentStep.subtitle}
            </h2>
          </div>
          <p className={`font-mono text-[11px] shrink-0 ${muted}`}>
            {currentIndex + 1} / {totalSlides}
          </p>
        </div>

        {/* GIF */}
        {currentStep.gif ? (
          <div className={`relative rounded-xl overflow-hidden ${isDark ? 'bg-black/30' : 'bg-dictator-ink/[0.03]'}`}
            style={{ minHeight: '140px' }}
          >
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-dictator-red/30 border-t-dictator-red rounded-full animate-spin" />
              </div>
            )}
            <img
              key={currentStep.gif}
              src={currentStep.gif}
              alt={currentStep.subtitle}
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-auto rounded-xl transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>
        ) : (
          <div className={`flex items-center justify-center rounded-xl p-6 ${isDark ? 'bg-black/30' : 'bg-dictator-ink/[0.03]'}`}>
            <RotateCcw size={36} className="text-dictator-red/30" />
          </div>
        )}

        {/* Text */}
        <div>
          {currentStep.text.split('\n\n').map((para, i) => (
            <p key={i} className={`font-body text-sm leading-relaxed mb-2.5 last:mb-0 ${textBody}`}>
              {para.split('\n').map((line, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          ))}
        </div>

        {/* Algorithm buttons */}
        {currentStep.algorithms.length > 0 && (
          <div className="space-y-2">
            <p className={`font-mono text-[10px] uppercase tracking-widest ${muted}`}>
              Try it on the cube
            </p>
            <div className="flex flex-wrap gap-2">
              {currentStep.algorithms.map((alg, i) => (
                <button
                  key={i}
                  onClick={() => onApplyAlgorithm(parseAlgorithmMoves(alg.moves))}
                  disabled={queueActive}
                  className={`rounded-lg border px-3 py-2 font-mono text-xs transition-all ${
                    queueActive
                      ? 'border-white/5 text-white/20 cursor-not-allowed'
                      : 'border-dictator-red/30 bg-dictator-red/10 text-dictator-red hover:bg-dictator-red/20 hover:border-dictator-red/50 active:scale-95'
                  }`}
                >
                  <span className="block font-bold">{alg.moves}</span>
                  <span className={`block text-[10px] mt-0.5 ${queueActive ? 'text-white/10' : 'text-dictator-red/60'}`}>
                    {alg.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation — pinned at bottom */}
      <div className={`shrink-0 border-t px-4 py-3 flex items-center justify-between ${isDark ? 'border-white/5' : 'border-dictator-ink/10'}`}>
        {/* Step dots */}
        <div className="flex items-center gap-1">
          {Array.from({ length: TOTAL_STEPS + 2 }).map((_, i) => {
            const stepNum = i - 1;
            const isCurrentStep = currentStep.step === stepNum
              || (i === 0 && currentStep.step === 0)
              || (i === TOTAL_STEPS + 1 && isLastSlide);
            return (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  isCurrentStep ? `w-4 h-1.5 ${dotActive}` : `w-1.5 h-1.5 ${dotInactive}`
                }`}
              />
            );
          })}
        </div>

        {/* Prev / Next */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={!canPrev}
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all ${
              canPrev ? navBtn : navBtnDisabled
            }`}
          >
            <ChevronLeft size={12} />
            Prev
          </button>
          {isLastSlide ? (
            <button
              onClick={onNavigateSimulator}
              className="flex items-center gap-1 rounded-full bg-dictator-red text-white px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest hover:bg-dictator-deep transition-colors"
            >
              Free Solve
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!canNext}
              className={`flex items-center gap-1 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all ${
                canNext ? navBtn : navBtnDisabled
              }`}
            >
              Next
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Reset imgLoaded when currentStep changes**

The `useState(false)` for `imgLoaded` needs to reset when the step changes. Add this effect at the top of the component body (after the `useState` call):

```jsx
// Add inside GuidePanel, after const [imgLoaded, setImgLoaded] = useState(false);
import { useState, useEffect } from 'react';

// ... inside the component:
useEffect(() => {
  setImgLoaded(false);
}, [currentStep.gif]);
```

Update the import line at the top to include `useEffect`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/step-by-step/GuidePanel.jsx
git commit -m "feat(learn): add GuidePanel component with GIFs and algorithm buttons"
```

---

### Task 3: Rewrite StepByStepPage with the guided simulator

**Files:**
- Rewrite: `frontend/src/pages/StepByStepPage.jsx`

This is the main task. The page wires together the GuidePanel on the left and the 3D interactive cube on the right, using the same hooks as SimulatorPage.

- [ ] **Step 1: Rewrite StepByStepPage.jsx**

```jsx
// frontend/src/pages/StepByStepPage.jsx
/**
 * StepByStepPage.jsx — /step-by-step route — Guided simulator
 *
 * Interactive solving guide: guide panel (text + GIFs + algorithm buttons)
 * on the left, live 3D Rubik's Cube on the right. Users can click algorithm
 * buttons to apply moves, or manually turn the cube via drag/keyboard.
 *
 * Reuses all simulator engine components from pages/simulator/:
 *   useSimulatorQueue, useCubeControls, InteractiveCube, etc.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { useTheme } from '../context/ThemeContext';
import { CubeState } from '../cube/CubeState';
import { FACE_ORDER, getKeyMap } from './simulator/simulatorConstants';
import { useSimulatorQueue } from './simulator/useSimulatorQueue';
import { useCubeControls } from './simulator/useCubeControls';
import { getThemeClasses } from './simulator/simulatorTheme';
import {
  InteractiveCube,
  ResponsiveSceneCamera,
  SimulatorCanvasBoundary,
} from './simulator/InteractiveCube';

import GuidePanel from './step-by-step/GuidePanel';
import { STEPS } from './step-by-step/stepsData';

const CUBE_SIZE = 3;

export default function StepByStepPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const t = getThemeClasses(isDark);

  // Step navigation
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = STEPS[currentIndex];
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < STEPS.length - 1;

  const goNext = useCallback(() => {
    if (canNext) setCurrentIndex((i) => i + 1);
  }, [canNext]);

  const goPrev = useCallback(() => {
    if (canPrev) setCurrentIndex((i) => i - 1);
  }, [canPrev]);

  // Preload next GIF
  useEffect(() => {
    if (currentIndex < STEPS.length - 1) {
      const next = STEPS[currentIndex + 1];
      if (next.gif) {
        const img = new Image();
        img.src = next.gif;
      }
    }
  }, [currentIndex]);

  // Core cube state — same pattern as SimulatorPage
  const cubeStateObjRef = useRef(new CubeState(CUBE_SIZE));
  const [displayState, setDisplayState] = useState(() => cubeStateObjRef.current.getState());
  const solveStackRef = useRef([]);
  const [layoutResetKey, setLayoutResetKey] = useState(0);

  const keyMap = useMemo(() => getKeyMap(CUBE_SIZE), []);

  // Move queue hook
  const queue = useSimulatorQueue({
    cubeStateObjRef,
    canAnimateMoves: true,
    solveStackRef,
    setDisplayState,
  });

  // Manual cube controls (drag + keyboard)
  const dispatchManualMove = useCallback((move) => {
    queue.enqueueMoves([move]);
  }, [queue]);

  const controls = useCubeControls({
    cubeSize: CUBE_SIZE,
    dispatchManualMove,
    manualInputLocked: queue.queueActive,
  });

  // Algorithm button handler
  const handleApplyAlgorithm = useCallback((moves) => {
    queue.enqueueMoves(moves);
  }, [queue]);

  // Keyboard nav for steps (only when cube is not animating)
  useEffect(() => {
    const handleKey = (e) => {
      // Don't hijack arrow keys used for cube controls
      if (controls.selectedSticker) return;
      // Let the cube controls handle single-letter keys
      if (e.key.length === 1 && keyMap[e.key]) return;

      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, controls.selectedSticker, keyMap]);

  // Viewport
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );
  const isMobile = viewportWidth < 768;

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cameraProfile = useMemo(() => (
    isMobile
      ? { position: [5.8, 4.8, 7.1], fov: 54, minDistance: 5.5, maxDistance: 22 }
      : { position: [4, 3.5, 5], fov: 45, minDistance: 4, maxDistance: 20 }
  ), [isMobile]);

  return (
    <div
      className={`min-h-screen h-screen flex flex-col overflow-hidden transition-colors duration-300 ${t.pageBg}`}
      style={{
        '--sim-panel': isDark ? '#0A0A0A' : '#F0EDE8',
        '--sim-border': isDark ? 'rgba(176,176,176,0.1)' : '#A89F94',
        '--sim-text': isDark ? '#FFFFFF' : '#2C2A26',
      }}
    >
      {/* Header */}
      <header className={`flex items-center justify-between px-6 py-3 border-b ${t.headerBorder} ${t.headerBg} shrink-0`}>
        <button
          onClick={() => navigate('/learn')}
          className={`flex items-center gap-2 font-mono text-xs uppercase tracking-widest ${t.headerText} transition-colors hover:-translate-x-1 duration-200`}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'} border border-dictator-red/40 flex items-center justify-center font-mono text-dictator-red text-[10px] font-bold`}>
            TD
          </div>
          <span className={`font-heading text-sm font-bold uppercase tracking-widest hidden sm:block ${t.headerText}`}>
            Solving Guide
          </span>
        </div>

        <button
          onClick={toggleTheme}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${t.border} ${t.headerText} hover:border-dictator-red/40`}
        >
          {isDark ? <Sun size={12} /> : <Moon size={12} />}
          {isDark ? 'Light' : 'Dark'}
        </button>
      </header>

      {/* Main content: side-by-side on desktop, stacked on mobile */}
      <div className={`flex flex-1 min-h-0 ${isMobile ? 'flex-col' : 'flex-row'}`}>
        {/* 3D Cube area */}
        <div className={`relative ${isMobile ? 'min-h-[260px] flex-1' : 'flex-[1.85] min-w-0'}`}>
          <SimulatorCanvasBoundary
            onError={(err) => console.error('Canvas error:', err)}
            fallback={<div className="flex items-center justify-center h-full text-dictator-red/50 font-mono text-sm">WebGL unavailable</div>}
          >
            <Canvas
              camera={{ position: cameraProfile.position, fov: cameraProfile.fov }}
              shadows
              className="w-full h-full"
            >
              <ResponsiveSceneCamera
                position={cameraProfile.position}
                fov={cameraProfile.fov}
              />
              <color attach="background" args={[t.canvasBg]} />
              <ambientLight intensity={isDark ? 0.5 : 0.8} />
              <directionalLight position={[5, 8, 5]} intensity={isDark ? 1 : 0.7} castShadow />
              <pointLight position={[-5, -5, -5]} color="#CC1A1A" intensity={0.4} distance={20} />
              <pointLight position={[5, 5, -5]} color="#1E90FF" intensity={0.2} distance={20} />

              <InteractiveCube
                key={`3-${layoutResetKey}`}
                activeMove={queue.activeMove}
                activeMoveId={queue.activeMoveId}
                turnDurationSeconds={queue.activeMoveDurationSeconds}
                cubeState={displayState}
                onMoveComplete={queue.handleMoveAnimationComplete}
                onStickerPointerDown={controls.handleStickerPointerDown}
                selectedSticker={controls.selectedSticker}
              />
              <OrbitControls
                enablePan={false}
                enableRotate
                minDistance={cameraProfile.minDistance}
                maxDistance={cameraProfile.maxDistance}
                autoRotate={false}
                dampingFactor={0.08}
                enableDamping
                maxPolarAngle={Math.PI * 0.95}
                mouseButtons={{
                  LEFT: THREE.MOUSE.PAN,
                  MIDDLE: THREE.MOUSE.DOLLY,
                  RIGHT: THREE.MOUSE.ROTATE,
                }}
              />
            </Canvas>
          </SimulatorCanvasBoundary>

          {queue.queueActive && (
            <div className={`absolute top-4 right-4 ${t.overlay} border border-dictator-red/30 rounded-full px-3 py-1.5 flex items-center gap-2 backdrop-blur`}>
              <span className="w-2 h-2 rounded-full bg-dictator-red animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-dictator-red">
                {queue.activeMove ? `Turning ${queue.activeMove}` : `${queue.queuedMoveCount} Queued`}
              </span>
            </div>
          )}

          <div className={`pointer-events-none absolute bottom-3 left-1/2 w-[calc(100%-2rem)] -translate-x-1/2 text-center font-mono text-[11px] uppercase tracking-widest ${t.textSecondary}`}>
            Drag stickers to turn · right-drag to orbit · scroll to zoom
          </div>
        </div>

        {/* Guide panel */}
        <div className={`${isMobile ? 'flex-1 min-h-[200px]' : 'w-[360px] xl:w-[400px] shrink-0'} border-l ${isDark ? 'border-white/5 bg-[#0A0A0A]' : 'border-dictator-ink/10 bg-dictator-linen'}`}>
          <GuidePanel
            currentStep={current}
            currentIndex={currentIndex}
            totalSlides={STEPS.length}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={goPrev}
            onNext={goNext}
            onApplyAlgorithm={handleApplyAlgorithm}
            queueActive={queue.queueActive}
            isDark={isDark}
            onNavigateSimulator={() => navigate('/simulator')}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the dev server loads the page**

Run: `cd /Users/martinofunrein/Downloads/the-dictators && npm run dev`

Open `http://localhost:5400/step-by-step` in the browser. Verify:
- 3D cube renders on the right
- Guide panel shows "Introduction" on the left
- Click "Next" — Step 1 (The Daisy) loads with GIF
- Navigate to Step 3 (First Layer — Corner Insert) — algorithm buttons appear
- Click "R U R'" button — cube animates the 3 moves
- Drag a sticker on the cube — it turns manually
- Arrow keys navigate steps (when no sticker is selected)
- Theme toggle works

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/StepByStepPage.jsx
git commit -m "feat(learn): rewrite StepByStepPage as guided simulator with interactive cube"
```

---

### Task 4: Verify mobile layout

**Files:**
- Modify (if needed): `frontend/src/pages/StepByStepPage.jsx`

- [ ] **Step 1: Test mobile layout**

Open `http://localhost:5400/step-by-step` and resize browser to < 768px width, or use Chrome DevTools device toolbar (iPhone 14 Pro).

Verify:
- Layout stacks vertically: cube on top, guide panel below
- Cube has min-height of 260px
- Guide panel scrolls independently
- Algorithm buttons are tappable
- GIFs load and display correctly
- Prev/Next buttons work

- [ ] **Step 2: Fix any mobile issues found**

If the guide panel is hidden behind the cube or not scrollable, adjust the flex properties. The mobile layout uses `flex-col` — the cube area should be `flex-1` with `min-h-[260px]`, and the guide panel should also be `flex-1` with `min-h-[200px]` and `overflow-y-auto` (handled inside GuidePanel).

- [ ] **Step 3: Commit if changes were needed**

```bash
git add frontend/src/pages/StepByStepPage.jsx
git commit -m "fix(learn): adjust mobile layout for guided simulator"
```

---

### Task 5: Final integration commit

**Files:**
- No new files — verification only

- [ ] **Step 1: Full walkthrough test**

Open `http://localhost:5400/step-by-step` and walk through every slide (1–25):
- Every GIF loads
- Every algorithm button applies the correct moves to the cube
- Cube state carries forward between steps
- Keyboard shortcuts work (letter keys turn cube, arrow keys navigate steps)
- Sticker drag works
- Light/dark theme toggle works on all slides
- "Free Solve" button on the last slide navigates to `/simulator`
- "Back" button navigates to `/learn`

- [ ] **Step 2: Push to Bitbucket**

```bash
git push origin sprint-3-martin
```
