import { motion, AnimatePresence, Variants, Transition } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import { ReactNode, useRef, cloneElement } from 'react'

// Page transition variants - simple fade for smooth feel
const pageVariants: Variants = {
  initial: {
    opacity: 0,
  },
  in: {
    opacity: 1,
  },
  out: {
    opacity: 0,
  },
}

const pageTransition: Transition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.15,
}

/**
 * AnimatedOutlet - Properly handles route transitions with AnimatePresence
 * 
 * The key insight: We use useOutlet() to get the outlet element, then cache it.
 * AnimatePresence keeps the OLD element mounted during exit animation,
 * so we need to cache by location.key to render the correct content for each key.
 */
export function AnimatedOutlet() {
  const location = useLocation()
  const outlet = useOutlet()
  
  // Cache outlets by location key - this is the magic!
  // When AnimatePresence keeps an old key mounted for exit animation,
  // we render the cached outlet for that key (the old page)
  const outletCache = useRef<Map<string | undefined, React.ReactElement | null>>(new Map())
  
  // Always store current outlet for current location
  if (outlet) {
    outletCache.current.set(location.key, cloneElement(outlet, { key: location.key }))
  }

  return (
    <AnimatePresence 
      mode="wait"
      onExitComplete={() => {
        // Clean up old cache entries, keep only current
        const currentOutlet = outletCache.current.get(location.key)
        outletCache.current.clear()
        if (currentOutlet) {
          outletCache.current.set(location.key, currentOutlet)
        }
      }}
    >
      <motion.div
        key={location.key}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        {outletCache.current.get(location.key) ?? outlet}
      </motion.div>
    </AnimatePresence>
  )
}

// Legacy wrapper for backward compatibility - now just wraps children
interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.key}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Slide variants for different directions
export const slideVariants = {
  slideRight: {
    initial: { x: -30, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 30, opacity: 0 },
  },
  slideLeft: {
    initial: { x: 30, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -30, opacity: 0 },
  },
  slideUp: {
    initial: { y: 30, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -30, opacity: 0 },
  },
  slideDown: {
    initial: { y: -30, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 30, opacity: 0 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scale: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
  },
}

// Stagger children animations
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
}

// Fade in animation for elements
export function FadeIn({ 
  children, 
  delay = 0,
  duration = 0.5,
  className = '',
}: { 
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Scale on hover for interactive elements
export function ScaleOnHover({ 
  children,
  scale = 1.02,
  className = '',
}: { 
  children: ReactNode
  scale?: number
  className?: string
}) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Pop animation for success states
export function PopIn({ 
  children,
  delay = 0,
  className = '',
}: { 
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        delay,
        type: 'spring',
        stiffness: 500,
        damping: 20,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Shake animation for errors
export function Shake({ 
  children,
  trigger,
  className = '',
}: { 
  children: ReactNode
  trigger: boolean
  className?: string
}) {
  return (
    <motion.div
      animate={trigger ? { x: [0, -10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// List animation with stagger
export function AnimatedList({ 
  children,
  className = '',
}: { 
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedListItem({ 
  children,
  className = '',
}: { 
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={staggerItem}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Smooth collapse animation
export function Collapse({ 
  isOpen,
  children,
  className = '',
}: { 
  isOpen: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={className}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Number counter animation
export function CountUp({
  value,
  className = '',
}: {
  value: number
  className?: string
}) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={value}
      >
        {value.toLocaleString('vi-VN')}
      </motion.span>
    </motion.span>
  )
}
