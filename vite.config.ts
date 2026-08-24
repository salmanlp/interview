import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import fs from 'node:fs';

/**
 * SINGLE_FILE=1 produces one self-contained index.html (all CSS and JS
 * inlined, hash routing) for hosts that serve a single static file.
 */
const singleFile = process.env.SINGLE_FILE === '1';

/**
 * Public path the app is served from. Hosts that serve the app from a
 * subdirectory (GitHub Pages serves `/<repo>/`) need relative asset URLs.
 */
const basePath = process.env.BASE_PATH ?? (singleFile ? './' : '/');

function inlineAssets() {
  return {
    name: 'inline-assets',
    apply: 'build' as const,
    closeBundle() {
      if (!singleFile) return;
      const dir = path.resolve(__dirname, 'dist');
      const htmlPath = path.join(dir, 'index.html');
      let html = fs.readFileSync(htmlPath, 'utf8');

      html = html.replace(
        /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
        (_m, href: string) => {
          const file = path.join(dir, href.replace(/^\.?\//, ''));
          return fs.existsSync(file)
            ? `<style>${fs.readFileSync(file, 'utf8')}</style>`
            : _m;
        },
      );
      html = html.replace(
        /<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,
        (_m, src: string) => {
          const file = path.join(dir, src.replace(/^\.?\//, ''));
          return fs.existsSync(file)
            ? `<script type="module">${fs.readFileSync(file, 'utf8')}</script>`
            : _m;
        },
      );
      fs.writeFileSync(htmlPath, html);
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss(), inlineAssets()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: !singleFile,
    assetsInlineLimit: singleFile ? 100_000_000 : 4096,
    rollupOptions: {
      output: singleFile
        ? { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'app.[ext]' }
        : {
            // React and the router change far less often than app code, so they
            // get their own long-lived chunk.
            manualChunks: {
              vendor: ['react', 'react-dom', 'react-router-dom'],
            },
          },
    },
  },
});
