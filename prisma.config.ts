import { defineConfig, env } from "prisma/config";

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
    // The CLI (migrate, studio) needs a direct connection: a transaction pooler
    // can't run DDL.
    url: env("DATABASE_URL"),
  },
});
