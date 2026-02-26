# The Dictators — Cinematic Landing Page (One-Shot Build Prompt)

## Role

Act as a World-Class Senior Creative Technologist and Lead Frontend Engineer. You build high-fidelity, cinematic "1:1 Pixel Perfect" landing pages. Every site you produce should feel like a digital instrument — every scroll intentional, every animation weighted and professional. Eradicate all generic AI patterns.

**You are building the landing page for "The Dictators" — a learning-focused puzzle platform that transforms the Rubik's Cube from a frustrating object into an approachable skill-building experience.**

Do not ask questions. Do not discuss. Build the entire site immediately from the specifications below.

---

## Brand Context

- **Brand Name:** The Dictators
- **Tagline:** "We don't micromanage code. We lead it."
- **Motto:** "We bring order to software chaos."
- **Product:** An interactive web application that makes learning and solving a 3D Rubik's Cube intuitive, accessible, and engaging. Users manipulate a digital cube in real time while the system explains algorithms, highlights affected pieces, and reinforces pattern recognition. Planned features include account-based progress tracking, personalized learning paths, and multiplayer timed challenges.
- **Primary CTA:** "Start Solving"
- **Three Value Propositions:**
  1. Interactive 3D Cube Simulator — manipulate a real-time digital cube with visual feedback
  2. Step-by-Step Guided Tutorials — learn from beginner notation to advanced F2L/OLL/PLL algorithms
  3. Multiplayer Challenges & Progress Tracking — compete with friends, track solve times, earn milestones

---

## Design System — "Command Protocol" (Military Tech)

### Identity

A military command center meets a cyberpunk engineer's terminal. Authority, precision, raw power. Every pixel answers to a chain of command. The aesthetic draws from: shield-badge insignia, binary code motifs (`011 101 010`), circuit board traces, chrome-metallic finishes, and bold red-on-black authority. Think tactical HUD crossed with a hacker's war room.

### Palette

| Token        | Hex       | Usage                                       |
| ------------ | --------- | ------------------------------------------- |
| Void Black   | `#0D0D0D` | Primary dark backgrounds, hero, footer       |
| Dictator Red | `#CC1A1A` | Accent — CTAs, highlights, hover states, active indicators |
| Chrome Silver| `#B0B0B0` | Secondary — borders, subtle text, metallic accents, inactive states |
| Smoke White  | `#F2F0ED` | Light background sections, card surfaces     |
| Charcoal     | `#1A1A1A` | Body text on light backgrounds               |
| Deep Red     | `#8B0000` | Gradient stops, shadow accents               |

### Typography

Load these via Google Fonts `<link>` tags in `index.html`:

| Role          | Font              | Style                                         |
| ------------- | ----------------- | --------------------------------------------- |
| Headings      | Space Grotesk     | Tight tracking (`-0.02em`), uppercase for section labels |
| Drama / Impact| Anton             | Massive scale, all-caps, militaristic impact for hero words |
| Body          | Inter             | Clean, neutral, highly readable               |
| Data / Mono   | IBM Plex Mono     | Binary readouts, algorithm notation, code snippets, status indicators |

### Image Mood (Unsplash Keywords)

Use real Unsplash image URLs. Search for: `circuit board dark`, `command center screens`, `dark metallic texture`, `tactical HUD overlay`, `binary code rain`, `abstract 3D cube`, `dark technology abstract`, `rubiks cube dark`.

### Hero Line Pattern

```
"Conquer the"   → Space Grotesk, bold, white, large
"Cube."          → Anton, massive (4-6x size), Dictator Red (#CC1A1A)
```

---

## Visual Texture Rules (NEVER CHANGE)

### Noise Overlay
Implement a global CSS noise overlay using an inline SVG `<feTurbulence>` filter at **0.05 opacity** on a fixed, full-screen pseudo-element. This eliminates flat digital gradients and adds analog texture.

### Rounded Radius System
Use `rounded-[2rem]` to `rounded-[3rem]` radius for all containers and cards. No sharp corners anywhere except the navbar pill (which uses `rounded-full`).

