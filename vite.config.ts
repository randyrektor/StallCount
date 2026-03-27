import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite `base` must match where the browser loads the app from:
 * - Subdomain Pages: https://score-app-xxxx.gitlab.io/ → base '/'
 * - Project path Pages: https://group.gitlab.io/score-app/ → base '/score-app/'
 *
 * In CI, prefer CI_PAGES_URL (set by GitLab on Pages jobs). Override anytime with PAGES_BASE or VITE_BASE (e.g. '/' or '/score-app/').
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