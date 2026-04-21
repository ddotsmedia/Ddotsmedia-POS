import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  main: {
    root: path.resolve(__dirname, 'src'),
    build: {
      outDir: path.resolve(__dirname, 'dist/main'),
      rollupOptions: {
        input: path.resolve(__dirname, 'src/main/main.ts'),
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    root: path.resolve(__dirname, 'src'),
    build: {
      outDir: path.resolve(__dirname, 'dist/main'),
      rollupOptions: {
        input: path.resolve(__dirname, 'src/main/preload.ts'),
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: path.resolve(__dirname, 'src/renderer'),
    build: {
      outDir: path.resolve(__dirname, 'dist/renderer'),
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer'),
      },
    },
    server: {
      port: 5173,
    },
  },
});
