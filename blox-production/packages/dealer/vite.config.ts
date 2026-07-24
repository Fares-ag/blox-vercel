import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

const analyze = process.env.npm_lifecycle_event === 'build:analyze';

export default defineConfig({
  plugins: [
    react(),
    analyze &&
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
  ].filter(Boolean),
  publicDir: path.resolve(__dirname, '../admin/public'),
  server: {
    port: 5176,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  build: {
    sourcemap: 'hidden',
    minify: 'esbuild',
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@dealer': path.resolve(__dirname, './src/modules/dealer'),
      '@shared': path.resolve(__dirname, '../shared/src'),
      // Reuse admin feature modules + store (relative imports inside those files resolve on disk)
      '@admin-module': path.resolve(__dirname, '../admin/src/modules/admin'),
    },
  },
});
