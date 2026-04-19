# Active Frontend

This folder contains the live React + Vite frontend for the Rubik's Cube project.

The main project README lives at the repo root:
- [../README.md](../README.md)

Use the root README first if you are new to the project. It explains:
- the full repo structure
- how frontend and backend connect
- where the simulator code lives
- which folders are active vs legacy

## Local Frontend Commands

Run the frontend by itself:

```bash
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5400`.

From the repo root, `npm run dev` starts:
- frontend on `5400`
- backend API on `5200`

## Important Folders In This App

```text
frontend/
  src/components/         landing page sections
  src/cube/               shared cube model and move logic
  src/net/api.js          frontend API client
  src/pages/simulator/    simulator page, hooks, controls, and helpers
  src/utils/              shared frontend utilities
```

## Source Of Truth

- Active frontend: this folder
- Local API/backend: `../backend/`
- Production serverless handlers: `../api/`
- Legacy prototype: `../frontend-legacy/`

If you are deciding where to work:
- UI, page layout, simulator controls, and React hooks go here
- backend routes and solver orchestration go in `../backend/` or `../api/`
