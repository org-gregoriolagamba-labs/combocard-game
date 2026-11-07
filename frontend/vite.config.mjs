import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const BACKEND = 'http://localhost:3001';
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [react()],
  // Shown in "Info e contatti": the version of package.json and the moment of the build
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(new Date().toISOString()),
  },
  // Build in `build/` as with CRA, so Nginx, CI and the docs keep working.
  build: { outDir: 'build', sourcemap: false },
  server: {
    port: 3000,
    strictPort: true,
    // Reachable from the LAN (phones on the same network).
    host: true,
    proxy: {
      '/api': BACKEND,
      '/socket.io': { target: BACKEND, ws: true },
    },
  },
  preview: { port: 3000, strictPort: true, host: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    // Same as CRA's Jest: mocks are reset before each test.
    mockReset: true,
    css: false,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: { provider: 'v8', include: ['src/**/*.{js,jsx}'], reporter: ['text', 'lcov'] },
  },
});
