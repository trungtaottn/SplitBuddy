import { useMood, MoodType } from '@/contexts/MoodContext'

// Subtle, natural mood effects - no emojis, just gentle visual cues
const MOOD_COLORS: Record<MoodType, { from: string; to: string; dots: string }> = {
  happy: { from: 'from-amber-200/10', to: 'to-orange-100/5', dots: 'bg-amber-300' },
  sad: { from: 'from-blue-200/10', to: 'to-slate-100/5', dots: 'bg-blue-300' },
  tired: { from: 'from-violet-200/10', to: 'to-purple-100/5', dots: 'bg-violet-300' },
  stressed: { from: 'from-emerald-200/10', to: 'to-teal-100/5', dots: 'bg-emerald-300' },
  excited: { from: 'from-pink-200/10', to: 'to-rose-100/5', dots: 'bg-pink-300' },
  neutral: { from: 'from-gray-100/5', to: 'to-transparent', dots: 'bg-gray-300' },
}

export function MoodEffects() {
  const { mood } = useMood()
  
  if (mood === 'neutral') return null

  const colors = MOOD_COLORS[mood]

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Subtle gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.from} ${colors.to} transition-all duration-1000`} />
      
      {/* Soft bokeh dots - very subtle */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${colors.dots} opacity-[0.08] blur-xl`}
            style={{
              width: `${80 + i * 40}px`,
              height: `${80 + i * 40}px`,
              left: `${10 + i * 15}%`,
              top: `${5 + (i % 3) * 30}%`,
              animation: `gentle-float ${20 + i * 5}s ease-in-out infinite`,
              animationDelay: `${i * 2}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes gentle-float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -15px); }
        }
      `}</style>
    </div>
  )
}
