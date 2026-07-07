import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const formatVolume = (value) => `${(value / 1000000).toFixed(1)}M L`;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const buildFallbackNetwork = (cycle) => {
  const refinery = {
    id: 1,
    name: 'North Refinery',
    type: 'refinery',
    inventory: 4.8e6 + cycle * 180000,
    capacity: 5.5e6,
    output: 4.8e6,
    position: { x: 130, y: 270 },
  };

  const depots = Array.from({ length: 13 }, (_, index) => {
    const outlets = 250 + (index % 5) * 12 + 10;
    const inventory = clamp(11.5e6 + index * 110000 - cycle * 180000, 8e6, 15.5e6);

    return {
      id: 100 + index,
      name: `Regional Depot ${index + 1}`,
      type: 'depot',
      inventory,
      capacity: 15e6,
      outlets,
      dailyDemand: outlets * (3000 + (index % 3) * 550),
      supplyDays: 12 + (index % 5),
      position: {
        x: 330 + (index % 4) * 110,
        y: 120 + Math.floor(index / 4) * 110,
      },
    };
  });

  return { refinery, depots };
};

const getOutletClusterCapacity = (outlets) => 1.8e6 + outlets * 11000;

const buildCapacitySnapshot = (network, previousSnapshot) => {
  const refineryPercent = (network.refinery.inventory / network.refinery.capacity) * 100;
  const refineryHistory = [...(previousSnapshot?.refinery?.history || []), refineryPercent].slice(-8);

  const depots = network.depots.map((depot, index) => {
    const percent = (depot.inventory / depot.capacity) * 100;
    const previousDepot = previousSnapshot?.depots?.[index];
    const change = previousDepot ? percent - previousDepot.percent : 0;
    const history = [...(previousDepot?.history || []), percent].slice(-8);

    return {
      id: depot.id,
      name: depot.name,
      percent,
      inventory: depot.inventory,
      capacity: depot.capacity,
      outlets: depot.outlets,
      change,
      history,
    };
  });

  const clusters = network.depots.map((depot, index) => {
    const capacity = getOutletClusterCapacity(depot.outlets);
    const inventory = depot.inventory * 0.08 + depot.outlets * 12000;
    const percent = (inventory / capacity) * 100;
    const previousCluster = previousSnapshot?.clusters?.[index];
    const change = previousCluster ? percent - previousCluster.percent : 0;
    const history = [...(previousCluster?.history || []), percent].slice(-8);

    return {
      id: `${depot.id}-cluster`,
      name: `${depot.name} cluster`,
      percent,
      inventory,
      capacity,
      outlets: depot.outlets,
      change,
      history,
    };
  });

  return {
    refinery: {
      name: network.refinery.name,
      percent: refineryPercent,
      inventory: network.refinery.inventory,
      capacity: network.refinery.capacity,
      change: previousSnapshot?.refinery ? refineryPercent - previousSnapshot.refinery.percent : 0,
      history: refineryHistory,
    },
    depots,
    clusters,
  };
};

