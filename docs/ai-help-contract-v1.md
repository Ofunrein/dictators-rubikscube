# AI Help Contract (v1)

## Endpoint

- Method: `POST`
- Path: `/api/v1/ai/help` (local Fastify equivalent: `/v1/ai/help`)
- Purpose: Return contextual Rubik's coaching output in one of four modes: `hint`, `guide`, `solve`, or `explain`.

## Request Body

### Required Top-Level Fields

- `mode`: `"hint" | "guide" | "solve" | "explain"`
- `context`: object

### Optional Top-Level Fields

- `message`: string (free-form user ask, max 1000 chars in v1)
- `previousCoachResponse`: object (used mainly by `mode: "explain"`)

### `context` Object (v1 frozen fields)

- `cubeState`: object with faces `U`, `R`, `F`, `D`, `L`, `B`; each face is an array of 9 sticker tokens (`W`, `R`, `G`, `Y`, `O`, `B`)
- `moveHistory`: string array
- `scramble`: string array
- `tutorialStepIndex`: number
- `tutorialStepTitle`: string
- `timerMs`: number
- `idleMs`: number
- `solveDepth`: number
- `queueActive`: boolean
- `isSolved`: boolean

### `previousCoachResponse` Object (optional)

- `id`: string
- `mode`: `"hint" | "guide" | "solve" | "explain"`
- `content`: string

## Success Response (`200`)

### Required Fields

- `requestId`: string
- `mode`: `"hint" | "guide" | "solve" | "explain"`
- `coachMessage`: object
- `meta`: object

### `coachMessage` Object (v1 frozen fields)

- `id`: string
- `content`: string
- `moves`: string array (optional; typically populated for `solve`)
- `nextActions`: string array (optional)
- `disclaimer`: string (optional)

### `meta` Object (v1 frozen fields)

- `provider`: string
- `model`: string
- `isMock`: boolean
- `generatedAt`: ISO-8601 string

## Error Response

Uses existing API error envelope:

- `error.code`
- `error.message`
- `error.requestId`
- `error.details` (optional validation array)

## Canonical Request Example

```json
{
  "mode": "hint",
  "message": "I keep messing up the first two layers",
  "context": {
    "cubeState": {
      "U": ["W", "W", "W", "W", "W", "W", "W", "W", "W"],
      "R": ["R", "R", "R", "R", "R", "R", "R", "R", "R"],
      "F": ["G", "G", "G", "G", "G", "G", "G", "G", "G"],
      "D": ["Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y"],
      "L": ["O", "O", "O", "O", "O", "O", "O", "O", "O"],
      "B": ["B", "B", "B", "B", "B", "B", "B", "B", "B"]
    },
    "moveHistory": ["R", "U", "R'", "U'"],
    "scramble": ["F", "R", "U", "R'", "U'"],
    "tutorialStepIndex": 2,
    "tutorialStepTitle": "First Two Layers (F2L)",
    "timerMs": 48231,
    "idleMs": 70311,
    "solveDepth": 12,
    "queueActive": false,
    "isSolved": false
  }
}
```

## Canonical Success Example

```json
{
  "requestId": "req_01JZ8N3C2GQ1YJ3T47M9P4H2M1",
  "mode": "hint",
  "coachMessage": {
    "id": "coach_01JZ8N3C3P96H1Q2FAH0T3H6V8",
    "content": "Try pairing the corner and edge in the top layer before inserting.",
    "nextActions": [
      "Find a white corner for your current slot",
      "Use R U R' U' once to pair",
      "Insert only after side colors line up"
    ]
  },
  "meta": {
    "provider": "mock",
    "model": "mock-cube-coach-v1",
    "isMock": true,
    "generatedAt": "2026-04-21T18:40:12.103Z"
  }
}
```

## v1 Freeze Rules

- Do not remove or rename any v1 frozen fields in request or response.
- New fields in v1.x must be additive and optional.
- `mode` enum values are fixed to `hint | guide | solve | explain` for v1.
- `coachMessage.content` remains plain text in v1 (no markdown-only contract guarantees).
