import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

import pkg from './package.json';

export default defineConfig(({ mode }) => ({
	plugins: [dts()],
	build: {
		ssr: true,
		sourcemap: mode === "development" ? "inline" : false,
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: pkg.name,
			fileName: 'extension',
			formats: ['es'],
		},
		rollupOptions: {
			external: [
				...Object.keys(pkg.dependencies),
				...Object.keys(pkg.devDependencies),
				'vscode'
			],
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
