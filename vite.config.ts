import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { watchRoomPlugin } from './src/vite/watchRoomPlugin'

/**
 * Vite `base` must match where the browser loads the app from.
 * stall.party / Cloudflare: base '/'
 * GitLab Pages path deploys still use CI_PAGES_URL or PAGES_BASE.
 */
function viteBase(): string {
  const explicit = process.env.PAGES_BASE ?? process.env.VITE_BASE
  if (explicit !== undefined && explicit !== '') {
    const b = explicit.startsWith('/') ? explicit : `/${explicit}`
    return b === '/' ? '/' : b.endsWith('/') ? b : `${b}/`
  }
  const pagesUrl = process.env.CI_PAGES_URL
  if (pagesUrl) {
    try {
      let pathname = new URL(pagesUrl).pathname
      pathname = pathname.replace(/\/$/, '') || '/'
      if (pathname === '/') return '/'
      return `${pathname}/`
    } catch {
      /* ignore */
    }
  }
  if (process.env.CI && process.env.CI_PROJECT_NAME) {
    return `/${process.env.CI_PROJECT_NAME}/`
  }
  return '/'
}

// https://vitejs.dev/config/
export default defineConfig({
  base: viteBase(),
  plugins: [react(), watchRoomPlugin()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
}) 