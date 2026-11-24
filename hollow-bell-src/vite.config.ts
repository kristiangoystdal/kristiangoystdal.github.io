import { defineConfig } from 'vitest/config'

// Built by GitHub Actions into ../hollow-bell (not in git) and served at /hollow-bell/.
// base './' keeps every path relative, so the same build works on localhost and on github.io.
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  build: {
    outDir: '../hollow-bell',
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: { input: { main: 'index.html', remote: 'remote.html' } },
  },
  preview: { port: 4173, strictPort: true },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
