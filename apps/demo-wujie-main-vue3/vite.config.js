import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isGithub = mode === 'github';
  
  return {
    plugins: [vue()],
    server: {
      port: 8080,
      cors: true
    },
    base: isGithub ? '/flowgram-ai-rule-engine/' : './',
    build: {
      outDir: 'dist'
    }
  }
})