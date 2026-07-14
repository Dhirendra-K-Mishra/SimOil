const pool = require('./db');

async function debug() {
  try {
    const nodes = await pool.query('SELECT id, type, name FROM nodes ORDER BY id ASC LIMIT 50');
    console.log('Nodes (first 50):', nodes.rows.length);
    console.table(nodes.rows);

    const cnt = await pool.query('SELECT COUNT(*) FROM demand_history');
    console.log('demand_history count:', cnt.rows[0].count);

    const sample = await pool.query('SELECT node_id, date, actual_demand, predicted_demand FROM demand_history ORDER BY date DESC LIMIT 40');
    console.log('Latest demand_history rows (up to 40):', sample.rows.length);
    console.table(sample.rows);
  } catch (err) {
    console.error('DB debug failed:', err.message);
  } finally {
    pool.end();
  }
}

debug();
