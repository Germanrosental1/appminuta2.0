const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_STORAGE_KEY = 'xsrf_token';

export const generateCSRFToken = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const setCSRFToken = (): string => {
    const token = generateCSRFToken();
    sessionStorage.setItem(CSRF_STORAGE_KEY, token);
    document.cookie = `${CSRF_COOKIE_NAME}=${token}; path=/; SameSite=Strict`;
    return token;
};

export const getCSRFToken = (): string | null => {
    let token = sessionStorage.getItem(CSRF_STORAGE_KEY);
    if (!token) {
        const cookies = document.cookie.split(';');
        const csrfCookie = cookies.find(c => c.trim().startsWith(`${CSRF_COOKIE_NAME}=`));
        if (csrfCookie) {
            token = csrfCookie.split('=')[1];
            sessionStorage.setItem(CSRF_STORAGE_KEY, token);
        }
    }
    if (!token) {
        token = setCSRFToken();
    }
    return token;
};
