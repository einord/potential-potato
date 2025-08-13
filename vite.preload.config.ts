import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
	build: {
		outDir: '.vite/build',
		ssr: true,
		target: 'node18',
		lib: {
			entry: 'src/preload.ts',
			formats: ['cjs'],
			fileName: () => 'preload.js'
		}
	}
});
