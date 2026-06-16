import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import { ReactNode, useRef, useState, useEffect } from 'react'
import {
  fadeTextureTransition,
  fadeTextureVariants,
  pageTransition,
  pageVariants,
  paperSlideTransition,
  paperSlideVariants,
  staggerContainer,
  staggerItem,
} from '@/components/page-transition-animations'

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
  const [transitionType, setTransitionType] = useState<'pageTurn' | 'paperSlide' | 'fade'>('paperSlide')
  const prevPathname = useRef<string>('')
  
  // Detect navigation direction and choose transition
  useEffect(() => {
    if (prevPathname.current) {
      // Simple heuristic: use page turn for major navigation, paper slide for minor
      const isMajorNav = location.pathname.split('/').length !== prevPathname.current.split('/').length
      setTransitionType(isMajorNav ? 'pageTurn' : 'paperSlide')
    }
    prevPathname.current = location.pathname
  }, [location.pathname])
  
  const getVariants = () => {
    switch (transitionType) {
      case 'pageTurn':
        return pageVariants
      case 'paperSlide':
        return paperSlideVariants
      default:
        return fadeTextureVariants
    }
  }
  
  const getTransition = () => {
    switch (transitionType) {
      case 'pageTurn':
        return pageTransition
      case 'paperSlide':
        return paperSlideTransition
      default:
        return fadeTextureTransition
    }
  }

  if (!outlet) return null

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={getVariants()}
        transition={getTransition()}
        style={{
          willChange: 'opacity, transform',
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased',
          transformOrigin: 'center center',
        }}
      >
        {outlet}
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
