import { execFileSync } from "node:child_process";
import { Client } from "pg";

// Creates the test database if needed and brings it up to the latest
// migration, so `npm run test:db` works on a fresh container and in CI.
export default async function setup() {
  const url = new URL(
    process.env.TEST_DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5433/booking_platform_test",
  );
  const database = url.pathname.slice(1);

  const admin = new Client({ connectionString: new URL("/postgres", url).toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      database,
    ]);
    // Identifiers can't be parameterised; the name comes from our own config.
    if (rowCount === 0) await admin.query(`CREATE DATABASE "${database.replace(/"/g, "")}"`);
  } finally {
    await admin.end();
  }

  // Runs the CLI through node directly: npx is a .cmd shim on Windows, which
  // Node will only spawn via a shell.
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: "inherit",
  });
}
