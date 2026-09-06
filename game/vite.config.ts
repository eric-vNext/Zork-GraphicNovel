import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite marks its own bundles `crossorigin`, which puts same-origin subresource
 * requests into CORS mode. That buys nothing for an app served from one
 * origin, and it costs offline play: a CORS-mode request asking a service
 * worker for a cached response is refused, so the page loads its shell from
 * the cache and then goes blank. Stripping the attribute makes them ordinary
 * same-origin requests, which the worker can answer.
 */
function sameOriginAssets(): Plugin {
  return {
    name: 'same-origin-assets',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/<script([^>]*?)\scrossorigin(=(""|''|"[^"]*"))?/g, '<script$1')
        .replace(/<link([^>]*?)\scrossorigin(=(""|''|"[^"]*"))?/g, '<link$1')
        // The bundle is an IIFE, so the module type is not only unnecessary,
        // it is the thing that forces the CORS-mode fetch. `defer` keeps the
        // execution timing a module script gave us for free: after parsing,
        // when #root exists.
        .replace(/<script\s+type="module"/g, '<script defer');
    },
  };
}

export default defineConfig({
  plugins: [react(), sameOriginAssets()],
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
    // A classic script rather than a module, for the same reason: a
    // `type="module"` script is always fetched in CORS mode whatever its
    // attributes say, and that is the one request a service worker cannot
    // satisfy from cache. The app is a single entry with no dynamic imports,
    // so an IIFE bundle costs nothing and boots offline.
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
});
