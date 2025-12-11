import React, { useEffect } from 'react';
import { checkAndRedirectMobile } from '../middleware/mobileBlocker';

/**
 * MobileBlocker Component
 * Automatically detects mobile devices and redirects to blocked page
 * Used as a wrapper component in the app
 */
export const MobileBlocker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useEffect(() => {
        checkAndRedirectMobile();
    }, []);

    return <>{children}</>;
};

export default MobileBlocker;