import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    // Database tests need Postgres; they run separately via `npm run test:db`.
    exclude: ['**/node_modules/**', '**/*.db.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules',
        '.next',
        'coverage',
        '**/*.test.ts',
        'src/generated/**',
        'src/lib/prisma.ts',
      ],
    },
  },
})
