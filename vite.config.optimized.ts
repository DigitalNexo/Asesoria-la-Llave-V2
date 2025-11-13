import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Optimizaciones de build
    target: 'es2020', // Target más moderno para mejor optimización
    minify: 'esbuild', // esbuild es más rápido que terser
    sourcemap: false, // Desactivar sourcemaps en producción acelera el build
    cssCodeSplit: true, // Split CSS para mejor caching
    chunkSizeWarningLimit: 1000, // Aumentar límite para reducir warnings
    rollupOptions: {
      output: {
        // Optimizar chunking para mejor caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-toast', '@radix-ui/react-dialog'],
        },
      },
    },
    // Optimizaciones de rendimiento
    reportCompressedSize: false, // No reportar tamaño comprimido (más rápido)
    assetsInlineLimit: 4096, // Inline assets pequeños
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  // Optimizaciones adicionales
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }, // Reducir warnings
    treeShaking: true,
  },
});
