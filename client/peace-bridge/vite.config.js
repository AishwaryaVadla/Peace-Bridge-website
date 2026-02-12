import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  root: '.',
  // Use repo path for GitHub Pages (case-sensitive)
  base: mode === 'development' ? '/' : '/Peace-Bridge-website/',
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
}))
