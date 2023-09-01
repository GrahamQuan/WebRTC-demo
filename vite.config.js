import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  define: {
    'process.env': import.meta.env,
  },
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        lobby: fileURLToPath(new URL('./lobby.html', import.meta.url)),
        main: './main.js'
      },
      output: {
        dir: 'dist',
        entryFileNames: '[name].js'
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: './vender/agora-rtm-sdk-1.5.1.js',
          dest: 'vender'
        }
      ]
    })
  ]
})

