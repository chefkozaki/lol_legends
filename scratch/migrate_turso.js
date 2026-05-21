const { createClient } = require("@libsql/client");
require("dotenv").config();

async function run() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (!url || !token) {
    console.error("Error: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing in .env");
    process.exit(1);
  }

  console.log("Connecting to Turso:", url);
  const client = createClient({ url, authToken: token });

  try {
    console.log("Running migration on Turso...");
    await client.execute("ALTER TABLE Team ADD COLUMN abbreviation TEXT;");
    console.log("Success! Added column 'abbreviation' to Team table.");
  } catch (error) {
    if (
      error.message.includes("duplicate column") || 
      error.message.includes("already exists") ||
      error.message.includes("duplicate column name")
    ) {
      console.log("Column 'abbreviation' already exists on Team table. Skipping.");
    } else {
      console.error("Migration failed:", error);
      process.exit(1);
    }
  } finally {
    client.close();
  }
}

run();
