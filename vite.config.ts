import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

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
  plugins: [
    react(),
    cspMetaPlugin(),
    // getUserMedia (camera/mic) only exists in a secure context — HTTPS, or
    // localhost. Opening the dev server's network URL (http://<lan-ip>:5173)
    // from another device is plain HTTP, so that device can never use the
    // camera without this. Self-signed, dev-only — `apply: 'serve'` keeps it
    // out of `vite build` entirely; the browser will warn about the
    // certificate once (Advanced -> proceed) the first time each device
    // opens it.
    { ...basicSsl(), apply: 'serve' },
  ],
  server: { host: true },
  build: {
    rollupOptions: {
      output: {
        // Split heavy, slow-changing libraries into their own cacheable
        // chunks instead of one monolithic bundle — a code change no longer
        // invalidates the vendor download, and the browser can fetch these
        // in parallel.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // check the narrower/more specific packages before the ones whose
          // names are substrings of others (@react-three/* contains "three")
          if (id.includes('@react-three')) return 'vendor-r3f'
          if (id.includes('@mediapipe')) return 'vendor-mediapipe'
          if (/node_modules[\\/](three|three-stdlib|three-mesh-bvh)[\\/]/.test(id)) {
            return 'vendor-three'
          }
          if (id.includes('react-dom') || id.includes('scheduler') || /node_modules[\\/]react[\\/]/.test(id)) {
            return 'vendor-react'
          }
          return 'vendor'
        },
      },
    },
    // three.js alone is legitimately ~900kB minified; the warning is only
    // useful for catching accidental bloat, which the split above already
    // prevents — raise the bar past three's own isolated chunk
    chunkSizeWarningLimit: 950,
  },
})
