import { defineConfig, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { componentTagger } from "lovable-tagger";
import { mobileBlockerMiddleware } from "./src/middleware/mobileBlockerServer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-DNS-Prefetch-Control': 'off',
      'X-Download-Options': 'noopen',
      'X-Permitted-Cross-Domain-Policies': 'none',
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: 'mobile-blocker',
      configureServer(server: ViteDevServer) {
        server.middlewares.use(mobileBlockerMiddleware());
      },
    },
    {
      name: 'html-transform',
      transformIndexHtml(html: string) {
        const csp = `
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com;
          style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
          font-src 'self' https://fonts.gstatic.com data:;
          img-src 'self' data: https: blob:;
          connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.ipify.org http://localhost:3000 ws://localhost:3000;
          frame-ancestors 'none';
          base-uri 'self';
          form-action 'self';
          upgrade-insecure-requests;
        `.replaceAll(/\s+/g, ' ').trim();

        return html.replace(
          '<head>',
          `<head>
            <meta http-equiv="Content-Security-Policy" content="${csp}">`
        );
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ⚡ OPTIMIZACIÓN: Bundle splitting para mejor caché
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // React Query
          'vendor-query': ['@tanstack/react-query'],

          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],

          // PDF generation (solo se carga cuando se usa)
          'vendor-pdf': ['jspdf', 'html2canvas'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));
