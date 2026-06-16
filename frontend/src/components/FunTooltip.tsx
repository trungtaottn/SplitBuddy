import { useState, useRef, ReactNode, MouseEvent } from 'react'
import { createPortal } from 'react-dom'

/**
 * FunTooltip - Vintage Paper Style
 * Displays random fun messages on hover
 */

interface FunTooltipProps {
  children: ReactNode
  messages: string[]
  delay?: number
}

export default function FunTooltip({ 
  children, 
  messages, 
  delay = 1500
}: FunTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = (e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    
    timeoutRef.current = setTimeout(() => {
      const randomMessage = messages[Math.floor(Math.random() * messages.length)]
      setCurrentMessage(randomMessage)
      setIsVisible(true)
    }, delay)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isVisible) {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  return (
    <>
      <div 
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="contents"
      >
        {children}
      </div>
      
      {isVisible && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none animate-paper-entrance"
          style={{
            left: mousePos.x,
            top: mousePos.y - 10,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {/* Vintage note style tooltip */}
          <div className="bg-card border-2 border-border text-foreground text-xs font-semibold px-3 py-2 rounded-sm shadow-paper whitespace-nowrap relative">
            {/* Corner fold */}
            <div className="absolute -top-px -right-px w-3 h-3 bg-background border-l border-b border-border" style={{ transform: 'rotate(0deg)' }} />
            {currentMessage}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
