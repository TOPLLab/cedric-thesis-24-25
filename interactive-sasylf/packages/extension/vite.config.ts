import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

import pkg from './package.json';

export default defineConfig(({ mode }) => ({
	plugins: [],
	build: {
		ssr: true,
		sourcemap: mode === "development" ? "inline" : false,
		lib: {
			entry: resolve(__dirname, 'src/extension.ts'),
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
