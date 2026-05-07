# Documentation Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push documentation score from 82 → 90+ by adding live demo URL, CI/build badges, OpenAPI link, deployment section, and updating the README architecture notes to reflect TypeScript migration and 6-slide learn page.

**Architecture:** All changes are to `README.md` and `CONTRIBUTING.md` in the repo root. No code changes. Live deployment URL is `https://dictators-rubikscube.vercel.app`. OpenAPI spec already exists at `backend/api/openapi.yaml`.

**Tech Stack:** Markdown, GitHub Actions badge syntax, Shields.io.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `README.md` | Add demo URL, badges, deployment section, TS note, OpenAPI link |
| Modify | `CONTRIBUTING.md` | Add TypeScript section, link to OpenAPI spec |

---

## Task 1: Add Live Demo URL + Badges to README Header

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read current `README.md` first 30 lines**

```bash
head -30 /Users/martinofunrein/Downloads/the-dictators/README.md
```

Note the exact current header/title line.

- [ ] **Step 2: Add demo URL and badges immediately after the H1 title**

The README should begin with the project title, then immediately have the live URL and badges before any other content. Find the H1 line (something like `# Rubik's Cube Simulator` or similar) and insert after it:

```markdown
**🎮 [Live Demo → dictators-rubikscube.vercel.app](https://dictators-rubikscube.vercel.app)**

![CI](https://github.com/Ofunrein/dictators-rubikscube/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
```

- [ ] **Step 3: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add README.md
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "docs: add live demo URL and CI/license/stack badges to README"
```

---

## Task 2: Add Deployment + OpenAPI + TypeScript Sections

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read the full README to find where to insert**

```bash
wc -l /Users/martinofunrein/Downloads/the-dictators/README.md
grep -n "##" /Users/martinofunrein/Downloads/the-dictators/README.md
```

Note all existing `##` section headings and their line numbers.

- [ ] **Step 2: Add Deployment section**

Find the existing "Quick Start" or setup section. After it, add a `## Deployment` section:

```markdown
## Deployment

The app is deployed on Vercel. The frontend is a static Vite build; the backend runs as Vercel Serverless Functions.

| Environment | URL |
|---|---|
| Production | [dictators-rubikscube.vercel.app](https://dictators-rubikscube.vercel.app) |
| API (production) | `https://dictators-rubikscube.vercel.app/api/v1` |

**Deploy your own fork:**
1. Import the repo into Vercel
2. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` as frontend env vars
3. Set `DATABASE_URL`, `AI_PROVIDER_API_KEY`, `JWT_ACCESS_SECRET` as backend env vars
4. Deploy — Vercel auto-detects `vercel.json` build config
```

- [ ] **Step 3: Add OpenAPI reference to the API section**

Find the existing API endpoints table in README. After it, add:

```markdown
> Full OpenAPI 3.0 spec: [`backend/api/openapi.yaml`](./backend/api/openapi.yaml)
```

- [ ] **Step 4: Update Tech Stack table to include TypeScript**

Find the existing tech stack table. Ensure it includes a TypeScript row. If not present, add:

```markdown
| TypeScript | 5.x | Strict mode — all frontend and backend source files |
```

- [ ] **Step 5: Update Learn Page slide count reference if present**

If README mentions "4 slides" for the learn page, update to "6 slides" (Hero, Overview, Notation, Step-by-Step, Algorithms, Resources).

- [ ] **Step 6: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add README.md
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "docs: add deployment section, OpenAPI link, TypeScript stack entry"
```

---

## Task 3: Update CONTRIBUTING.md with TypeScript Notes

**Files:**
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Read current CONTRIBUTING.md**

```bash
cat /Users/martinofunrein/Downloads/the-dictators/CONTRIBUTING.md
```

- [ ] **Step 2: Add TypeScript section after Code Style**

```markdown
## TypeScript

All frontend source files are `.tsx`/`.ts` (strict mode). When adding new files:
- Use `.tsx` for React components, `.ts` for utilities/hooks
- Add prop interfaces for all components with props
- Run `npx tsc --noEmit` in `frontend/` before committing to verify zero type errors
- `@typescript-eslint/no-explicit-any` is a warning — avoid `any`, use `unknown` with type guards
```

- [ ] **Step 3: Add OpenAPI link to API section**

After the existing test command instructions, add:

```markdown
## API Reference

Full OpenAPI 3.0 specification: [`backend/api/openapi.yaml`](./backend/api/openapi.yaml)

Interactive exploration: import the spec into [Swagger Editor](https://editor.swagger.io/) or any OpenAPI-compatible tool.
```

- [ ] **Step 4: Commit**

```bash
cd /Users/martinofunrein/Downloads/the-dictators
git add CONTRIBUTING.md
git commit --author="Martin O. <Ofunrein@users.noreply.github.com>" -m "docs: add TypeScript guidelines and OpenAPI reference to CONTRIBUTING"
```

---

## Task 4: Push

- [ ] **Step 1: Push**

```bash
git push github main
```

---

## Self-Review

### Spec Coverage
| Requirement | Task | Status |
|---|---|---|
| Live demo URL at top of README | Task 1 | ✓ |
| CI badge | Task 1 | ✓ |
| License badge | Task 1 | ✓ |
| TypeScript badge | Task 1 | ✓ |
| Deployment section | Task 2 | ✓ |
| OpenAPI link in README | Task 2 | ✓ |
| TypeScript in stack table | Task 2 | ✓ |
| TypeScript guidelines in CONTRIBUTING | Task 3 | ✓ |
| OpenAPI in CONTRIBUTING | Task 3 | ✓ |

### Placeholder Scan
No TBD. All markdown content shown completely. ✓
