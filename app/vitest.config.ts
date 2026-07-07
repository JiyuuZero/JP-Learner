// Standalone vitest config — deliberately does NOT extend vite.config.ts so tests
// never load the PWA/Tailwind plugins. Progress-logic tests are pure node;
// render tests (e.g. src/display/ruby.test.tsx) opt into jsdom per-file via a
// `// @vitest-environment jsdom` docblock.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
