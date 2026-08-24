import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: base must match your GitHub repo name for GitHub Pages
// Repo: https://github.com/sayadawtejinda/dhamma -> base: '/dhamma/'
export default defineConfig({
  plugins: [react()],
  base: '/dhamma/',
})
