# Solver Architecture & Vercel Limitations

## Overview

The app uses two solver paths depending on cube size and environment:

| Size | Local dev | Vercel production |
|------|-----------|-------------------|
| 2×2 | Python NxN (vendored) | Python NxN (wheel) ✅ |
| 3×3 | WASM C++ (Eric's solver) | WASM C++ ✅ |
| 4×4 | Python NxN (vendored) | 501 Not Supported ❌ |
| 5×5+ | Python NxN (vendored) | Not implemented |

---

## Solvers

### WASM C++ (Eric's beginner method)
- File: `api/solver.js` (Emscripten-compiled)
- Source: `backend/src/cube/CubeOperations.cpp`
- Algorithm: beginner layer-by-layer (daisy → white cross → first layer → second layer → OLL → PLL)
- Move count: 100–200+ moves for any scramble
- Works on: everywhere, all cube sizes for 3×3

### Python NxN solver (rubikscubennnsolver)
- Library: `rubikscubennnsolver` (dwalton76, vendored at `backend/vendor/rubiks-cube-NxNxN-solver/`)
- Wheel: `api/wheels/rubikscubennnsolver-1.0.0-py3-none-any.whl`
- Works for: 2×2 on Vercel, all sizes locally

### kociemba (Two-Phase Algorithm)
- Library: `kociemba` pip package (muodov/kociemba)
- Algorithm: Kociemba's Two-Phase Algorithm, near-optimal (≤20 moves)
- Package size: ~24.7 MB (tables pre-bundled)

---

## The rubikscubennnsolver + kociemba dependency chain

This is the critical relationship to understand:

```
rubikscubennnsolver solve flow:
  2×2  →  RubiksCube222.solve()  →  pure Python, self-contained ✅
  3×3  →  RubiksCube333.solve()  →  solve_333()  →  kociemba CLI subprocess
  4×4  →  RubiksCube444.solve()  →  reduce to 3×3  →  solve_333()  →  kociemba CLI subprocess
  5×5+ →  same: reduce → solve_333() → kociemba CLI subprocess
```

`solve_333()` in `__init__.py` (line ~3588):
```python
cmd = ["kociemba", kociemba_string]
try:
    steps = subprocess.check_output(cmd)
    kociemba_ok = True
except Exception:
    kociemba_ok = False

if not kociemba_ok:
    raise SolveError(f"parity error made kociemba barf, kociemba {kociemba_string}")
```

It shells out to `kociemba` as a **CLI binary**, not a Python import. When the binary is missing, ANY exception is caught and re-raised as "parity error" — misleading error message that actually means "command not found."

**2×2 is the only size that doesn't use kociemba.** Everything else (3×3, 4×4, 5×5, 6×6, 7×7) calls kociemba in the final solve step.

---

## Why kociemba fails on Vercel

Python 3.14 (Vercel's runtime) removed `distutils`, which kociemba's C extension requires at compile time. When Vercel runs `pip install kociemba` from `requirements.txt`, the C compilation fails. Result: no `kociemba` CLI binary available.

Error seen: `"parity error made kociemba barf, kociemba <string>"` — this is NOT a cube parity/math error. It is `FileNotFoundError` for the missing CLI binary, swallowed by the broad `except Exception` in the library.

---

## The under-10-moves fast solve feature (intent + current state)

### Intent
For short scrambles (≤10 moves, no M/E/S slice moves), the WASM solver's 100+ move beginner algorithm is excessive — showing 100 animation steps for a 3-move scramble is confusing. The goal was:

- ≤10 moves, no M/E/S → kociemba → near-optimal solution (~3–20 moves) → clean animation
- >10 moves → WASM → full beginner-method animation showing the algorithm
- Any M/E/S slice moves → WASM (kociemba requires fixed centers; M/E/S displace them)

### Why M/E/S slice moves can't use kociemba
In our cube model, M (middle X slice), E (equatorial Y slice), and S (front-to-back Z slice) rotate the layer that includes the face centers. After an E move, the green center of F face appears on a different face. kociemba requires that each face's center sticker matches the face's expected color. Displaced centers → kociemba returns "cubestring is invalid."

### Current state
The feature is disabled. All 3×3 solves use WASM regardless of move count.

Routing in `frontend/src/net/api.ts`:
```ts
const endpoint = (!isLocalDev && normalizedSize === 2)
  ? '/api/nxn-solve'
  : '/api/v1/cube/solve';
```

---

## Vercel solver limitations by size

### 3×3 — kociemba wheel workaround available

**Problem**: kociemba C extension won't compile on Vercel (Python 3.14, no distutils).

**Workaround**: build a pre-compiled kociemba wheel on Linux x86_64 (Vercel's runtime), add to `api/wheels/`. This bypasses compilation entirely.

Why must it be Linux x86_64:
- The rubikscubennnsolver wheel is `py3-none-any` (pure Python) — works on any platform
- kociemba has compiled C code → wheel is platform-specific
- A macOS ARM64 wheel will NOT run on Vercel's Linux x86_64 runtime
- Build options: Docker (`python:3.11-slim` Linux image), GitHub Actions `ubuntu-latest` runner

Once wheel is built and added:
1. Add `./api/wheels/kociemba-*.whl` to `requirements.txt`
2. Restore `solve_3x3()` in `api/nxn-solve.py` (already written, currently returns 501 for size=3)
3. Restore routing in `api.ts`: size=3, ≤10 moves, no M/E/S → `/api/nxn-solve`
4. Restore label in `useSimulatorActions.ts`

### 4×4 — not fixable on Vercel

**Problem**: rubikscubennnsolver generates 4×4 reduction lookup tables at runtime (~400MB). Vercel `/tmp` limit is 512MB — too tight, and generation on cold start would time out.

**No practical workaround for serverless.** Would require pre-generating tables, bundling them (~400MB), and serving them — exceeds Vercel function size limits. Works fine locally where tables are cached to disk after first generation.

### 5×5+ — not implemented, same blockers as 4×4 plus more

Larger cubes have even bigger tables and additionally require a compiled C binary (`ida_search_via_graph`) built from source via `gcc` at runtime — another blocker on Vercel.

---

## Local dev vs Vercel routing

```
Local dev (/api/v1/cube/solve → routes.js):
  3×3 ≤10 moves, no slice  →  try Python (vendored RubiksCube333 + local kociemba)
                            →  fallback to WASM if Python fails
  3×3 >10 moves            →  WASM
  2×2                      →  Python (vendored RubiksCube222)
  4×4                      →  Python (vendored RubiksCube444)

Vercel (/api/nxn-solve Python serverless):
  2×2                      →  RubiksCube222 from wheel ✅
  3×3                      →  501 Not Supported (kociemba unavailable)
  4×4                      →  501 Not Supported (tables too large)

Vercel (/api/v1/cube/solve Node.js serverless → routes.js):
  3×3 (all)                →  WASM ✅
  3×3 Python try-catch     →  fails immediately (vendored dir missing), falls through to WASM
```

---

## Building the kociemba wheel (when ready)

```bash
# Option 1: Docker (recommended)
docker run --rm -v $(pwd)/api/wheels:/output python:3.11-slim \
  pip wheel kociemba --wheel-dir /output

# Option 2: GitHub Actions
# Add workflow that runs on ubuntu-latest:
# pip wheel kociemba --wheel-dir api/wheels/
# git add api/wheels/kociemba-*.whl && git commit && git push

# After building:
# 1. Add to requirements.txt:
#    ./api/wheels/kociemba-<version>-cp311-cp311-linux_x86_64.whl
# 2. Restore size=3 in nxn-solve.py handle_solve (remove the 501)
# 3. Restore routing in api.ts
# 4. Restore label in useSimulatorActions.ts
```
