import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitLab Pages serves at https://<namespace>.gitlab.io/<CI_PROJECT_NAME>/
const pagesBase =
  process.env.CI && process.env.CI_PROJECT_NAME
    ? `/${process.env.CI_PROJECT_NAME}/`
    : '/'

// https://vitejs.dev/config/
export default defineConfig({
  base: pagesBase,
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
}) 