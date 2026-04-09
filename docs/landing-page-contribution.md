# Landing Page & Simulator — Contribution Summary

## Primary Contributions

### 1. Landing page design and implementation

Built the full landing page from scratch using React, Vite, Tailwind CSS, GSAP for scroll-driven animations, and React Three Fiber for the 3D hero section. This established the project's visual identity and brand experience. Components implemented:

- `Hero.jsx` — animated headline with binary rain background, GSAP stagger reveal, React Three Fiber canvas with rotating cube, "Start Solving" call-to-action routing to the simulator
- `Navbar.jsx` — sticky navigation with IntersectionObserver scroll detection, mobile menu overlay, routing to simulator
- `Features.jsx` — three feature cards (simulator, algorithm feed, progress tracking) with ScrollTrigger reveal animations
- `RubiksCube3D.jsx` — decorative auto-rotating 3D cube with brand palette and mouse parallax
- `Philosophy.jsx`, `Protocol.jsx`, `Team.jsx`, `CTA.jsx`, `Footer.jsx` — supporting content sections
- `App.jsx` — root component with GSAP ScrollTrigger registration and React Router layout
- `index.css` — custom Tailwind utilities, binary rain animation keyframes, scanline overlay, magnetic button effects

### 2. Simulator page core implementation

Built the interactive simulator page — the primary user experience of the platform. The simulator provides:

- **Interactive 3D cube** driven by live `CubeState`, with sticker positions calculated per face using index math
- **Move controls** — all 18 standard face turns organized by face group with button UI
- **Scramble and reset** — random move sequence generation, state application, sequence display
- **Timer system** — starts on first move, stops when solved, tracks best time across the session
- **Move history** — running log of every move applied during the session
- **2D face map** — flat unfolded cube view that updates in real time
- **Tutorial section** — 5-step learning path (notation basics → cross → F2L → OLL → PLL)
- **Algorithm quick-reference** — copy-paste move sequences for common patterns (Sexy Move, F2L Insert, Sune, U-Perm)
- **Keyboard shortcuts** — full notation mapped to keyboard with visual reference

### 3. Repository maintenance

Contributed to project hygiene across both sprints:

- Renamed `dicators-website` to `dictators-website` across the codebase (typo fix)
- Removed the deprecated `the-dictators-landing` duplicate folder
- Untracked binary build artifacts from git history
- Merged `.gitignore` files from both project roots
- Added the team logo asset and updated to final version

## Technical Decisions

1. **GSAP over CSS animations** — GSAP's ScrollTrigger provides timeline-level control over scroll-driven animations, enabling staggered reveals and scrub-based effects that CSS alone cannot achieve
2. **React Three Fiber for 3D** — R3F integrates Three.js into React's component model, enabling declarative 3D scene management alongside the rest of the UI
3. **Tailwind CSS for styling** — utility-first approach kept styles co-located with components while maintaining a consistent design system
4. **Component modularity** — each landing page section is a self-contained component with its own animation logic, enabling parallel development and independent testing

## Authored Commit Appendix

### Sprint 1

| Hash | Date | Description |
|------|------|-------------|
| f20ec14 | Feb 26 | Add logo assets |
| d1a4b26 | Feb 26 | Update logo |
| 2f8289e | Feb 26 | Add landing page app (Vite, React, GSAP, R3F) |
| 9de4aeb | Feb 26 | Restructure landing page into subdirectory |
| 200c452 | Feb 26 | Update .gitignore |

### Sprint 2

| Hash | Date | Description |
|------|------|-------------|
| da4e595 | Mar 12 | Add simulator page with routing, cube logic, timer, move controls |
| 003e9bf | Mar 28 | Add React/Vite landing page and simulator |
| 9f244e7 | Mar 28 | Merge .gitignore from both repos |
| 912049f | Mar 28 | Remove deprecated landing page and legacy files |
| c62c247 | Mar 31 | Untrack binary build artifacts |
| d0b0336 | Mar 31 | Rename dicators-website to dictators-website |
| cfe4e9f | Apr 8 | Remove misspelled dicators-website folder |
