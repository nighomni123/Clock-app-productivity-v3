import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Fix for @kitlangton/rolling-number React 19 compatibility:
// The library is pre-built with jsxDEV (dev JSX runtime) which is not available
// in React 19 production. We transform it to use jsx (automatic runtime) instead.
function rollingNumberReact19Fix() {
  return {
    name: 'rolling-number-react19-fix',
    enforce: 'pre',
    resolveId(id) {
      if (id === '@kitlangton/rolling-number/react') {
        return path.resolve(
          __dirname,
          'node_modules/@kitlangton/rolling-number/dist/react.js'
        );
      }
    },
    transform(code, id) {
      if (id.endsWith('node_modules/@kitlangton/rolling-number/dist/react.js')) {
        // Replace jsx-dev-runtime import with jsx-runtime
        code = code.replace(
          /from"react\/jsx-dev-runtime"/g,
          'from"react/jsx-runtime"'
        );
        // Replace jsxDEV function calls with jsx
        code = code.replace(/jsxDEV/g, 'jsx');
        return code;
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), rollingNumberReact19Fix()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Split heavyweight vendors into cacheable chunks so no single file
          // balloons (xlsx is already lazily imported by taskImport.ts).
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'vendor-motion': ['motion/react'],
          },
        },
      },
      // Firebase's Firestore SDK alone approaches ~760 kB minified (~191 kB
      // gzipped, cached as its own chunk); the ceiling stays meaningful for
      // catching real regressions while tolerating known-vendor weight.
      chunkSizeWarningLimit: 800,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
