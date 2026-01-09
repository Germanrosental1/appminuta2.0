import type { Connect } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Server-side mobile detection middleware for Vite
 * Redirects mobile users to a static blocked page during development
 */
export function mobileBlockerMiddleware() {
    return (req: Connect.IncomingMessage, res: any, next: () => void) => {
        const userAgent = req.headers['user-agent'] || '';

        // Check for mobile patterns
        const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
        const isMobile = mobileRegex.test(userAgent.toLowerCase());

        // Only redirect HTML requests, not assets
        const isHtmlRequest = !req.url?.includes('.') && !req.url?.startsWith('/@');

        if (isMobile && isHtmlRequest && req.url !== '/mobile-blocked.html') {
            // Read and serve the mobile blocked HTML file
            const htmlPath = path.resolve(process.cwd(), 'public', 'mobile-blocked.html');

            if (fs.existsSync(htmlPath)) {
                const html = fs.readFileSync(htmlPath, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
                return;
            }
        }

        next();
    };
}