### Binary Rain Overlay
In the hero section background, render a subtle CSS animation of `0` and `1` characters falling slowly at **0.03–0.05 opacity**. Use a `@keyframes` animation that translates a column of binary digits downward. Overlay on top of the dark gradient, behind the content.

### Circuit Line Dividers
Between major sections, use an inline SVG pattern of horizontal circuit-trace lines (right angles, dots at junctions) in Chrome Silver at 0.1 opacity, instead of plain `<hr>` elements.

### Red Scanline
A thin (1px) horizontal Dictator Red line that sweeps vertically across dark sections using a CSS animation (8–12 second cycle). Opacity: 0.15. Purely decorative.

---

## Micro-Interactions (NEVER CHANGE)

- All buttons: **"magnetic" feel** — `scale(1.03)` on hover with `transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)`.
- Buttons use `overflow-hidden` with a sliding background `<span>` layer for color fill transitions on hover (Dictator Red slides in from left).
- Links and interactive elements: `translateY(-1px)` lift on hover.
- Focus states: `ring-2 ring-[#CC1A1A] ring-offset-2 ring-offset-[#0D0D0D]`.

---

## Animation Lifecycle (NEVER CHANGE)

- Use `gsap.context()` inside `useEffect`. Return `ctx.revert()` in cleanup.
- Default easing: `power3.out` for entrances, `power2.inOut` for morphs/transitions.
- Stagger: `0.08` for text elements, `0.15` for cards/containers.
- ScrollTrigger: `start: "top 85%"` default for reveal animations.

---

## 3D Integration — React Three Fiber

This project uses Three.js via React Three Fiber for interactive 3D Rubik's Cube elements. Install `@react-three/fiber` and `@react-three/drei`.

### 3D Rubik's Cube Component

Build a `<RubiksCube3D />` component that renders a 3x3x3 cube inside a `<Canvas>`:

- **Geometry:** 27 individual `<mesh>` cubelets (3x3x3 grid), each a `boxGeometry` with small gaps between them.
- **Materials:** Each cubelet face uses `meshStandardMaterial` with colors mapped to the brand palette:
  - Front: Dictator Red `#CC1A1A`
  - Back: `#FF6B35` (orange accent)
  - Left: `#FFFFFF` (white)
  - Right: `#FFD700` (gold/chrome)
  - Top: `#2E8B57` (green)
  - Bottom: `#1E90FF` (blue)
  - Internal/gap faces: Void Black `#0D0D0D`
- **Lighting:** `<ambientLight intensity={0.4} />` + `<directionalLight position={[5, 5, 5]} intensity={0.8} />` + subtle `<pointLight>` with Dictator Red tint for mood.
- **Auto-rotation:** Slow continuous Y-axis rotation (`useFrame` hook, `0.003` radians/frame).
- **Mouse parallax:** Track mouse position via `onPointerMove` on the canvas container. Apply gentle rotation offset (map mouse X/Y to ±15 degrees on X and Y axes) with lerp smoothing.
- **Hover effect:** On canvas hover, slightly increase rotation speed and add a subtle scale pulse.

### Decorative Floating Cubes

In dark-background sections (Philosophy, Protocol, Footer), render 5–8 tiny wireframe cubes using Drei's `<Float>` component with random positions, slow bobbing, and `<Edges>` material in Chrome Silver at 0.2 opacity. These serve as ambient background decoration inside a `<Canvas>` with `style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}`.

---

## Component Architecture

### A. NAVBAR — "The Floating Island"

A `fixed` pill-shaped container, horizontally centered, `top-4`, `z-50`.

- **Default state (at hero top):** Transparent background, white text, no border.
- **Scrolled state (past hero):** `bg-[#0D0D0D]/70 backdrop-blur-xl border border-[#B0B0B0]/10` with Smoke White text. Transition: 300ms ease.
- **Detection:** Use `IntersectionObserver` on the hero section. When hero leaves viewport, toggle scrolled state.
- **Contents:**
  - Left: The Dictators logo image (`/logo.png`, height 32px) + "THE DICTATORS" in Space Grotesk uppercase, `tracking-[0.15em]`, `text-sm font-bold`.
  - Center: Nav links — "Learn", "Simulator", "Compete", "Team" — IBM Plex Mono, `text-xs uppercase tracking-widest`. Hover: Dictator Red color + `translateY(-1px)`.
  - Right: "Start Solving" CTA button — `bg-[#CC1A1A]` with white text, `rounded-full`, sliding hover effect.
