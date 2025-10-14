import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import dts from 'vite-plugin-dts'

import pkg from './package.json';

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
      compilerOptions: {
        declarationMap: true,
      },
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: pkg.name,
      fileName: 'main',
      formats: ['es']
    },
    rollupOptions: {
      // Make sure to externalize deps that shouldn't be bundled
      // into your library (React in this case)
      external: [
        ...Object.keys(pkg.devDependencies),
      ],
      output: {
        globals: {
          react: 'React',
        },
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

});
