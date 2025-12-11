import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { componentTagger } from "lovable-tagger";

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
      name: 'html-transform',
      transformIndexHtml(html: string) {
        const csp = `
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com;
          style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
          font-src 'self' https://fonts.gstatic.com data:;
          img-src 'self' data: https: blob:;
          connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.ipify.org http://localhost:3000;
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
}));
