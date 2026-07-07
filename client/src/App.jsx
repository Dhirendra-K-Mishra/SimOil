import React, { useState } from 'react';
import NetworkMap from './NetworkMap'; // Importing our new component
import './App.css'; 
import axios from 'axios';

function App() {
  
  const [isSimulating, setIsSimulating] = useState(false);

  const handleAdvanceDay = async () => {
    setIsSimulating(true);
    try {
        
        await axios.post('http://localhost:5000/api/simulation/advance');
        
        window.location.reload();
    } catch (error) {
        console.error("Error advancing simulation:", error);
        alert("Simulation failed. Make sure your backend server is running!");
    } finally {
        setIsSimulating(false);
    }
  };

  return (
    <div className="app-container" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h1>Fuel Supply Chain Simulator</h1>
        <p>Interactive Network Topology</p>
        
        {/* The Simulation Control Button */}
        <button 
            onClick={handleAdvanceDay} 
            disabled={isSimulating}
            style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: isSimulating ? '#6b7280' : '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isSimulating ? 'not-allowed' : 'pointer',
                marginTop: '10px',
                fontWeight: 'bold'
            }}
        >
            {isSimulating ? 'Calculating...' : 'Advance Simulation: 1 Day'}
        </button>
      </header>
      
      {/* Mounting the 2D map component here */}
      <NetworkMap />
    </div>
  );
}

export default App;