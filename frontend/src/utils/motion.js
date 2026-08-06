// Primitivas de animación compartidas (framer-motion).
// motion.div / motion.tr etc. se exportan ya desestructurados porque ESLint
// (sin eslint-plugin-react) no reconoce <motion.div> como uso de la variable
// "motion" y lo marca como no-unused-vars.
import { motion } from 'framer-motion';

export const MotionDiv   = motion.div;
export const MotionTr    = motion.tr;
export const MotionTbody = motion.tbody;
export const MotionLi    = motion.li;
export const MotionUl    = motion.ul;

export { AnimatePresence } from 'framer-motion';

// Contenedor: aplica a un padre con initial="hidden" animate="show" para que
// sus hijos (con staggerItem) entren en cascada en vez de todos a la vez.
export const staggerContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};

export const staggerItem = {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    show:   { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 340, damping: 30 } },
};

// Igual que staggerItem pero sin scale, más sutil para filas de tabla densas.
export const staggerRow = {
    hidden: { opacity: 0, y: 10 },
    show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 32 } },
};
