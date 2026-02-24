import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { resolve } from 'node:path';
import dts from 'vite-plugin-dts';

import pkg from './package.json';

export default defineConfig((_) => ({
	plugins: [dts()],
	ssr: {
		noExternal: [/@bufbuild\/protobuf/]
	},
	build: {
		ssr: true,
		sourcemap: true,
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: pkg.name,
			fileName: 'index',
			formats: ['es'],
		},
		rollupOptions: {
			input: 'src/index.ts',
			external: [
				...Object.keys(pkg.devDependencies),
				'vscode',
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
