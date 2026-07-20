import { useMood, MoodType } from '@/contexts/MoodContext'

// More visible mood effects with soft gradients and floating shapes
// Dark Luxury compatible mood effects (Subtle, dark glows)
const MOOD_COLORS: Record<MoodType, { gradient: string; shapes: string; glow: string }> = {
  happy: { gradient: 'from-amber-900/10 via-orange-900/5 to-transparent', shapes: 'bg-amber-600', glow: 'shadow-amber-500/20' },
  sad: { gradient: 'from-blue-900/10 via-slate-900/5 to-transparent', shapes: 'bg-blue-600', glow: 'shadow-blue-500/20' },
  tired: { gradient: 'from-violet-900/10 via-purple-900/5 to-transparent', shapes: 'bg-violet-600', glow: 'shadow-violet-500/20' },
  stressed: { gradient: 'from-emerald-900/10 via-teal-900/5 to-transparent', shapes: 'bg-emerald-600', glow: 'shadow-emerald-500/20' },
  excited: { gradient: 'from-pink-900/10 via-rose-900/5 to-transparent', shapes: 'bg-pink-600', glow: 'shadow-pink-500/20' },
  neutral: { gradient: 'from-transparent to-transparent', shapes: 'bg-gray-800', glow: '' },
}

export function MoodEffects() {
  const { mood } = useMood()
  
  if (mood === 'neutral') return null

  const colors = MOOD_COLORS[mood]

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Main gradient overlay - more visible */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} transition-all duration-1000`} />
      
      {/* Floating soft shapes */}
      <div className="absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${colors.shapes} opacity-[0.15] blur-2xl ${colors.glow}`}
            style={{
              width: `${100 + i * 50}px`,
              height: `${100 + i * 50}px`,
              left: `${5 + (i * 12) % 80}%`,
              top: `${10 + (i * 17) % 70}%`,
              animation: `mood-float ${15 + i * 3}s ease-in-out infinite`,
              animationDelay: `${i * 1.5}s`,
            }}
          />
        ))}
      </div>
      
      {/* Corner accents */}
      <div className={`absolute -top-20 -right-20 w-80 h-80 rounded-full ${colors.shapes} opacity-[0.1] blur-3xl`} />
      <div className={`absolute -bottom-20 -left-20 w-60 h-60 rounded-full ${colors.shapes} opacity-[0.1] blur-3xl`} />

      <style>{`
        @keyframes mood-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
      `}</style>
    </div>
  )
}
