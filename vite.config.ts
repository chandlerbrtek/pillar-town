import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the app from /pillar-town/
export default defineConfig({
  base: '/pillar-town/',
  plugins: [react()],
});
