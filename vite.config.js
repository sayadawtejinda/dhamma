import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// IMPORTANT: base must match your GitHub repo name for GitHub Pages
// Repo: https://github.com/sayadawtejinda/dhamma -> base: '/dhamma/'
export default defineConfig({
  plugins: [react()],
  // every 'firebase/firestore' import goes through a thin wrapper that counts the documents read (see src/firestoreCounted.js)
  resolve: { alias: [{ find: /^firebase\/firestore$/, replacement: resolve(__dirname, 'src/firestoreCounted.js') }] },
  base: '/dhamma/',
  // Dev-only: honour PORT so the preview tool can assign a free port
  // (falls back to Vite's default 5173 when PORT is not set).
  server: { port: process.env.PORT ? Number(process.env.PORT) : 5173 },
  build: {
    rollupOptions: {
      // paramattha.html is a second, independent page (not part of the
      // Tutoring single-page app / Firebase) -- listing it here makes Vite
      // build it as its own bundle, deployed alongside index.html by the
      // same GitHub Actions workflow, reachable at /dhamma/paramattha.html.
      // vithicitta.html is the same pattern, a third independent page,
      // reachable at /dhamma/vithicitta.html. rupa.html is a fourth,
      // reachable at /dhamma/rupa.html.
      input: {
        main: resolve(__dirname, 'index.html'),
        paramattha: resolve(__dirname, 'paramattha.html'),
        vithicitta: resolve(__dirname, 'vithicitta.html'),
        rupa: resolve(__dirname, 'rupa.html'),
      },
    },
  },
})
