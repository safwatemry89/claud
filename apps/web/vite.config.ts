import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API = process.env.API_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': API, '/auth': API } },
});
