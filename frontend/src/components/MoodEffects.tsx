import { useMood, MoodType } from '@/contexts/MoodContext'

// More visible mood effects with soft gradients and floating shapes
const MOOD_COLORS: Record<MoodType, { gradient: string; shapes: string; glow: string }> = {
  happy: { gradient: 'from-amber-100/40 via-orange-50/30 to-yellow-100/20', shapes: 'bg-amber-400', glow: 'shadow-amber-300/50' },
  sad: { gradient: 'from-blue-100/40 via-slate-100/30 to-indigo-50/20', shapes: 'bg-blue-400', glow: 'shadow-blue-300/50' },
  tired: { gradient: 'from-violet-100/40 via-purple-50/30 to-indigo-100/20', shapes: 'bg-violet-400', glow: 'shadow-violet-300/50' },
  stressed: { gradient: 'from-emerald-100/40 via-teal-50/30 to-cyan-100/20', shapes: 'bg-emerald-400', glow: 'shadow-emerald-300/50' },
  excited: { gradient: 'from-pink-100/40 via-rose-50/30 to-red-100/20', shapes: 'bg-pink-400', glow: 'shadow-pink-300/50' },
  neutral: { gradient: 'from-gray-50/20 to-transparent', shapes: 'bg-gray-300', glow: '' },
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
