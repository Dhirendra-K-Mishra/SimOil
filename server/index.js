require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db"); // The connection pool

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const performSimulationTick = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Refinery Production (4.75M per tick, distributed across daily clock)
    // In a real-time sim, we scale this down to per-tick production
    await client.query(`
            UPDATE nodes SET current_inventory = LEAST(current_inventory + 200000, max_capacity)
            WHERE type = 'refinery'
        `);

    // 2. Aggregate Cluster Demand Fulfillment
    // We simulate the 250+ outlets per depot as a single aggregated sink
    await client.query(`
            UPDATE nodes SET current_inventory = GREATEST(current_inventory - 40000, 0)
            WHERE type = 'depot'
        `);

    // 3. Simple Allocation: If Depot inventory < 30%, trigger restock shipment
    const lowDepots = await client.query(`
            SELECT id FROM nodes WHERE type = 'depot' AND current_inventory < (max_capacity * 0.3)
        `);

    for (let row of lowDepots.rows) {
      await client.query(
        `
                INSERT INTO shipments (source_id, destination_id, volume, status, dispatch_date)
                VALUES (1, $1, 2000000, 'en_route', CURRENT_DATE)
            `,
        [row.id],
      );
    }

    await client.query("COMMIT");
    console.log("Simulation Tick Processed...");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Tick Failed:", err.message);
  } finally {
    client.release();
  }
};

setInterval(performSimulationTick, 2000);

app.get("/api/network/state", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM nodes ORDER BY type, id");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.get("/api/demand-history/:nodeId", async (req, res) => {
  try {
    const { nodeId } = req.params;
    const result = await pool.query(
      `SELECT date, actual_demand, predicted_demand 
             FROM demand_history 
             WHERE node_id = $1 
             ORDER BY date ASC`,
      [nodeId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.get("/api/network/routes", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM edges");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.post("/api/simulation/advance", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const arrivals = await client.query(`
            SELECT id, destination_id, volume 
            FROM shipments 
            WHERE status = 'en_route' AND arrival_date <= CURRENT_DATE + INTERVAL '1 day'
        `);

    for (let shipment of arrivals.rows) {
      await client.query(
        `
                UPDATE nodes SET current_inventory = current_inventory + $1 WHERE id = $2
            `,
        [shipment.volume, shipment.destination_id],
      );

      await client.query(
        `
                UPDATE shipments SET status = 'delivered' WHERE id = $1
            `,
        [shipment.id],
      );
    }

    await client.query(`
            UPDATE nodes 
            SET current_inventory = GREATEST(current_inventory - 5000, 0) 
            WHERE type = 'outlet'
        `);

    const lowNodes = await client.query(`
            SELECT id, type, max_capacity, current_inventory 
            FROM nodes 
            WHERE current_inventory < (max_capacity * 0.5) AND type != 'refinery'
        `);

    for (let node of lowNodes.rows) {
      const amountNeeded = node.max_capacity - node.current_inventory;

      let supplierId = 1;
      if (node.type === "outlet") {
        const route = await client.query(
          `SELECT source_node_id, transit_time FROM edges WHERE destination_node_id = $1`,
          [node.id],
        );
        if (route.rows.length > 0) supplierId = route.rows[0].source_node_id;
      }

      await client.query(
        `
                INSERT INTO shipments (source_id, destination_id, volume, status, dispatch_date, arrival_date)
                VALUES ($1, $2, $3, 'en_route', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day')
            `,
        [supplierId, node.id, amountNeeded],
      );

      await client.query(
        `
                UPDATE nodes SET current_inventory = current_inventory - $1 WHERE id = $2
            `,
        [amountNeeded, supplierId],
      );

      await client.query(`
            UPDATE nodes 
            SET current_inventory = LEAST(current_inventory + 100000, max_capacity) 
            WHERE type = 'refinery'
        `);
    }

    await client.query("COMMIT");

    const updatedState = await client.query(
      "SELECT * FROM nodes ORDER BY type, id",
    );
    res.json(updatedState.rows);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Simulation Tick Failed:", err.message);
    res.status(500).send("Server Error during simulation tick");
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`Supply Chain API server running on port ${PORT}`);
});
