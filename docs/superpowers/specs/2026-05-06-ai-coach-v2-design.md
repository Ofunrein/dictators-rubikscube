# AI Coach v2 Design

**Date:** 2026-05-06
**Repo:** Ofunrein/dictators-rubikscube (personal GitHub only — never push to Bitbucket origin)

## Goal

Replace the mock `aiCoachRuntime.js` with a real AI-powered coach using Groq (LLaMA 3.3-70B, free tier). Port `aiCoach.ts` to plain JS so no build step is needed. Fix solve mode to use the existing Python solver instead of reverse-history reconstruction.

## Architecture

### Files Changed

| File | Change |
|------|--------|
| `backend/api/src/lib/aiCoach.js` | New — port of `aiCoach.ts` to plain JS |
| `backend/api/src/routes.js` | Import swap: `aiCoachRuntime.js` → `aiCoach.js` |
| `backend/api/.env.example` | Add Groq env var documentation |

`aiCoachRuntime.js` is NOT deleted — it stays as a reference but is no longer imported.

### Request Flow

```
POST /v1/ai/help
  → routes.js → handleAiHelpRoute
  → validateAiHelpRequest (unchanged)
  → generateAiCoachResult (aiCoach.js)
      → if mode === 'solve': call solveCubeStateWithPython → return moves
      → else: call Groq via OpenAI-compatible chat completions
          → on success: return normalizeModelCoachMessage result
          → on failure: fall back to createMockCoachMessage (smart deterministic)
```

## Mode Behavior

| Mode | AI | Behavior |
|------|-----|---------|
| hint | Groq | 1-2 sentences + 3 next actions. Tutor signals injected into prompt. |
| guide | Groq | Step-by-step with up to 6 next actions. Stage-aware. |
| explain | Groq | Explains previous response. References `previousCoachResponse`. |
| solve | Python solver | Uses `solveCubeStateWithPython` (Kociemba algorithm). Falls back to smart mock if solver fails. No reverse-history. |

## Groq Integration

- Base URL: `https://api.groq.com/openai`
- Endpoint: `POST /v1/chat/completions`
- Model: `llama-3.3-70b-versatile`
- Response format: `json_object`
- Timeout: 12s (matches existing `AI_REQUEST_TIMEOUT_MS`)
- Auth: `Authorization: Bearer ${AI_PROVIDER_API_KEY}`

### Environment Variables (Vercel)

```
AI_PROVIDER=openai
AI_BASE_URL=https://api.groq.com/openai
AI_MODEL=llama-3.3-70b-versatile
AI_PROVIDER_API_KEY=<groq key>
```

Provider detection: if `AI_PROVIDER !== 'openai'` or key missing → smart mock fallback. No crash.

## Prompt Design

System prompt instructs the model to return JSON only: `{content, moves?, nextActions?, disclaimer?}`.

Context sent per request (from existing `buildCoachContext` in frontend):
- `cubeState` — full 6-face state object
- `moveHistory` — last 25 moves
- `scramble` — last 25 scramble moves
- `timerMs`, `solveDepth`, `queueActive`, `isSolved`
- `mode`, `message` (user's typed question if any)
- `previousCoachResponse` (for explain mode)

Tutor signals computed server-side:
- `idleBand` — low/medium/high based on `idleMs`
- `inversePairsLast12` — counts undo patterns
- `repeatedLoop` — detects cycling move sequences
- `dominantFace` — over-reliance on one face

## Response Quality Enforcement

`enforceModeQuality()` post-processes every response:
- **hint**: content truncated to 2 sentences / 220 chars, max 3 next actions, no moves
- **guide**: max 6 next actions
- **solve**: moves array required; short explanation only
- **explain**: content must start with "Why this works:"

## Error Handling

- Groq HTTP error → `makeMockResult(reason)` with disclaimer
- JSON parse failure → `makeMockResult('provider output normalization failed')`
- Timeout (AbortController) → `makeMockResult('provider request failed')`
- Solve mode: Python solver throws → smart deterministic solve suggestion

## Context Retention

No server-side session. `previousCoachResponse` (id, mode, content) passed by the frontend on each explain request. Already implemented in the UI.

## Constraints

- No TypeScript — plain `.js` throughout
- No new npm packages — uses native `fetch` (Node 18+)
- No Bitbucket pushes — personal GitHub remote only
- Vercel env vars must be set manually after implementation
