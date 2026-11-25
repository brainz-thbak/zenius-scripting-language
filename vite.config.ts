import { isBuiltin } from 'node:module'
import { fileURLToPath } from 'node:url'
import dts from 'unplugin-dts/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      exclude: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**'],
      entryRoot: 'src/zsl',
      outDirs: [
        { dir: 'dist', moduleFormat: 'esm' },
        { dir: 'dist', moduleFormat: 'cjs' },
      ],
    }),
  ],
  build: {
    target: 'node24',
    lib: {
      entry: fileURLToPath(new URL('./src/zsl/index.ts', import.meta.url)),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.cjs'),
    },
    rolldownOptions: {
      external: isBuiltin,
    },
  },
})
