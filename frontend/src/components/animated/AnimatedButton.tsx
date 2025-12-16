import { motion, HTMLMotionProps } from 'framer-motion';

type MotionButtonProps = HTMLMotionProps<'button'> & {
    variant?: 'default' | 'primary' | 'danger';
};

/**
 * Botón con micro-interacciones
 * Hover: escala 1.02
 * Tap: escala 0.98
 */
export const AnimatedButton = ({
    children,
    className = '',
    variant = 'default',
    ...props
}: MotionButtonProps) => {
    const variants = {
        default: 'bg-gray-100 hover:bg-gray-200',
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        danger: 'bg-red-600 hover:bg-red-700 text-white',
    };

    return (
        <motion.button
            className={`px-4 py-2 rounded-md transition-colors ${variants[variant]} ${className}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
            {...props}
        >
            {children}
        </motion.button>
    );
};

/**
 * Card con hover effect sutil
 */
export const AnimatedCard = ({
    children,
    className = ''
}: {
    children: React.ReactNode;
    className?: string
}) => (
    <motion.div
        className={className}
        whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        transition={{ duration: 0.2 }}
    >
        {children}
    </motion.div>
);
