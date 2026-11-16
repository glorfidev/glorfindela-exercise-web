import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    env: {
      VITE_EXERCISE_API_URL: '/api',
      VITE_KEYCLOAK_URL: 'http://localhost:8081',
      VITE_KEYCLOAK_REALM: 'exercise',
      VITE_KEYCLOAK_CLIENT_ID: 'exercise-app',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts', 'src/main.tsx'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: { statements: 90, branches: 80, functions: 85, lines: 90 },
    },
  },
});
