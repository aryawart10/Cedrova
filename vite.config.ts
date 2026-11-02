import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves a project site from /<repo>/, so built asset URLs need
// that prefix. Dev stays at / so the local URL does not change.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Cedrova/' : '/',
  plugins: [react()],
  server: { port: 5273, strictPort: false, open: false },
}));
