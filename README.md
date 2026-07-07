# Fuel Supply Chain Simulator

A dynamic web application for visualizing a petroleum supply network as a live-style refinery-to-depot-to-outlet model. The dashboard simulates how fuel flows from a refinery through regional depots and then into outlet clusters, with capacity and inventory indicators that make the network feel operational rather than static.

## Features

- Interactive fuel logistics dashboard
- Visual representation of:
  - one refinery
  - multiple depots
  - outlet clusters served by each depot
- Capacity and inventory tracking for the refinery, depots, and outlet clusters
- Simulation controls to advance the model day by day
- Responsive UI designed for a more realistic operations view

## Project Structure

- client/ - React + Vite frontend
- server/ - Express backend and simulation logic

## Tech Stack

- Frontend: React, Vite, Axios
- Backend: Node.js, Express
- Data layer: PostgreSQL

## Getting Started

### 1. Install dependencies

In the client folder:

```bash
cd client
npm install
```

In the server folder:

```bash
cd server
npm install
```

### 2. Configure the database

Create a `.env` file in the server folder with your PostgreSQL connection details:

```env
DB_USER=your_username
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=supply_chain_sim
PORT=5000
```

### 3. Seed the database

If needed, initialize the database with sample nodes and demand history:

```bash
cd server
node seed.js
```

### 4. Run the app

Start the backend:

```bash
cd server
node index.js
```

Start the frontend:

```bash
cd client
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Notes

The frontend expects the backend API to be available at:

- http://localhost:5000/api/network/state

If the backend is unavailable, the UI will continue to display a polished demo-style simulation view.

## License

This project is intended for educational and demonstration purposes.
