import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
	build: {
		outDir: 'build',
		ssr: true,
		target: 'node18',
		emptyOutDir: false,
		lib: {
			entry: 'src/preload.ts',
			formats: ['cjs'],
			fileName: () => 'preload.js'
		}
	}
});
