/**
 * BeerIcon - Retro Vintage Illustration Style
 * A hand-drawn style beer glass icon matching the vintage paper aesthetic
 */

interface BeerIconProps {
  className?: string
  size?: number
  animated?: boolean
}

export function BeerIcon({ className = '', size = 24, animated = false }: BeerIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`inline-block ${animated ? 'animate-bounce' : ''} ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))',
      }}
    >
      {/* Beer glass - vintage illustration style */}
      {/* Glass outline - hand-drawn feel */}
      <path
        d="M20 18 L20 50 Q20 54 24 54 L40 54 Q44 54 44 50 L44 18"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Glass rim - top edge */}
      <path
        d="M18 18 L46 18"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      
      {/* Handle - vintage style */}
      <path
        d="M44 24 Q48 24 48 28 Q48 32 44 32"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Beer foam - top */}
      <ellipse
        cx="32"
        cy="18"
        rx="12"
        ry="3"
        fill="hsl(var(--secondary))"
        opacity="0.9"
      />
      
      {/* Foam bubbles - vintage detail */}
      <circle cx="28" cy="17" r="1.5" fill="hsl(var(--background))" opacity="0.8" />
      <circle cx="32" cy="16.5" r="1" fill="hsl(var(--background))" opacity="0.8" />
      <circle cx="36" cy="17" r="1.5" fill="hsl(var(--background))" opacity="0.8" />
      
      {/* Beer liquid - sepia tone */}
      <rect
        x="22"
        y="22"
        width="20"
        height="26"
        fill="hsl(var(--warning))"
        opacity="0.6"
        rx="2"
      />
      
      {/* Liquid highlight - vintage shine */}
      <ellipse
        cx="28"
        cy="28"
        rx="4"
        ry="8"
        fill="hsl(var(--warning))"
        opacity="0.3"
      />
      
      {/* Glass base - bottom detail */}
      <path
        d="M22 50 Q24 52 26 52 L38 52 Q40 52 42 50"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Vintage texture lines - hand-drawn feel */}
      <path
        d="M24 30 L40 30"
        stroke="hsl(var(--primary))"
        strokeWidth="0.5"
        strokeDasharray="1 1"
        opacity="0.3"
      />
      <path
        d="M24 38 L40 38"
        stroke="hsl(var(--primary))"
        strokeWidth="0.5"
        strokeDasharray="1 1"
        opacity="0.3"
      />
    </svg>
  )
}

