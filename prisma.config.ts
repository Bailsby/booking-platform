import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads .env on its own. Load it when present; in CI and on
// Vercel the variables come from the environment and there is no file.
try {
  process.loadEnvFile();
} catch {
  // No .env file — rely on the environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The CLI (migrate, studio) needs a direct connection: Neon's pooler runs
    // in transaction mode and can't hold the lock migrations take. The app
    // connects through DATABASE_URL, which may be pooled. Locally both are the
    // same database. Optional, so `prisma generate` works with neither set.
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL,
  },
});
