/**
 * Mobile Device Detection Middleware
 * Detects mobile devices and redirects to a static blocked page
 */

export function isMobileDevice(): boolean {
    if (globalThis.window === undefined) return false;


    const userAgent = navigator.userAgent || (globalThis as any).opera;

    // Check for mobile patterns
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;

    return mobileRegex.test(userAgent.toLowerCase());
}

export function redirectToMobileBlockedPage(): void {
    globalThis.window.location.href = '/mobile-blocked.html';
}

export function checkAndRedirectMobile(): void {
    if (isMobileDevice()) {
        redirectToMobileBlockedPage();
    }
}
