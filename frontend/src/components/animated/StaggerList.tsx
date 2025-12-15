import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StaggerListProps {
    children: ReactNode;
    className?: string;
}

/**
 * Componente para animar listas con efecto stagger
 * Los items aparecen uno tras otro con un pequeño delay
 * 
 * @example
 * <StaggerList>
 *   {items.map(item => (
 *     <StaggerItem key={item.id}>
 *       <div>{item.name}</div>
 *     </StaggerItem>
 *   ))}
 * </StaggerList>
 */
export const StaggerList = ({ children, className }: StaggerListProps) => (
    <motion.div
        className={className}
        variants={{
            hidden: { opacity: 0 },
            show: {
                opacity: 1,
                transition: {
                    staggerChildren: 0.05, // 50ms entre cada item
                    delayChildren: 0.1,
                }
            }
        }}
        initial="hidden"
        animate="show"
    >
        {children}
    </motion.div>
);

/**
 * Item individual de la lista animada
 * Debe usarse dentro de StaggerList
 */
export const StaggerItem = ({ children, className }: StaggerListProps) => (
    <motion.div
        className={className}
        variants={{
            hidden: {
                opacity: 0,
                x: -20,
                scale: 0.95
            },
            show: {
                opacity: 1,
                x: 0,
                scale: 1,
                transition: {
                    duration: 0.3,
                    ease: "easeOut"
                }
            }
        }}
    >
        {children}
    </motion.div>
);

/**
 * Variante para tablas - usa motion.tbody
 */
export const StaggerTableBody = ({ children, className }: StaggerListProps) => (
    <motion.tbody
        className={className}
        variants={{
            hidden: {},
            show: {
                transition: {
                    staggerChildren: 0.03, // 30ms entre rows
                }
            }
        }}
        initial="hidden"
        animate="show"
    >
        {children}
    </motion.tbody>
);

/**
 * Variante para filas de tabla
 */
export const TableRowStagger = ({ children, className }: StaggerListProps) => (
    <motion.tr
        className={className}
        variants={{
            hidden: {
                opacity: 0,
                y: -5
            },
            show: {
                opacity: 1,
                y: 0,
                transition: {
                    duration: 0.2,
                    ease: "easeOut"
                }
            }
        }}
    >
        {children}
    </motion.tr>
);
