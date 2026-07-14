import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import NetworkMap from './NetworkMap';
import Forecast from './Forecast';
import './App.css';
import axios from 'axios';

function App() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [cycle, setCycle] = useState(0);

  const handleAdvanceDay = async () => {
    setIsSimulating(true);

    try {
      await axios.post('http://localhost:5000/api/simulation/advance', {}, { timeout: 10000 });
    } catch (error) {
      console.warn('Backend advance failed or timed out; using local animation.', error?.message || error);
    } finally {
      setCycle((value) => value + 1);
      window.setTimeout(() => setIsSimulating(false), 700);
    }
  };

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Petroleum Logistics Intelligence</p>
          <h1>Fuel supply chains rendered as a living network.</h1>
          <p>
            One refinery feeds a regional cluster of depots, each supporting roughly 250 to 300 outlets
            with backup coverage that spans days rather than hours.
          </p>
          <div className="hero-actions">
            <button onClick={handleAdvanceDay} disabled={isSimulating}>
              {isSimulating ? 'Calculating...' : 'Advance Simulation: 1 Day'}
            </button>
            <span className="status-pill">Live-style cluster view</span>
          </div>
        </div>

        <div className="hero-metrics">
          <div className="metric-card">
            <span className="metric-label">Refinery daily output</span>
            <strong>4.5M - 5.0M L</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Depot storage</span>
            <strong>10M - 15M L</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Outlet cluster size</span>
            <strong>250 - 300 pumps</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Refill cadence</span>
            <strong>Every 2 - 3 days</strong>
          </div>
        </div>
        </header>

        <Routes>
          <Route path="/" element={<NetworkMap cycle={cycle} />} />
          <Route path="/forecast/:nodeId" element={<Forecast />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;