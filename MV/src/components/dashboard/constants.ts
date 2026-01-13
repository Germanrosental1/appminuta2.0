import { Variants } from "framer-motion";

// Animation Variants
export const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

export const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 10
        }
    }
};

export const cardHoverEffects = {
    scale: 1.02,
    transition: { duration: 0.2 }
};

// Status color mapping
export const STATUS_COLORS: Record<string, string> = {
    'Disponible': '#22c55e',
    'Reservado': '#eab308',
    'Vendido': '#3b82f6',
    'No disponible': '#6b7280'
};

// Status display names
export const STATUS_NAMES: Record<string, string> = {
    'Disponibles': 'Disponible',
    'Reservadas': 'Reservado',
    'Vendidas': 'Vendido',
    'No disponibles': 'No disponible'
};
