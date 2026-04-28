# Guided Simulator — Step-by-Step Solving Guide with Interactive Cube

**Date:** 2026-04-23
**Status:** Approved
**Route:** `/step-by-step`

## Summary

Replace the current read-only `StepByStepPage` (text + GIF carousel) with an interactive guided simulator. Users follow Eric's 8-step beginner solving guide while practicing on a live 3D Rubik's Cube. Each step shows instruction text, an animated GIF, and clickable algorithm buttons that apply moves to the cube. Users can also manually turn the cube via drag and keyboard, just like the full simulator.

## Layout

Side-by-side split on desktop, stacked on mobile.

**Left panel (~35% width) — Guide Panel:**
- Step header: "Step 3 of 8" label + subtitle
- GIF animation: GitHub-hosted, lazy-loaded with spinner
- Instruction text: content from Eric's solving guide
- Algorithm buttons: clickable pills (e.g. `R U R'`) that enqueue moves on the live cube
- Prev/Next navigation with progress dots

**Right area (~65% width) — Interactive Cube:**
- Full 3D `InteractiveCube` with `Canvas` + `OrbitControls`
- Drag-to-turn stickers, keyboard shortcuts, orbit/zoom
- Move animation overlay (showing active move)

**Mobile (< 768px width):**
- Stacks vertically: cube on top (min-height 260px), guide panel below as scrollable area
- Algorithm buttons and nav remain in the guide panel
- Same functionality, just reflows to single column

## Cube State

State carries forward across steps. If the user completes Step 2 (white cross), Step 3 starts with that state intact. This mirrors the experience of solving a real cube end-to-end.

## Simulator Engine Reuse

All 3D cube logic is imported from `pages/simulator/` — nothing is duplicated:

- `useSimulatorQueue` — move queue, animation, state updates
- `useCubeControls` — keyboard shortcuts, sticker drag controls
- `InteractiveCube` + `Canvas` + `OrbitControls` — 3D rendering
- `CubeState` — cube state management

**Not included** (stripped from the full simulator):
- No size selector (locked to 3x3)
- No scramble/solve/reset buttons
- No timer
- No `SimulatorControls` panel
- No `TutorialPanel`
- No `SimulatorFaceMap`

## Algorithm Button Flow

1. User clicks algorithm pill (e.g. `R U R'`)
2. Button parses the string into `['R', 'U', "R'"]`
3. Calls `queue.enqueueMoves()` with the parsed array
4. Cube animates the move sequence
5. `displayState` updates as each move completes

Same pipeline the simulator uses for all move execution.

## Data Structure

The existing `STEPS` array in `StepByStepPage.jsx` gains an `algorithms` field:

```js
{
  step: 3,
  title: 'Step 3',
  subtitle: 'First Layer — Corner Insert',
  text: '...',
  gif: `${CDN}/First_Layer_Tile_Insert.gif`,
  algorithms: [
    { label: "Right insert", moves: "R U R'" },
    { label: "Left insert", moves: "L' U' L" },
  ],
}
```

Steps without algorithms (e.g. Step 1: The Daisy, which is freeform) have `algorithms: []` and the button area is hidden.

## File Changes

- **`frontend/src/pages/StepByStepPage.jsx`** — rewritten with guided simulator layout. Imports cube engine from `pages/simulator/`.
- **No changes to existing simulator components** — all reused as-is.

## GIF Hosting

GIFs remain on GitHub at `https://raw.githubusercontent.com/Ofunrein/cube-solving-guide-gifs/main/`. No change from current setup.

## Out of Scope

- 2x2 or 4x4 guided solving (3x3 only)
- Progress persistence across sessions
- Step validation (checking if user actually completed the step correctly)
- Custom scramble states per step