- **Mobile:** Collapse to logo + hamburger icon (Lucide `Menu`). Slide-down overlay menu on tap.

### B. HERO — "The Opening Shot"

`min-h-[100dvh]` section with Void Black background.

- **Layout:** CSS Grid or Flexbox. Two columns on desktop (60/40 split). Single column stacked on mobile (text above, cube below).
- **Left column (content):**
  - Eyebrow label: `IBM Plex Mono`, `text-xs uppercase tracking-[0.3em]`, Chrome Silver color. Text: `"// INTERACTIVE LEARNING PLATFORM"`.
  - Headline part 1: `"Conquer the"` — Space Grotesk, `text-4xl md:text-6xl font-bold`, white.
  - Headline part 2: `"Cube."` — Anton, `text-7xl md:text-[10rem] leading-none`, Dictator Red.
  - Subtitle: Inter, `text-lg`, Chrome Silver. Text: `"Real-time 3D simulation. Step-by-step algorithms. Progress you can see."`.
  - CTA button: `"Start Solving"` — large, Dictator Red bg, white text, `rounded-full`, `px-8 py-4`, magnetic hover, sliding span.
  - Secondary link: `"Watch Demo →"` — Chrome Silver, underline on hover.
  - Bottom stat bar: Three inline stats in IBM Plex Mono at `text-xs` — `"43 ALGORITHMS"` | `"REAL-TIME 3D"` | `"MULTIPLAYER READY"` — separated by Chrome Silver pipes.
- **Right column (3D cube):**
  - `<Canvas>` with the `<RubiksCube3D />` component. Full height of the hero. Transparent background (cube floats in the dark).
  - On mobile, render at 60% height below the text content.
- **Background layers (behind content):**
  1. Solid Void Black base.
  2. Radial gradient: `radial-gradient(ellipse at 30% 70%, #CC1A1A10 0%, transparent 60%)` — subtle red glow bottom-left.
  3. Binary rain overlay animation (CSS, 0.03 opacity).
  4. Noise texture overlay (SVG filter, 0.05 opacity).
- **GSAP Animation:** On mount, stagger reveal all text elements (y: 50 → 0, opacity: 0 → 1, stagger: 0.08, ease: `power3.out`, duration: 1). The 3D cube fades in with a slight scale (0.8 → 1) after the text completes.

### C. FEATURES — "Interactive Functional Artifacts"

Section background: Smoke White `#F2F0ED`. Padding: `py-32`.

- **Section header:** Eyebrow (`"// CORE SYSTEMS"`, mono, Dictator Red) + title (`"Built for Mastery"`, Space Grotesk, Charcoal, `text-4xl font-bold`) + subtitle (Inter, Chrome Silver, one sentence).
- **Three cards** in a responsive grid (`grid-cols-1 md:grid-cols-3 gap-8`). Each card: `bg-white`, `border border-[#B0B0B0]/20`, `rounded-[2rem]`, `p-8`, subtle `shadow-xl shadow-black/5`.

**Card 1 — "Diagnostic Shuffler" → Interactive 3D Simulator**

