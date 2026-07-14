# Fuel Supply Chain Simulator

A full-stack web application for visualizing and simulating petroleum supply-chain operations across a refinery, depots, and outlet clusters. The platform combines a live-style network view with demand forecasting so users can inspect current inventory conditions and projected demand trends over time.

## Executive summary

This project was developed as a practical internship-style application to model a fuel logistics network and support operational planning. It includes:

- a React + Vite frontend for interactive visualization,
- an Express + Node.js backend for simulation and API services,
- a PostgreSQL database for storing node inventory and demand history,
- and a Python-based forecasting pipeline that generates rolling demand predictions.

The current experience allows users to view network state, advance a simulation day-by-day, and open a dedicated forecast view for each depot showing today’s actual demand alongside the next 15 predicted days.

## Documentation index

- [Project docs](docs/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development & setup](docs/DEVELOPMENT.md)
- [Workflow & git](docs/WORKFLOW.md)
- [Manager brief & change steps](docs/MANAGER_BRIEF.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Quickstart

1. Install dependencies:

```bash
cd client
npm install

cd ../server
npm install
```

2. Configure the backend environment:

Create a file named `server/.env` with your database and port settings:

```env
DB_USER=your_username
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=supply_chain_sim
PORT=5000
```

3. Seed the database (optional but recommended for initial data):

```bash
cd server
node seed.js
```

4. Start the services in separate terminals:

```bash
cd server
node index.js
```

```bash
cd client
npm run dev
```

Open the Vite URL shown in the terminal, typically `http://localhost:5173`, and use the backend at `http://localhost:5000`.

## Current features

- Interactive refinery-to-depot-to-outlet visual map
- Live-style inventory and capacity indicators
- Day-by-day simulation advancement
- Depot-level forecast page showing today’s actual demand and the next 15 predicted days
- REST APIs for network state, demand history, and simulation actions

## Project structure

- `client/` — React frontend and UI components
- `server/` — Express API, database access, simulation logic, and forecasting integration
- `docs/` — architecture, development, workflow, and manager-facing notes

## Notes

If the backend is unavailable, the UI can still render a demo-style simulation view, but the forecasting and live simulation features will be limited.

## License

This project is intended for educational, demonstration, and internship-related purposes.
