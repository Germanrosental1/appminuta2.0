import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
}

/**
 * Componente para transiciones suaves entre páginas
 * Usa animaciones GPU-accelerated para mejor performance
 */
export const PageTransition = ({ children }: PageTransitionProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
            duration: 0.2,
            ease: "easeOut",
        }}
        style={{ willChange: 'transform, opacity' }}
    >
        {children}
    </motion.div>
);

/**
 * Componente para fade in simple
 */
export const FadeIn = ({ children, delay = 0 }: PageTransitionProps & { delay?: number }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay }}
    >
        {children}
    </motion.div>
);

/**
 * Componente para slide in desde diferentes direcciones
 */
export const SlideIn = ({
    children,
    direction = 'up'
}: PageTransitionProps & { direction?: 'up' | 'down' | 'left' | 'right' }) => {
    const directions = {
        up: { y: 20 },
        down: { y: -20 },
        left: { x: 20 },
        right: { x: -20 },
    };

    return (
        <motion.div
            initial={{ opacity: 0, ...directions[direction] }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
        >
            {children}
        </motion.div>
    );
};