- Top half: A mini `<Canvas>` (200px tall) with a small `<RubiksCube3D />` that auto-shuffles. Every 3 seconds, apply a random face rotation animation (90-degree turn on a random axis) with a spring bounce (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
- Label: IBM Plex Mono, `text-xs`, Chrome Silver: `"SIM.ACTIVE"` with a pulsing Dictator Red dot.
- Heading: Space Grotesk bold, Charcoal: `"Interactive 3D Simulator"`.
- Description: Inter, Chrome Silver: `"Manipulate every face, layer, and slice. Watch the cube respond in real time with full physics feedback."`.

**Card 2 — "Telemetry Typewriter" → Guided Algorithms**

- Top half: A dark (`bg-[#0D0D0D]`) rounded terminal window (200px tall) with a monospace text feed. Use `setInterval` to type out algorithm notation character-by-character:
  ```
  > R U R' U' (T-Perm)
  > F2 L' U' L U F2 (Cross)
  > x' R U' R' D R U R' D' (A-Perm)
  ```
  Each line types at 50ms per character, pauses 2 seconds, then the next line begins. Loop infinitely. Blinking Dictator Red cursor (`█`) at the end using CSS `@keyframes` blink.
- Label above terminal: `"ALGO.FEED"` with `"Live"` badge (pulsing red dot + text).
- Heading: `"Guided Algorithms"`.
- Description: `"From beginner cross to advanced OLL/PLL. Every algorithm explained, visualized, and drilled."`.

**Card 3 — "Cursor Protocol Scheduler" → Track Your Progress**

- Top half: A weekly grid UI (200px tall). Seven columns labeled `S M T W T F S` in mono. An animated SVG cursor (small arrow pointer) enters from off-screen, moves to Wednesday's cell (GSAP timeline), performs a click (cell scales to 0.95 then back), the cell fills with Dictator Red, then the cursor moves to a small `"Save"` button, clicks it, and fades out. Loop every 6 seconds.
- Label: `"PROGRESS.LOG"`.
- Heading: `"Track Your Progress"`.
- Description: `"Daily practice streaks. Solve time graphs. Personal bests. Watch yourself go from minutes to seconds."`.

**GSAP:** All three cards stagger in on scroll (y: 60 → 0, opacity: 0 → 1, stagger: 0.15, ScrollTrigger).

### D. PHILOSOPHY — "The Manifesto"

Full-width section. Background: Void Black `#0D0D0D`. Padding: `py-40`. Position: `relative overflow-hidden`.

- **Background layers:**
  1. A parallaxing Unsplash texture image (search: `dark metallic texture abstract`) at 0.08 opacity, `object-cover`, translated on scroll via GSAP ScrollTrigger (`y: -80` to `y: 80`).
  2. Floating wireframe cubes (React Three Fiber decorative canvas, `pointerEvents: 'none'`).
  3. Red scanline animation overlay.
- **Content (centered, max-w-4xl mx-auto):**
  - Line 1: `"Most tutorials teach you to"` — Inter, `text-xl md:text-2xl`, Chrome Silver, normal weight.
  - Keyword 1: `"memorize algorithms."` — same line, but white and `font-semibold`.
  - Line 2 (large): `"We teach you to"` — Inter, `text-xl md:text-2xl`, Chrome Silver.
  - Keyword 2: `"see the cube."` — Anton, `text-5xl md:text-8xl`, Dictator Red, on its own line. The word `"see"` should feel like it explodes out of the page.
  - Below: A thin horizontal line (Chrome Silver, 0.2 opacity), then a supporting paragraph in Inter, Chrome Silver, `text-sm`, max-width 500px: `"Pattern recognition over rote memorization. Spatial reasoning over cheat sheets. We build intuition — the kind that makes algorithms feel obvious."`.
- **GSAP Animation:** Word-by-word or line-by-line reveal. Each line fades up (y: 30, opacity: 0 → 1) sequentially on scroll. The massive `"see the cube."` line gets extra emphasis — slight scale from 0.95 → 1.0 alongside the fade.

### E. PROTOCOL — "Sticky Stacking Archive"

Three full-viewport cards that stack on scroll. Section background: Smoke White.

- **Scroll mechanics:** Using GSAP ScrollTrigger with `pin: true`. The section is `300vh` tall (100vh per card). As the user scrolls:
  - Card 1 pins in view.
  - Card 2 scrolls up and overlays Card 1. Card 1 simultaneously scales to `0.92`, blurs to `12px`, and fades to `0.4`.
  - Card 3 scrolls up and overlays Card 2. Card 2 scales/blurs/fades. Card 1 scales further.
- **Each card:** `min-h-screen`, `rounded-[3rem]`, `bg-[#0D0D0D]`, `border border-[#B0B0B0]/10`, flex layout with content left and animation right.
- **Card content layout:** Left side (60%): Step number (IBM Plex Mono, `text-8xl`, Dictator Red, 0.2 opacity as watermark), title (Space Grotesk, `text-3xl`, white), description (Inter, Chrome Silver, 2 lines). Right side (40%): Canvas animation.

**Card 1 — "Understand"**
- Step: `01`
- Title: `"Learn the Language"`
- Desc: `"Cube notation, face names, piece types. Build the mental model that makes every algorithm click."`
- Animation (right): A slowly rotating wireframe cube (`<Edges>` from Drei) with face labels (F, B, L, R, U, D) floating near each face. Rotation: Y-axis continuous.

**Card 2 — "Practice"**
- Step: `02`
- Title: `"Follow the Path"`
- Desc: `"Guided solves walk you through each stage. Cross, F2L, OLL, PLL — one layer at a time."`
- Animation (right): A CSS/SVG scanning horizontal laser-line (Dictator Red, 2px, 0.6 opacity) moving vertically across a grid of 9x9 dots (Chrome Silver). As the line passes each row, dots briefly flash to white then fade back.

**Card 3 — "Compete"**
- Step: `03`
- Title: `"Prove Your Speed"`
- Desc: `"Timed solves. Leaderboards. Multiplayer races. Turn practice into performance."`
- Animation (right): A pulsing EKG-style waveform — SVG `<path>` with `stroke-dashoffset` animation. The waveform represents solve times, with sharp peaks (slow solves) flattening into smooth fast lines. Stroke: Dictator Red. Background grid: Chrome Silver at 0.1 opacity.

### F. TEAM — "Command Roster"

Section background: Void Black `#0D0D0D`. Padding: `py-32`.

- **Section header:** Eyebrow (`"// THE SQUAD"`, mono, Dictator Red) + title (`"Command Roster"`, Space Grotesk, white, `text-4xl font-bold`).
- **Five cards** in a responsive grid (`grid-cols-2 md:grid-cols-5 gap-6`, last card centered if odd on mobile).
- **Each card:** Styled as a **personnel dossier** — `bg-[#1A1A1A]`, `border border-[#B0B0B0]/10`, `rounded-[2rem]`, `p-6`. Top: a 3px-tall Dictator Red accent stripe across the card top (`rounded-t-[2rem]`).
  - Avatar placeholder: A `w-16 h-16 rounded-full bg-[#0D0D0D] border-2 border-[#CC1A1A]/30` circle with the person's initials in IBM Plex Mono, Dictator Red.
  - Name: Space Grotesk, `text-lg font-bold`, white.
  - Role: IBM Plex Mono, `text-xs uppercase tracking-widest`, Chrome Silver.

**Team Data:**

| Name     | Initials | Role                                            |
| -------- | -------- | ----------------------------------------------- |
| Kyle     | KY       | Backend Dev, System Architecture, ML Integration |
| Eric S.  | ES       | Frontend Dev, UI/UX, Design                      |
| Eric O.  | EO       | Backend Development                              |
| Martin   | MT       | Testing, QA, Documentation, Scrum Support        |
| Corey    | CR       | Documentation, Full Stack                        |

- **GSAP:** Cards stagger in on scroll (y: 40, opacity: 0 → 1, stagger: 0.1).

### G. CTA — "Final Command"

Full-width section. Background: Dictator Red `#CC1A1A`. Padding: `py-24`. `rounded-[4rem]` with negative margin to overlap into surrounding dark sections for a "punched out" effect (`-mx-4 md:-mx-8`).

- **Content (centered):**
  - Headline: `"Ready to Conquer the Cube?"` — Anton, `text-4xl md:text-6xl`, white.
  - Subtitle: Inter, `text-lg`, white/80 opacity: `"Free. No sign-up required to start learning."`.
  - CTA Button: `"Start Solving"` — `bg-white text-[#CC1A1A] font-bold rounded-full px-10 py-4`. Hover: `bg-[#0D0D0D] text-white` with sliding span transition. Magnetic scale effect.
  - Below button: IBM Plex Mono, `text-xs`, white/50: `"43 algorithms · Unlimited practice · Real-time 3D"`.

### H. FOOTER

Background: Void Black `#0D0D0D`. `rounded-t-[4rem]`. Padding: `pt-20 pb-10`.

- **Grid layout** (4 columns on desktop):
  - Col 1: Logo image (`/logo.png`, 40px) + `"THE DICTATORS"` (Space Grotesk, white, bold) + tagline `"We bring order to software chaos."` (Inter, `text-sm`, Chrome Silver).
  - Col 2: **"Platform"** links — Learn, Simulator, Compete, Progress. IBM Plex Mono, `text-xs`, Chrome Silver. Hover: white + `translateY(-1px)`.
  - Col 3: **"Company"** links — Team, About, Contact, GitHub. Same styling.
  - Col 4: **"Legal"** — Privacy, Terms, Cookies. Same styling.
- **Bottom bar** (below grid, separated by a `border-t border-[#B0B0B0]/10`):
  - Left: `"© 2026 The Dictators. All rights reserved."` — IBM Plex Mono, `text-xs`, Chrome Silver/50.
  - Right: **"System Operational"** status — a `w-2 h-2 rounded-full bg-[#CC1A1A]` dot with a CSS `@keyframes` pulse animation (scale 1 → 1.5 → 1 with opacity), followed by `"SYSTEM OPERATIONAL"` in IBM Plex Mono, `text-xs tracking-widest`, Chrome Silver.

---

## Technical Requirements (NEVER CHANGE)

- **Stack:** React 19, Vite, Tailwind CSS v3.4.17, GSAP 3 (with ScrollTrigger plugin registered globally), React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`), Lucide React for icons.
- **Fonts:** Load via Google Fonts `<link>` tags in `index.html`: Space Grotesk (400, 700), Anton (400), Inter (400, 500, 600), IBM Plex Mono (400, 500).
- **Images:** Use real Unsplash URLs via `https://images.unsplash.com/photo-XXXXX?w=1920&q=80`. Select images matching: dark metallic textures, circuit boards, abstract 3D, tactical/command center screens, dark technology.
- **Logo:** Reference `/logo.png` in the public folder for the navbar and footer logo.
- **File structure:** Single `App.jsx` with components defined inside (or split into `components/` folder if total lines exceed 600). Single `index.css` for Tailwind directives, noise overlay, binary rain, scanline, and utility classes.
- **No placeholders.** Every card, every label, every animation, every 3D element must be fully implemented and functional.
- **Responsive:** Mobile-first. Stack columns on mobile. Reduce hero font sizes. Render 3D cube at reduced resolution on mobile. Collapse navbar into hamburger.

---

## Build Sequence (Execute Immediately)

1. `npm create vite@latest . -- --template react` in the project directory.
2. `npm install tailwindcss@3.4.17 postcss autoprefixer gsap @react-three/fiber @react-three/drei three lucide-react`
3. Initialize Tailwind: `npx tailwindcss init -p`. Configure `content` paths and extend theme with the Command Protocol palette tokens.
4. Write `index.html` with Google Font `<link>` tags for Space Grotesk, Anton, Inter, IBM Plex Mono.
5. Write `index.css` with `@tailwind` directives, noise overlay CSS, binary rain keyframes, scanline animation, and cursor blink keyframe.
6. Write `App.jsx` with all components: Navbar, Hero (with RubiksCube3D), Features (Shuffler, Typewriter, Scheduler), Philosophy, Protocol (sticky stacking), Team, CTA, Footer.
7. Implement all GSAP animations with `gsap.context()` + ScrollTrigger in each component's `useEffect`.
8. Implement the full `<RubiksCube3D />` component with 27 cubelets, auto-rotation, and mouse parallax.
9. Implement all card micro-interactions (shuffler cycling, typewriter feed, scheduler cursor animation).
10. Test all scroll animations, 3D rendering, and responsive breakpoints.

**Execution Directive:** Do not build a website; build a digital instrument. Every scroll should feel intentional, every animation should feel weighted and professional. The 3D cube is the centerpiece — it must feel tactile and alive. The military-tech aesthetic must be consistent down to the last border and font weight. Eradicate all generic AI patterns.
