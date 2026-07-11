# Development & Setup

This document contains the local setup steps, common commands, and troubleshooting notes for the Fuel Supply Chain Simulator.

## Prerequisites

- Node.js 18+ recommended
- npm
- PostgreSQL running locally or on a reachable host
- Python 3 with the forecasting dependencies installed if you plan to regenerate forecasts

## Local setup

1. Install dependencies

```bash
cd client
npm install

cd ../server
npm install
```

2. Configure the backend environment

Create `server/.env` with:

```env
DB_USER=your_username
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=supply_chain_sim
PORT=5000
```

3. Initialize the database

```bash
cd server
node seed.js
```

This step seeds sample nodes and demand history, and it also runs the forecasting script to populate predicted values.

4. Start the services

Open two terminals:

```bash
# Terminal 1 - backend
cd server
node index.js
```

```bash
# Terminal 2 - frontend
cd client
npm run dev
```

The frontend should be available at `http://localhost:5173` and the backend at `http://localhost:5000`.

## Forecasting workflow

The project includes a Python forecasting pipeline under `server/forecast/`.

- `train_and_insert.py` trains a model and inserts predicted demand values into `demand_history`.
- The seed script triggers forecasting after initial data insertion.
- The forecast UI uses the backend API to fetch historical and predicted demand values for a selected depot.

If you need to regenerate forecasts manually:

```bash
cd server
python forecast/train_and_insert.py --horizon 15
```

## Useful API endpoints

- `GET /api/network/state` — returns the node/network state
- `GET /api/demand-history/:nodeId` — returns actual and predicted demand history
- `GET /api/forecast/:nodeId` — returns forecast rows for a node
- `POST /api/simulation/advance` — advances the simulation by one day

## Troubleshooting

- If the backend fails to start, verify that PostgreSQL is running and that the `.env` values match your local database.
- If the frontend cannot load network data, confirm the backend is reachable at `http://localhost:5000/api/network/state`.
- If forecasts are missing, rerun the seed process or the forecasting script manually.

## Suggested improvements

- Add automated tests and CI
- Add Docker support for easier setup
- Add linting and formatting rules for both frontend and backend
