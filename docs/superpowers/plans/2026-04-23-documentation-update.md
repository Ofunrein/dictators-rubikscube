# Documentation Update Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update README, architecture docs, and Confluence with the step-by-step guide page architecture and simulator changes from Sprint 3.

**Architecture:** Three documentation surfaces: root README.md (repo onboarding), docs/architecture.md (technical reference), and Confluence TD space (team-facing wiki). Screenshots captured via Playwright for Confluence pages.

**Tech Stack:** Markdown, Confluence REST API, Playwright (screenshots)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `README.md` | Modify | Add step-by-step guide to features table, project structure, and architecture diagram |
| `docs/architecture.md` | Modify | Add step-by-step page section, update simulator section with recent changes |
| Confluence: TD space | Create 2 pages | "Step-by-Step Guide — Architecture" and "Simulator Page — Sprint 3 Changes" |

---

### Task 1: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add step-by-step guide to features table**

Add after the "Tutorial System" row:

```markdown
| **Step-by-Step Guide** | Interactive solving guide with GIF animations, algorithm buttons, and live 3D cube |
```

- [ ] **Step 2: Add step-by-step files to project structure**

Add under `pages/simulator/` in the tree:

```markdown
│       ├── pages/step-by-step/           Step-by-step solving guide
│       │   ├── StepByStepPage.jsx        Guide + live cube side-by-side
│       │   ├── GuidePanel.jsx            Left panel: text, GIFs, algorithm buttons
│       │   └── stepsData.js              25-slide guide data with algorithm definitions
```

- [ ] **Step 3: Add LeaderboardPage and ProfilePage to structure**

Add after step-by-step section:

```markdown
│       ├── pages/LeaderboardPage.jsx     6 leaderboards (2x2/3x3 × 3 stats)
│       ├── pages/ProfilePage.jsx         Per-size stats with rank display
│       ├── pages/LearnPage.jsx           Eric's learning modules (placeholder)
```

- [ ] **Step 4: Update the architecture diagram**

Add the Step-by-Step Guide page to the browser section of the ASCII diagram, showing it connects to the same cube/moves.js and useSimulatorQueue hooks as the Simulator Page.

- [ ] **Step 5: Update route map**

Add to any route listing:

```markdown
/step-by-step  → StepByStepPage.jsx (guided simulator with solving guide)
/learn         → LearnPage.jsx (Eric's learning modules)
/leaderboard   → LeaderboardPage.jsx (6 leaderboards)
/profile       → ProfilePage.jsx (per-size stats + ranks)
```

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: update README with step-by-step guide, leaderboard, profile pages"
```

---

### Task 2: Update docs/architecture.md

**Files:**
- Modify: `docs/architecture.md`

- [ ] **Step 1: Add Step-by-Step Guide section**

Add a new section after the Simulator Page section:

```markdown
## Step-by-Step Solving Guide (/step-by-step)

A guided simulator that combines Eric's 8-step beginner solving guide with a
live interactive 3D cube. Layout: guide panel on the left (~45%), cube on the
right (~55%). Mobile: stacks vertically.

Architecture:
  StepByStepPage.jsx  — page shell, cube state ownership, hook wiring
  GuidePanel.jsx      — renders step text, GIF, algorithm buttons, nav
  stepsData.js        — 25 slides with algorithms field per step

Reuses from pages/simulator/ (no duplication):
  useSimulatorQueue   — move queue and animation lifecycle
  useCubeControls     — keyboard shortcuts and sticker drag
  InteractiveCube     — 3D rendering via React Three Fiber

GIF hosting:
  24 GIFs from Eric's solving guide docx hosted on GitHub:
  https://raw.githubusercontent.com/Ofunrein/cube-solving-guide-gifs/main/
  Avoids Vercel deployment size limits (556MB total).

Key behaviors:
  - Cube state carries forward across steps (no reset between steps)
  - Scramble button on intro step gates the Next button
  - Algorithm buttons parse move notation and call enqueueMoves()
  - Locked to 3x3 only (no size selector)
  - No timer, scramble, solve, or face map
