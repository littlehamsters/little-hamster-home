import { defineConfig } from 'vite';

const PORT = 8090;

export default defineConfig({
  root: '.',
  // Local dev, Netlify, Firebase and custom domains all serve at root ('/').
  // GitHub Pages serves under /little-hamster-home/ — the Pages workflow sets
  // DEPLOY_BASE for that build only, so local dev stays at '/'.
  base: process.env.DEPLOY_BASE || '/',
  server: {
    port: PORT,
    strictPort: true, // fail instead of picking a new port if 8090 is taken
    open: true,
  },
  preview: {
    port: PORT,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
