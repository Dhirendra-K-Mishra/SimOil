# Architecture

Overview
- Frontend: `client/` — React + Vite single-page app that renders the network map and UI controls.
- Backend: `server/` — Node.js + Express API that runs the simulation logic, serves API endpoints, and interacts with PostgreSQL.
- Database: PostgreSQL — stores nodes, capacities, inventory history and demand data.

High-level data flow
1. The frontend requests the current simulation state from the backend API (`/api/network/state`).
2. The backend computes or retrieves simulation state from the database and returns JSON shaped for the UI.
3. User interactions (advance day, change parameter) call backend mutation endpoints which update state and persist history.

Key components & locations
- UI map and controls: `client/src/NetworkMap.jsx`, `client/src/App.jsx`
- Frontend entry: `client/src/main.jsx`
- Backend entry: `server/index.js`
- DB schema and seed: `server/seed.js`, `server/db.js`

API endpoints (expected)
- `GET /api/network/state` — returns full view for the client
- `POST /api/network/advance` — advances the simulation by one day (example)
- `POST /api/network/update-node` — updates node parameters (capacity, demand)

Data model (summary)
- Node types: `refinery`, `depot`, `outlet_cluster`
- Each node: id, type, capacity, inventory, parent relationships
- Historical records: timestamped inventory and demand samples

Extensibility notes
- To support high-frequency simulation, separate the compute layer from the API and add a job queue (e.g., Bull) and background workers.
- For multi-region scaling, shard or partition inventory history and add caching (Redis) for hot simulation state.