```

- [ ] **Step 2: Add Simulator Changes section**

Document the Sprint 3 simulator changes:

```markdown
## Simulator Changes (Sprint 3)

Bug fixes:
  - 2x2 solve: local dev routes through Node.js backend (pythonNxNSolver.js).
    Vercel prod uses /api/nxn-solve (Python serverless). Both confirmed working.
  - Move history: cleared when solve starts to prevent race condition.
  - Face map: wrapped in React.memo to reduce re-render lag.

New features:
  - PageNavbar: mobile hamburger menu with full-screen overlay.
  - Leaderboard: 6 boards (2x2/3x3 × fastest/avg/solves) + result count dropdown.
  - Profile: per-size stat cards with rank display.

Accessibility:
  - dictator-red uses CSS variable: light #CC1A1A, dark #EF4444 (WCAG AA).
  - Step nav buttons use startTransition to reduce INP.
```

- [ ] **Step 3: Add pages overview section**

```markdown
## Pages

| Route | File | Description |
|-------|------|-------------|
| / | App.jsx | Landing page with GSAP animations |
| /simulator | pages/simulator/SimulatorPage.jsx | Full interactive simulator |
| /step-by-step | pages/StepByStepPage.jsx | Guided solving with live cube |
| /learn | pages/LearnPage.jsx | Eric's learning modules (placeholder) |
| /leaderboard | pages/LeaderboardPage.jsx | 6 leaderboards with dropdown |
| /profile | pages/ProfilePage.jsx | Per-size stats + ranks |
```

- [ ] **Step 4: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: add step-by-step guide and simulator changes to architecture"
```

---

### Task 3: Capture screenshots via Playwright

**Files:**
- Create: `docs/screenshots/` directory with PNG files

- [ ] **Step 1: Take screenshots of key pages**

Use Playwright MCP to navigate to the Vercel preview and capture:

```
1. step-by-step page — intro step with scramble button
2. step-by-step page — a solving step with GIF and algorithm buttons
3. simulator page — 3x3 cube with controls
4. leaderboard page — showing tabs and table
5. profile page — showing stat cards
```

Save to `docs/screenshots/` with names: `step-guide-intro.png`, `step-guide-solving.png`, `simulator.png`, `leaderboard.png`, `profile.png`.

- [ ] **Step 2: Commit screenshots**

```bash
git add docs/screenshots/
git commit -m "docs: add page screenshots for Confluence and README"
```

---

### Task 4: Create Confluence page — Step-by-Step Guide Architecture

**Files:**
- Confluence: TD space, new page

- [ ] **Step 1: Create the page via REST API**

Page title: "Step-by-Step Solving Guide — Architecture"

Content covers:
- What the page does (guided simulator with live cube)
- Layout: guide panel left, cube right, mobile stacks
- Data: 25 slides with 8 logical steps, algorithms field
- GIF hosting: GitHub repo, why not in Vercel
- Reused components: useSimulatorQueue, useCubeControls, InteractiveCube
- Key UX decisions: scramble gate, carry-forward state, no timer

Include screenshots from Task 3 as embedded images (upload as attachments).

- [ ] **Step 2: Verify the page renders correctly**

Open the Confluence page URL and confirm content is readable.

---

### Task 5: Create Confluence page — Simulator Sprint 3 Changes

**Files:**
- Confluence: TD space, new page

- [ ] **Step 1: Create the page via REST API**

Page title: "Simulator Page — Sprint 3 Changes"

Content covers:
- Bug fixes: 2x2 solve routing, move history race, face map lag
- New features: mobile navbar, leaderboard with 6 boards, profile with ranks
- Accessibility: WCAG AA contrast, INP reduction
- Solver architecture: 3x3 = Eric's C++ WASM, 2x2 = Python (confirmed)

Include simulator screenshot from Task 3.

- [ ] **Step 2: Verify the page renders correctly**

---

### Task 6: Push all changes

- [ ] **Step 1: Push to Bitbucket**

```bash
git push origin sprint-3-martin
```
