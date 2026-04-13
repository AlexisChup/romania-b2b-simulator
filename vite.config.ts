import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        structures: resolve(__dirname, 'structures.html'),
        glossary: resolve(__dirname, 'glossary.html'),
        about: resolve(__dirname, 'about.html'),
      },
    },
  },
});
