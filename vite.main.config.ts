import { defineConfig } from 'vite';
import { builtinModules } from 'module';

// https://vitejs.dev/config
export default defineConfig({
    build: {
        outDir: '.vite/build',
        ssr: true,
        target: 'node18',
        lib: {
            entry: 'src/main.ts',
            formats: ['cjs'],
            fileName: () => 'main.js'
        },
        rollupOptions: {
            external: [
                'smb2',
                'electron-updater',
                ...builtinModules
            ]
        }
    }
});
