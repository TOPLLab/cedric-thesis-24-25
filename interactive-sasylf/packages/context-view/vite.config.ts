import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';
import dts from 'vite-plugin-dts';

import pkg from './package.json';

export default defineConfig(({ mode }) => ({
  plugins: [devtools(), solidPlugin(), tailwindcss(), dts()],
  build: {
    sourcemap: mode === "dev",
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
