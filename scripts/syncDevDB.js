const { exec } = require("child_process");
require("dotenv").config({ path: "../.env" });

// Connection details
const connStr = process.env.DEV_DB_URL;
if (!connStr) {
  throw new Error("No DEV_DB_URL found");
}
if (!connStr.startsWith("postgres://devdb_user:")) {
  throw new Error("Not a valid DEV_DB_URL, should start with devdb_user");
}

const sqlFile = "../backup.sql";

// Command to drop all tables
const dropTablesCmd = `
psql "${connStr}" -c "
DO \\\$\\\$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \\\$\\\$;"
`;

// Command to restore the database from the .sql file
const restoreCmd = `psql "${connStr}" -f ${sqlFile}`;

// Execute the drop tables command
exec(dropTablesCmd, (err, stdout, stderr) => {
  if (err) {
    console.error(`Error dropping tables: ${stderr}`);
    process.exit(1);
  }
  console.log("Tables dropped successfully.");

  // Execute the restore command
  exec(restoreCmd, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error restoring database: ${stderr}`);
      process.exit(1);
    }
    console.log("Database restored successfully.");
  });
});
