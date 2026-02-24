/**
 * Shared animation constants for framer-motion and Tailwind transitions.
 * Single source of truth — all modal/sheet/card animations reference these values.
 */

// Framer-motion spring config (used by BottomSheet, modals)
export const SPRING = {
  type: 'spring',
  damping: 25,
  stiffness: 300,
};

// Backdrop (overlay behind modals/sheets)
export const BACKDROP = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

// Center modal (scale + fade)
export const CENTER_MODAL = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
  transition: SPRING,
};

// Bottom sheet (slide up from bottom)
export const BOTTOM_SHEET = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
  transition: SPRING,
};

// Staggered card enter (for list items)
export const cardEnterVariants = {
  initial: { opacity: 0, y: 12 },
  animate: (index) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      delay: index * 0.05,
    },
  }),
};
