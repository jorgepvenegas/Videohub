import { defineConfig } from 'vite';

// engines copy these two files into their film; they stay readable and unhashed, and each engine's own three is imported
export default defineConfig({
  build: {
    outDir: 'dist/engine-hooks',
    emptyOutDir: true,
    minify: false,
    lib: { entry: ['engine-hooks/vh2d.ts', 'engine-hooks/vhtweaks.ts'], formats: ['es'], fileName: (_format, name) => `${name}.js` },
    rollupOptions: { external: ['three'] }
  }
});
