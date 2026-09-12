import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// IMPORTANT: base must match your GitHub repo name for GitHub Pages
// Repo: https://github.com/sayadawtejinda/dhamma -> base: '/dhamma/'
export default defineConfig({
  plugins: [react()],
  base: '/dhamma/',
  build: {
    rollupOptions: {
      // paramattha.html is a second, independent page (not part of the
      // Tutoring single-page app / Firebase) -- listing it here makes Vite
      // build it as its own bundle, deployed alongside index.html by the
      // same GitHub Actions workflow, reachable at /dhamma/paramattha.html.
      // vithicitta.html is the same pattern, a third independent page,
      // reachable at /dhamma/vithicitta.html.
      input: {
        main: resolve(__dirname, 'index.html'),
        paramattha: resolve(__dirname, 'paramattha.html'),
        vithicitta: resolve(__dirname, 'vithicitta.html'),
      },
    },
  },
})
