const pool = require('./db');

const MONTHS_OF_HISTORY = 24; 
const OUTLETS_PER_DEPOT = [4, 3, 3];

const SEASONAL_MULTIPLIERS = [
    0.8, 0.8, 0.9, 1.0, 1.1, 1.4, 1.5, 1.4, 1.1, 0.9, 0.8, 0.9
];

async function seedDatabase() {
    try {
        console.log('Starting synthetic data generation (24-Month Seasonal Model)...');

        await pool.query('DELETE FROM shipments');
        await pool.query('DELETE FROM demand_history');
        await pool.query('DELETE FROM edges');
        await pool.query('DELETE FROM nodes');

        // 2. Create Refinery at center (0,0)
        const refineryRes = await pool.query(
            `INSERT INTO nodes (type, name, max_capacity, current_inventory, latitude, longitude)
             VALUES ('refinery', 'Main Refinery', 5000000, 5000000, 0, 0) RETURNING id`
        );
        const refineryId = refineryRes.rows[0].id;

        for (let i = 0; i < 3; i++) {
            const depotX = (i === 0) ? 100 : (i === 1) ? -100 : 0;
            const depotY = (i === 0) ? 100 : (i === 1) ? -100 : 150;

            const depotRes = await pool.query(
                `INSERT INTO nodes (type, name, max_capacity, current_inventory, latitude, longitude)
                 VALUES ('depot', 'Depot ${i + 1}', 500000, 250000, $1, $2) RETURNING id`,
                [depotX, depotY]
            );
            const depotId = depotRes.rows[0].id;

            // Link Refinery to Depot using Euclidean distance
            const distanceToDepot = Math.sqrt(Math.pow(depotX, 2) + Math.pow(depotY, 2));
            await pool.query(
                `INSERT INTO edges (source_node_id, destination_node_id, distance, transit_time)
                 VALUES ($1, $2, $3, $4)`,
                [refineryId, depotId, distanceToDepot, Math.ceil(distanceToDepot / 50)]
            );

            // Create Outlets assigned to this specific Depot
            for (let j = 0; j < OUTLETS_PER_DEPOT[i]; j++) {
                const outletX = depotX + (Math.random() * 40 - 20); 
                const outletY = depotY + (Math.random() * 40 - 20);
                
                const baselineMonthlyDemand = 15000 + Math.floor(Math.random() * 10000); 

                const outletRes = await pool.query(
                    `INSERT INTO nodes (type, name, max_capacity, current_inventory, latitude, longitude)
                     VALUES ('outlet', 'Outlet ${i + 1}-${j + 1}', 50000, 40000, $1, $2) RETURNING id`,
                    [outletX, outletY]
                );
                const outletId = outletRes.rows[0].id;

                const distanceToOutlet = Math.sqrt(Math.pow(outletX - depotX, 2) + Math.pow(outletY - depotY, 2));
                await pool.query(
                    `INSERT INTO edges (source_node_id, destination_node_id, distance, transit_time)
                     VALUES ($1, $2, $3, 1)`, // Last-mile delivery is always 1 day
                    [depotId, outletId, distanceToOutlet]
                );

                for (let m = 0; m < MONTHS_OF_HISTORY; m++) {
                    const date = new Date();
                    date.setMonth(date.getMonth() - (MONTHS_OF_HISTORY - m));
                    date.setDate(1); 
                    
                    const monthIndex = date.getMonth(); 
                    const seasonalMultiplier = SEASONAL_MULTIPLIERS[monthIndex];

                    const variance = 1 + ((Math.random() * 0.2) - 0.1); 
                    const actualDemand = Math.floor(baselineMonthlyDemand * seasonalMultiplier * variance);

                    await pool.query(
                        `INSERT INTO demand_history (node_id, date, actual_demand)
                         VALUES ($1, $2, $3)`,
                        [outletId, date.toISOString().split('T')[0], actualDemand]
                    );
                }
            }
        }
        console.log('Database successfully seeded with 24 months of seasonal data!');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        pool.end(); 
    }
}

seedDatabase();