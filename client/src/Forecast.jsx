import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

function Forecast() {
  const { nodeId } = useParams();
  const [history, setHistory] = useState([]);
  const [meta, setMeta] = useState(null);
  const intervalRef = useRef();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/demand-history/${nodeId}`);
        if (!active) return;
        setHistory(res.data || []);
        // node meta from network state
        const net = await axios.get('http://localhost:5000/api/network/state');
        const node = net.data.find(n => String(n.id) === String(nodeId));
        setMeta(node || null);
      } catch (err) {
        console.warn('Failed to load forecast data', err);
      }
    };

    load();

    // live update every 15 seconds
    intervalRef.current = setInterval(load, 15000);

    return () => {
      active = false;
      clearInterval(intervalRef.current);
    };
  }, [nodeId]);

  // Prepare chart data: combine actual and predicted by date
  // Build a 30-day window: (today - 15 days) .. (today + 14 days)
  const today = new Date();
  const iso = (d) => d.toISOString().split('T')[0];
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - 15);
  const windowDays = 30; // 15 past, today, 14 future
  const dates = Array.from({ length: windowDays }, (_, i) => {
    const dt = new Date(start);
    dt.setUTCDate(start.getUTCDate() + i);
    return iso(dt);
  });

  // Normalize returned history rows by date-only key (strip time portion)
  const rowsByDate = {};
  (history || []).forEach((r) => {
    if (!r || !r.date) return;
    const key = String(r.date).split('T')[0];
    rowsByDate[key] = r;
  });

  const chartData = dates.map((d) => {
    const row = rowsByDate[d] || {};
    return {
      date: d,
      actual: row.actual_demand != null ? Number(row.actual_demand) : null,
      predicted: row.predicted_demand != null ? Number(row.predicted_demand) : null,
    };
  });

  const values = chartData.reduce((acc, x) => {
    if (x.actual != null) acc.push(x.actual);
    if (x.predicted != null) acc.push(x.predicted);
    return acc;
  }, []);
  const maxVal = values.length ? Math.max(...values) : 1;
  const yDomain = [0, Math.ceil(maxVal * 1.12)];

  // Prepare the view: next 15 days predicted data and today's actual shown beside them
  const todayIso = iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())));
  const todayRow = rowsByDate[todayIso] || {};
  const todayActual = todayRow.actual_demand != null ? Number(todayRow.actual_demand) : null;

  const futureDays = 15;
  const futureDates = Array.from({ length: futureDays }, (_, i) => {
    const dt = new Date(start);
    dt.setUTCDate(start.getUTCDate() + 15 + i + 1); // start was today-15; move to today+1
    return iso(dt);
  });

  const tableRows = futureDates.map((d) => {
    const row = rowsByDate[d] || {};
    const predicted = row.predicted_demand != null ? Number(row.predicted_demand) : null;
    const diff = todayActual != null && predicted != null ? Math.round(predicted - todayActual) : null;
    return { date: d, todayActual, predicted, diff };
  });

  return (
    <div className="forecast-page">
      <header className="forecast-header">
        <Link to="/">← Back</Link>
        <h2>Demand forecast for {meta?.name || `Node ${nodeId}`}</h2>
      </header>

      <section className="forecast-content text-table">
        <div className="forecast-meta-row">
          <div><strong>Window</strong>: {tableRows[0]?.date} → {tableRows[tableRows.length - 1]?.date}</div>
          <div><strong>Updated</strong>: {new Date().toLocaleString()}</div>
        </div>

        <div className="forecast-table-wrap">
          <table className="forecast-table full">
            <thead>
              <tr>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Today's Actual (L/day)</th>
                <th style={{ textAlign: 'right' }}>Predicted (L/day)</th>
                <th style={{ textAlign: 'right' }}>Diff (Pred - Today)</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.date} className={r.date === todayIso ? 'today-row' : ''}>
                  <td>{r.date}</td>
                  <td style={{ textAlign: 'right' }}>{r.todayActual != null ? Math.round(r.todayActual).toLocaleString() : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{r.predicted != null ? Math.round(r.predicted).toLocaleString() : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{r.diff != null ? r.diff.toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Forecast;
