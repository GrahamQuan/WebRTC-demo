import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    'process.env': import.meta.env,
  },
  build: {
    outDir: 'dist',
  },
})
