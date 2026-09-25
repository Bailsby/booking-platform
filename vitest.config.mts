import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
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
