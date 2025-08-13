import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
	build: {
		outDir: 'build/renderer',
		target: 'es2019',
		emptyOutDir: false
	}
});
