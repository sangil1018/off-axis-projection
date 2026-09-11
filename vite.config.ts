import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Injects a Content-Security-Policy <meta> tag into the production build only.
 * A meta CSP in dev would fight Vite's HMR websocket / inline dev client, so
 * this only runs for `vite build`.
 */
function cspMetaPlugin(): Plugin {
  const csp = [
    "default-src 'self'",
    // MediaPipe's FilesetResolver loads its wasm glue as a <script> element
    // from jsdelivr, not just fetch() — needs the host in script-src too
    "script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
    // React sets inline style properties; MediaPipe/three may too
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    // wasm + models fetched from these two hosts; blob:/data: for dropped
    // files and generated URLs
    "connect-src 'self' blob: data: https://cdn.jsdelivr.net https://storage.googleapis.com",
    "base-uri 'self'",
    "form-action 'self'",
    // frame-ancestors is meaningless via <meta> (browsers ignore it there) —
    // set it as a real HTTP header at the hosting layer instead
  ].join('; ')

  return {
    name: 'csp-meta-prod-only',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`,
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), cspMetaPlugin()],
  server: { host: true },
})
