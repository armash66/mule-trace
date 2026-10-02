/**
 * MuleTrace Motion Specification Tokens & Variants (framer-motion).
 * Calm, purposeful, and fast (120ms - 320ms).
 */

export const motionTokens = {
  duration: {
    fast: 0.12,
    base: 0.20,
    slow: 0.32,
    graph: 0.40,
  },
  ease: {
    standard: [0.2, 0, 0, 1],
    exit: [0.4, 0, 1, 1],
  },
};

export const pageTransitionVariants = {
  initial: { opacity: 0, y: 4 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: motionTokens.duration.base, 
      ease: motionTokens.ease.standard 
    } 
  },
  exit: { 
    opacity: 0, 
    y: -4, 
    transition: { 
      duration: motionTokens.duration.fast, 
      ease: motionTokens.ease.exit 
    } 
  },
};

export const rowHoverTransition = {
  duration: motionTokens.duration.fast,
  ease: motionTokens.ease.standard,
};

export const modalVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    transition: { 
      duration: motionTokens.duration.fast, 
      ease: motionTokens.ease.standard 
    } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.98, 
    transition: { 
      duration: motionTokens.duration.fast, 
      ease: motionTokens.ease.exit 
    } 
  },
};

export const toastVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: motionTokens.duration.base, 
      ease: motionTokens.ease.standard 
    } 
  },
  exit: { 
    opacity: 0, 
    y: 8, 
    transition: { 
      duration: motionTokens.duration.fast, 
      ease: motionTokens.ease.exit 
    } 
  },
};
