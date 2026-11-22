import { defineConfig } from 'vite';

export default defineConfig({
  root: 'ui',
  // assets live under _vh/ so hashed UI files cannot collide with a live film page's own absolute /assets/ requests
  build: { outDir: '../dist/ui', emptyOutDir: true, assetsDir: '_vh' }
});
