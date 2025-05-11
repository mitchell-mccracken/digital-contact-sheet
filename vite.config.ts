import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: './', // Ensure relative paths for deployment
  build: {
    outDir: 'dist', // Default output directory
  },
});
