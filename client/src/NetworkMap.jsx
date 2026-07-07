import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from "recharts";

const NetworkMap = () => {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/network/state",
        );
        setNodes(response.data);
      } catch (error) {
        console.error("Error fetching network state:", error);
      }
    };
    fetchNetwork();
  }, []);

  const refinery = nodes
    .filter((n) => n.type === "refinery")
    .map((n) => ({
      ...n,
      renderSize: Math.max(
        100,
        900 * (Number(n.current_inventory) / Number(n.max_capacity)),
      ),
    }));

  const depots = nodes
    .filter((n) => n.type === "depot")
    .map((n) => ({
      ...n,
      renderSize: Math.max(
        50,
        400 * (Number(n.current_inventory) / Number(n.max_capacity)),
      ),
    }));

  const outlets = nodes
    .filter((n) => n.type === "outlet")
    .map((n) => ({
      ...n,
      renderSize: Math.max(
        15,
        80 * (Number(n.current_inventory) / Number(n.max_capacity)),
      ),
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: "#fff",
            padding: "10px",
            border: "1px solid #ccc",
          }}
        >
          <p>
            <strong>{data.name}</strong>
          </p>
          <p>Inventory: {Number(data.current_inventory).toLocaleString()} L</p>
          <p>Capacity: {Number(data.max_capacity).toLocaleString()} L</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: "100%", height: "600px", padding: "20px" }}>
      <h2>Supply Chain Network Map</h2>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />

          {/* Abstract Cartesian Grid setup */}
          <XAxis
            type="number"
            dataKey="latitude"
            name="X"
            domain={[-200, 200]}
          />
          <YAxis
            type="number"
            dataKey="longitude"
            name="Y"
            domain={[-200, 200]}
          />

          {/* ZAxis explicitly looks at our injected renderSize to draw the shapes */}
          <ZAxis type="number" dataKey="renderSize" range={[80, 900]} />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ strokeDasharray: "3 3" }}
          />

          {/* Render Refinery (Largest, Red Triangle) */}
          <Scatter
            name="Refinery"
            data={refinery}
            fill="#ef4444"
            shape="triangle"
          />

          {/* Render Depots (Medium, Blue Square) */}
          <Scatter name="Depots" data={depots} fill="#3b82f6" shape="square" />

          {/* Render Outlets (Small, Green Circle) */}
          <Scatter
            name="Outlets"
            data={outlets}
            fill="#22c55e"
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NetworkMap;
