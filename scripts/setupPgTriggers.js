const path = require("path");
// require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { Pool } = require("pg");

// Set up the PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use environment variable for connection string
});

// Check if the function exists
const checkFunctionSQL = `
SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_machine_latest_build_id'
);
`;

// Create the function if it does not exist
const createFunctionSQL = `
CREATE OR REPLACE FUNCTION update_machine_latest_build_id()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE machine
    SET latest_build_id = NEW.id
    WHERE id = NEW.machine_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

// Check if the trigger exists
const checkTriggerSQL = `
SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_latest_build'
);
`;

// Create the trigger if it does not exist
const createTriggerSQL = `
CREATE TRIGGER update_latest_build
AFTER INSERT ON machine_build
FOR EACH ROW
EXECUTE FUNCTION update_machine_latest_build_id();
`;

// Execute the SQL statements
async function setupTriggers() {
  try {
    // Check and create the function if it does not exist
    const functionExistsResult = await pool.query(checkFunctionSQL);
    const functionExists = functionExistsResult.rows[0].exists;
    console.log(
      "🎛️ update_machine_latest_build_id functionExists:",
      functionExists,
    ); // Debugging line
    if (!functionExists) {
      await pool.query(createFunctionSQL);
    }

    // Check and create the trigger if it does not exist
    const triggerExistsResult = await pool.query(checkTriggerSQL);
    const triggerExists = triggerExistsResult.rows[0].exists;
    if (!triggerExists) {
      await pool.query(createTriggerSQL);
    }

    console.log("Trigger setup complete");
  } catch (err) {
    console.error("Error setting up trigger:", err);
    process.exit(1); // Exit with failure
  } finally {
    await pool.end(); // Close the pool
  }
}

// Run the setup
setupTriggers();
