import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isGithub = mode === 'github';

  return {
    plugins: [vue()],
    server: {
      port: 8080,
      cors: true,
      proxy: {
        '/api': {
          target: 'http://localhost:48080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api')
        }
      }
    },
    base: isGithub ? '/flowgram-ai-rule-engine/' : './',
    build: {
      outDir: 'dist'
    }
  }
})
