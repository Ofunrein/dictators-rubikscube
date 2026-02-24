# Architecture (Sprint 1)

- `frontend/` hosts a Vite + three.js web client.
- `frontend/src/main.js` renders and animates a 3x3x3 cubie cube.
- `frontend/src/cube/` holds client-side cube state and move application stubs.
- `frontend/src/ui/` and `frontend/src/net/` hold control and API placeholders.
- `backend/` contains C++ stubs for future game logic and solving services.

Sprint 1 game logic lives in frontend placeholder modules (`CubeState.js`, `moves.js`) while backend APIs are deferred.
