import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        eligibility: resolve(__dirname, 'eligibility.html'),
        structures: resolve(__dirname, 'structures.html'),
        glossary: resolve(__dirname, 'glossary.html'),
        about: resolve(__dirname, 'about.html'),
      },
    },
  },
});
