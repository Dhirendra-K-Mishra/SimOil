const pool = require('./db');

// Realistic Business Constants
const TOTAL_DAYS = 730; 
const NUM_DEPOTS = 13;
const OUTLETS_PER_DEPOT = 250;
const REFINERY_DAILY_OUTPUT = 4750000; // 4.75M Liters
const DEPOT_CAPACITY = 12500000; // 12.5M Liters (mid-point of 10-15M)
const OUTLET_DAILY_DEMAND = 4000; // 4k Liters/day

async function seedDatabase() {
    try {
        console.log('Starting overhaul: 730-day seasonal, clustered simulation...');

        // 1. Reset
        await pool.query('DELETE FROM shipments');
        await pool.query('DELETE FROM demand_history');
        await pool.query('DELETE FROM edges');
        await pool.query('DELETE FROM nodes');

        // 2. Refinery
        const refineryRes = await pool.query(
            `INSERT INTO nodes (type, name, max_capacity, current_inventory, latitude, longitude)
             VALUES ('refinery', 'Main Refinery', 20000000, 20000000, 0, 0) RETURNING id`
        );
        const refineryId = refineryRes.rows[0].id;

        // 3. Depots & Clustered Outlets
        for (let i = 0; i < NUM_DEPOTS; i++) {
            const depotX = Math.cos(i) * 150;
            const depotY = Math.sin(i) * 150;

            const depotRes = await pool.query(
                `INSERT INTO nodes (type, name, max_capacity, current_inventory, latitude, longitude)
                 VALUES ('depot', 'Depot ${i + 1}', $1, $2, $3, $4) RETURNING id`,
                [DEPOT_CAPACITY, DEPOT_CAPACITY * 0.7, depotX, depotY]
            );
            const depotId = depotRes.rows[0].id;

            // Generate 730 days of Aggregate Demand for the Depot's entire cluster
            const clusterDailyDemand = OUTLETS_PER_DEPOT * OUTLET_DAILY_DEMAND;
            
            for (let day = 0; day < TOTAL_DAYS; day++) {
                const date = new Date();
                date.setDate(date.getDate() - (TOTAL_DAYS - day));
                
                // Seasonal spike logic
                const month = date.getMonth();
                const seasonalMultiplier = (month >= 5 && month <= 7) ? 1.3 : 1.0;
                const dailyDemand = Math.floor(clusterDailyDemand * seasonalMultiplier * (0.9 + Math.random() * 0.2));

                await pool.query(
                    `INSERT INTO demand_history (node_id, date, actual_demand)
                     VALUES ($1, $2, $3)`,
                    [depotId, date.toISOString().split('T')[0], dailyDemand]
                );
            }
        }
        console.log('Database successfully overhauled with 730 days of data.');
        // Allow predicted-only rows: make actual_demand nullable if currently NOT NULL
        try {
            await pool.query("ALTER TABLE demand_history ALTER COLUMN actual_demand DROP NOT NULL");
            console.log('Relaxed demand_history.actual_demand NOT NULL constraint.');
        } catch (err) {
            console.warn('Could not modify demand_history constraint (it may already be nullable):', err.message);
        }

        // Run forecasting script to populate predicted_demand for next days
        try {
            const { execSync } = require('child_process');
            console.log('Running forecast training script...');
            execSync('python forecast/train_and_insert.py --horizon 14', { stdio: 'inherit' });
            console.log('Forecast script completed.');
        } catch (err) {
            console.error('Forecast script failed (ensure Python and required packages are installed):', err.message);
        }
    } catch (error) {
        console.error('Seeding error:', error);
    } finally {
        pool.end();
    }
}

seedDatabase();