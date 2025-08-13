import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => {
  return {
    root: '.',
    plugins: [
      vue(),
      electron([
        {
          entry: 'src/main/index.ts',
          onstart(options) {
            options.startup()
          },
          vite: {
            build: {
              outDir: 'dist-electron/main',
              lib: { entry: 'src/main/index.ts', formats: ['cjs'] },
              rollupOptions: { output: { entryFileNames: 'index.js' } }
            }
          }
        },
        {
          entry: 'src/preload/index.ts',
          vite: {
            build: {
              outDir: 'dist-electron/preload',
              lib: { entry: 'src/preload/index.ts', formats: ['cjs'] },
              rollupOptions: { output: { entryFileNames: 'index.js' } }
            }
          }
        }
      ]),
      renderer()
    ],
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: resolve(__dirname, 'index.html')
      }
    },
    server: {
      port: 5173
    }
  }
})
