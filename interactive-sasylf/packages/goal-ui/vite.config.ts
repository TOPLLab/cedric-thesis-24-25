import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import dts from 'vite-plugin-dts'

import pkg from './package.json'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    dts(),
  ],
  build: {
    outDir: "dist",
    sourcemap: mode === "development" ? "inline" : false,
    rollupOptions: {
      external: [
        ...Object.keys(pkg.devDependencies),
      ],
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
    ],
  },
}));
