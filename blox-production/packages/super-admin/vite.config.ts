import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Conditionally import Sentry plugin
async function getSentryPlugin() {
  try {
    const { sentryVitePlugin } = await import('@sentry/vite-plugin');
    return sentryVitePlugin;
  } catch {
    // Sentry plugin not available, continue without it
    console.warn('@sentry/vite-plugin not found, skipping Sentry source map upload');
    return null;
  }
}

// https://vite.dev/config/
export default defineConfig(async () => {
  const sentryVitePlugin = await getSentryPlugin();
  
  return {
    // Point to root directory for .env files (same as admin/customer packages)
    // Vite will look for .env.development in the root when running from workspace
    envDir: path.resolve(__dirname, '../../'),
    plugins: [
      react(),
      // Sentry plugin for source maps upload (only in production builds)
      sentryVitePlugin && process.env.NODE_ENV === 'production' && process.env.SENTRY_AUTH_TOKEN
        ? sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT || 'blox-super-admin',
            authToken: process.env.SENTRY_AUTH_TOKEN,
          })
        : null,
    ].filter(Boolean),
    build: {
      sourcemap: true,
      minify: 'esbuild',
      target: 'es2015',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
            'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
            'chart-vendor': ['chart.js', 'react-chartjs-2'],
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
        '@super-admin': path.resolve(__dirname, './src/modules/super-admin'),
        '@shared': path.resolve(__dirname, '../shared/src'),
      },
    },
  };
});
