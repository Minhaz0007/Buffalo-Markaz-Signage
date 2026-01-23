import path from 'path';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Determine build version: use Vercel commit SHA if available, otherwise current timestamp
// This is calculated once at config load time to ensure stability during dev server operation
const buildVersion = process.env.VERCEL_GIT_COMMIT_SHA || new Date().toISOString();

// Plugin to inject build timestamp for auto-update detection
const injectBuildTimestamp = (): Plugin => ({
  name: 'inject-build-timestamp',
  transformIndexHtml(html) {
    return html.replace('BUILD_TIMESTAMP', buildVersion);
  },
});

// Vite automatically loads environment variables prefixed with VITE_
// For Vercel deployment, set VITE_GEMINI_API_KEY in environment variables
export default defineConfig({
  // Base path: use './' for Electron, '/' for web deployment
  base: process.env.ELECTRON === 'true' ? './' : '/',
  server: {
    port: 5173, // Updated to match Electron dev server expectation
    host: '0.0.0.0',
  },
  plugins: [react(), injectBuildTimestamp()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    outDir: 'dist',
    // Optimize for Electron
    target: process.env.ELECTRON === 'true' ? 'esnext' : 'modules',
    minify: 'esbuild',
    sourcemap: false,
    // Performance optimizations
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'framer-motion': ['framer-motion'],
          'lucide': ['lucide-react'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'lucide-react'],
    // Exclude large dependencies that don't need pre-bundling
    exclude: [],
  }
});