function NetworkMap({ cycle }) {
  const [network, setNetwork] = useState(() => buildFallbackNetwork(0));
  const [capacitySnapshot, setCapacitySnapshot] = useState(() => buildCapacitySnapshot(buildFallbackNetwork(0), null));
  const [status, setStatus] = useState('Offline demo view');
  const previousSnapshotRef = useRef(null);

  useEffect(() => {
    let active = true;

    const loadNetwork = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/network/state', {
          timeout: 1800,
        });

        if (!active || !response.data?.length) {
          return;
        }

        const refineryNode = response.data.find((node) => node.type === 'refinery');
        const depotNodes = response.data.filter((node) => node.type === 'depot');

        if (refineryNode && depotNodes.length) {
          const mappedDepots = depotNodes.map((node, index) => ({
            ...node,
            name: node.name || `Regional Depot ${index + 1}`,
            inventory: Number(node.current_inventory || 0),
            capacity: Number(node.max_capacity || 0),
            outlets: 250 + (index % 5) * 12 + 10,
            dailyDemand: (250 + (index % 5) * 12 + 10) * 3600,
            supplyDays: 12 + (index % 5),
            position: {
              x: 330 + (index % 4) * 110,
              y: 120 + Math.floor(index / 4) * 110,
            },
          }));

          const nextNetwork = {
            refinery: {
              ...refineryNode,
              inventory: Number(refineryNode.current_inventory || 0),
              capacity: Number(refineryNode.max_capacity || 0),
              position: { x: 130, y: 270 },
              output: 4.8e6,
            },
            depots: mappedDepots,
          };

          const nextSnapshot = buildCapacitySnapshot(nextNetwork, previousSnapshotRef.current);
          previousSnapshotRef.current = nextSnapshot;
          setNetwork(nextNetwork);
          setCapacitySnapshot(nextSnapshot);
          setStatus('Live backend data');
        }
      } catch (error) {
        console.warn('Using local simulation data.', error);
        setStatus('Offline demo view');
      }
    };

    loadNetwork();

    const timer = window.setInterval(() => {
      if (!active) {
        return;
      }

      const pulse = Math.floor(Date.now() / 1500) % 3;
      const fallbackNetwork = buildFallbackNetwork(cycle + pulse);
      const nextSnapshot = buildCapacitySnapshot(fallbackNetwork, previousSnapshotRef.current);
      previousSnapshotRef.current = nextSnapshot;
      setNetwork(fallbackNetwork);
      setCapacitySnapshot(nextSnapshot);
    }, 1400);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [cycle]);

  const totalOutletCount = network.depots.reduce((sum, depot) => sum + depot.outlets, 0);
  const averageSupplyDays = Math.round(
    network.depots.reduce((sum, depot) => sum + depot.supplyDays, 0) / network.depots.length,
  );

  return (
    <section className="map-panel">
      <div className="map-header">
        <div>
          <p className="eyebrow">Visual network model</p>
          <h2>Refinery, depot and outlet clusters</h2>
        </div>
        <div className="pill-row">
          <span className="status-pill soft">{status}</span>
          <span className="status-pill">{network.depots.length} depots</span>
        </div>
      </div>

      <div className="map-layout">
        <div className="map-canvas">
          <svg viewBox="0 0 900 560" role="img" aria-label="Fuel supply network map">
            <rect x="20" y="20" width="860" height="520" rx="24" className="grid-surface" />
            <line x1="70" y1="90" x2="830" y2="90" className="grid-line" />
            <line x1="70" y1="470" x2="830" y2="470" className="grid-line" />
            <line x1="70" y1="90" x2="70" y2="470" className="grid-line" />
            <line x1="830" y1="90" x2="830" y2="470" className="grid-line" />

            <line
              x1={network.refinery.position.x + 52}
              y1={network.refinery.position.y}
              x2={network.depots[0].position.x - 38}
              y2={network.depots[0].position.y}
              className="flow-line"
            />

            <g>
              <circle cx={network.refinery.position.x} cy={network.refinery.position.y} r="46" className="refinery-node pulse" />
              <polygon points="130,220 178,320 82,320" className="refinery-core" />
              <text x={network.refinery.position.x} y={network.refinery.position.y + 74} textAnchor="middle" className="node-label">
                {network.refinery.name}
              </text>
            </g>

            {network.depots.map((depot, index) => {
              const outletDots = Array.from({ length: Math.min(10, Math.round(depot.outlets / 28)) }, (_, dotIndex) => {
                const angle = (dotIndex / 10) * Math.PI * 2;
                const radius = 24 + (dotIndex % 3) * 8;
                return {
                  x: depot.position.x + Math.cos(angle) * radius,
                  y: depot.position.y + Math.sin(angle) * radius + (dotIndex % 2 ? 10 : -10),
                };
              });

              return (
                <g key={depot.id}>
                  <line
                    x1={network.refinery.position.x + 38}
                    y1={network.refinery.position.y}
                    x2={depot.position.x - 36}
                    y2={depot.position.y}
                    className="flow-line"
                  />
                  <circle cx={depot.position.x} cy={depot.position.y} r="30" className="depot-node" />
                  <circle cx={depot.position.x} cy={depot.position.y} r="20" className="depot-core" />
                  <text x={depot.position.x} y={depot.position.y + 54} textAnchor="middle" className="node-label">
                    {depot.name}
                  </text>
                  {outletDots.map((dot, dotIndex) => (
                    <circle
                      key={`${depot.id}-dot-${dotIndex}`}
                      cx={dot.x}
                      cy={dot.y}
                      r="5"
                      className="outlet-node"
                    />
                  ))}
                  <text x={depot.position.x} y={depot.position.y + 74} textAnchor="middle" className="node-caption">
                    {depot.outlets} pumps • {depot.supplyDays} day buffer
                  </text>
                  {index === 0 && (
                    <circle cx={depot.position.x + 18} cy={depot.position.y - 20} r="8" className="outlet-node pulse" />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <aside className="insights-card">
          <div className="insight-block">
            <span className="metric-label">Refinery stock</span>
            <strong>{formatVolume(network.refinery.inventory)}</strong>
          </div>
          <div className="insight-block">
            <span className="metric-label">Depot backup window</span>
            <strong>{averageSupplyDays} days</strong>
          </div>
          <div className="insight-block">
            <span className="metric-label">Outlet pumps covered</span>
            <strong>{totalOutletCount.toLocaleString()}</strong>
          </div>
          <div className="insight-block">
            <span className="metric-label">Estimated tanker loads</span>
            <strong>{Math.round(totalOutletCount / 260)}+ per cycle</strong>
          </div>
        </aside>
      </div>

      <div className="capacity-section">
        <div className="capacity-header-row">
          <div>
            <p className="eyebrow">Capacity view</p>
            <h3>Refinery, depots and outlet clusters</h3>
          </div>
        </div>

        <div className="capacity-grid">
          <div className="capacity-group">
            <h4>Refinery</h4>
            <div className="capacity-card">
              <div className="capacity-card-top">
                <div>
                  <strong>{capacitySnapshot.refinery.name}</strong>
                  <small>Primary processing node</small>
                </div>
                <span className={`delta ${capacitySnapshot.refinery.change >= 0 ? 'up' : 'down'}`}>
                  {capacitySnapshot.refinery.change >= 0 ? '+' : ''}
                  {capacitySnapshot.refinery.change.toFixed(1)}%
                </span>
              </div>
              <div className="bar-track">
                <div className="bar-fill refinery" style={{ width: `${Math.min(100, capacitySnapshot.refinery.percent)}%` }} />
              </div>
              <div className="capacity-meta">
                <span>{formatVolume(capacitySnapshot.refinery.inventory)} / {formatVolume(capacitySnapshot.refinery.capacity)}</span>
                <span>{capacitySnapshot.refinery.percent.toFixed(0)}%</span>
              </div>
              <svg className="sparkline" viewBox="0 0 120 32" preserveAspectRatio="none">
                {capacitySnapshot.refinery.history.map((value, index) => {
                  const x = (index / Math.max(1, capacitySnapshot.refinery.history.length - 1)) * 120;
                  const y = 28 - (value / 100) * 24;
                  return <circle key={`${capacitySnapshot.refinery.name}-${index}`} cx={x} cy={y} r="1.8" fill="#f43f5e" />;
                })}
              </svg>
            </div>
          </div>

          <div className="capacity-group">
            <h4>Depots</h4>
            <div className="capacity-list">
              {capacitySnapshot.depots.map((depot) => (
                <div className="capacity-card compact" key={depot.id}>
                  <div className="capacity-card-top">
                    <div>
                      <strong>{depot.name}</strong>
                      <small>{depot.outlets} pumps</small>
                    </div>
                    <span className={`delta ${depot.change >= 0 ? 'up' : 'down'}`}>
                      {depot.change >= 0 ? '+' : ''}
                      {depot.change.toFixed(1)}%
                    </span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill depot" style={{ width: `${Math.min(100, depot.percent)}%` }} />
                  </div>
                  <div className="capacity-meta">
                    <span>{formatVolume(depot.inventory)} / {formatVolume(depot.capacity)}</span>
                    <span>{depot.percent.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="capacity-group">
            <h4>Outlet clusters</h4>
            <div className="capacity-list">
              {capacitySnapshot.clusters.map((cluster) => (
                <div className="capacity-card compact" key={cluster.id}>
                  <div className="capacity-card-top">
                    <div>
                      <strong>{cluster.name}</strong>
                      <small>{cluster.outlets} pumps</small>
                    </div>
                    <span className={`delta ${cluster.change >= 0 ? 'up' : 'down'}`}>
                      {cluster.change >= 0 ? '+' : ''}
                      {cluster.change.toFixed(1)}%
                    </span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill outlet" style={{ width: `${Math.min(100, cluster.percent)}%` }} />
                  </div>
                  <div className="capacity-meta">
                    <span>{formatVolume(cluster.inventory)} / {formatVolume(cluster.capacity)}</span>
                    <span>{cluster.percent.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default NetworkMap;
