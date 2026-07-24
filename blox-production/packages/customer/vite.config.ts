import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const analyze = process.env.npm_lifecycle_event === 'build:analyze';

// Conditionally import Sentry plugin
async function getSentryPlugin() {
  try {
    const { sentryVitePlugin } = await import('@sentry/vite-plugin');
    return sentryVitePlugin;
  } catch (error) {
    // Sentry plugin not available, continue without it
    console.warn('@sentry/vite-plugin not found, skipping Sentry source map upload');
    return null;
  }
}

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

// https://vite.dev/config/
export default defineConfig(async () => {
  const sentryVitePlugin = await getSentryPlugin();
  const visualizerPlugin = await getVisualizerPlugin();
  
  return {
    plugins: [
      react(),
      // Sentry plugin for source maps upload (only in production builds)
      sentryVitePlugin && process.env.NODE_ENV === 'production' && process.env.SENTRY_AUTH_TOKEN
        ? sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT || 'blox-customer',
            authToken: process.env.SENTRY_AUTH_TOKEN,
          })
        : null,
      visualizerPlugin,
    ].filter(Boolean),
    build: {
      // 'hidden' keeps maps for Sentry upload but never serves them publicly
      sourcemap: 'hidden',
      minify: 'esbuild',
      target: 'es2020',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // @mui/icons-material removed: named imports tree-shake fine via Rollup
            'mui-vendor': ['@mui/material', '@emotion/react', '@emotion/styled'],
            'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
            // chart-vendor removed from customer: only used on admin dashboard
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
        '@customer': path.resolve(__dirname, './src/modules/customer'),
        '@shared': path.resolve(__dirname, '../shared/src'),
      },
    },
  };
});

