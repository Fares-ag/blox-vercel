import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const analyze = process.env.npm_lifecycle_event === 'build:analyze';

async function getVisualizerPlugin() {
  if (!analyze) return null;
  try {
    const { visualizer } = await import('rollup-plugin-visualizer');
    return visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      open: false,
    });
  } catch {
    console.warn('rollup-plugin-visualizer not found, skipping bundle analysis');
    return null;
  }
}

export default defineConfig(async () => {
  const visualizerPlugin = await getVisualizerPlugin();
  return {
    plugins: [react(), visualizerPlugin].filter(Boolean),
    publicDir: path.resolve(__dirname, '../admin/public'),
    server: {
      port: 5179,
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
        '@finance': path.resolve(__dirname, './src/modules/finance'),
        '@shared': path.resolve(__dirname, '../shared/src'),
        '@admin-module': path.resolve(__dirname, '../admin/src/modules/admin'),
      },
    },
  };
});
