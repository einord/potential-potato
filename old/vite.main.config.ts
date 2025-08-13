import { defineConfig } from 'vite';
import { builtinModules } from 'module';

// https://vitejs.dev/config
export default defineConfig({
    build: {
        outDir: 'build',
        ssr: true,
        target: 'node18',
        emptyOutDir: true,
        lib: {
            entry: 'src/main.ts',
            formats: ['cjs'],
            fileName: () => 'main.js'
        },
        rollupOptions: {
            external: [
                'smb2',
                ...builtinModules
            ]
        }
    }
});
