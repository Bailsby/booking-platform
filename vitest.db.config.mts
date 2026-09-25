import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Tests that need a real Postgres: the no-overlap guarantee lives in a database
// constraint, so it can only be tested against one. They use their own
// database, never the one `npm run dev` reads.
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5433/booking_platform_test'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['**/*.db.test.ts'],
    exclude: ['**/node_modules/**'],
    globalSetup: ['./test/db-setup.ts'],
    env: { DATABASE_URL: testDatabaseUrl, AUTH_SECRET: 'test-secret' },
    // Files share one database.
    fileParallelism: false,
  },
})
