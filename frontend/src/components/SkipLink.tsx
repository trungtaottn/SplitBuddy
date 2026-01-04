import { useRef, useEffect } from 'react'

interface SkipLinkProps {
  targetId?: string
  label?: string
}

export function SkipLink({ 
  targetId = 'main-content', 
  label = 'Bỏ qua đến nội dung chính' 
}: SkipLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const target = document.getElementById(targetId)
    if (target) {
      target.focus()
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <a
      ref={linkRef}
      href={`#${targetId}`}
      onClick={handleClick}
      className="skip-link"
    >
      {label}
    </a>
  )
}

// Hook for managing focus
export function useFocusManagement() {
  const setFocus = (elementId: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      element.focus()
    }
  }

  const setFocusRef = <T extends HTMLElement>(ref: React.RefObject<T>) => {
    if (ref.current) {
      ref.current.focus()
    }
  }

  return { setFocus, setFocusRef }
}

// Component to announce changes to screen readers
export function LiveRegion({ 
  message, 
  politeness = 'polite' 
}: { 
  message: string
  politeness?: 'polite' | 'assertive' 
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

// Hook for announcing messages to screen readers
export function useAnnounce() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Create announcer container if it doesn't exist
    if (!containerRef.current) {
      const container = document.createElement('div')
      container.id = 'announcer'
      container.setAttribute('role', 'status')
      container.setAttribute('aria-live', 'polite')
      container.setAttribute('aria-atomic', 'true')
      container.className = 'sr-only'
      document.body.appendChild(container)
      containerRef.current = container
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.remove()
      }
    }
  }, [])

  const announce = (message: string) => {
    if (containerRef.current) {
      containerRef.current.textContent = message
      // Clear after announcement
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.textContent = ''
        }
      }, 1000)
    }
  }

  return announce
}

