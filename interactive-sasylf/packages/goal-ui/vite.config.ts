import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import dts from 'vite-plugin-dts';
import tailwindcss from '@tailwindcss/vite';

import pkg from './package.json';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    dts(),
    tailwindcss(),
  ],
  build: {
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
