export type MoodType = 'happy' | 'sad' | 'tired' | 'stressed' | 'excited' | 'neutral'

interface MoodTheme {
  primary: string
  secondary: string
  accent: string
  background: string
  darkBackground: string
  gradient: string
  textColor: string
  cardBg: string
  borderColor: string
}

export interface MoodConfig {
  name: string
  nameVi: string
  emoji: string
  theme: MoodTheme
  aiPersonality: string
  greetings: string[]
  ambientSound: string | null
}

export const MOOD_CONFIGS: Record<MoodType, MoodConfig> = {
  happy: {
    name: 'happy',
    nameVi: 'Vui vẻ',
    emoji: '',
    theme: {
      primary: '#f97316',
      secondary: '#fbbf24',
      accent: '#fb923c',
      background: 'from-orange-50 via-amber-50 to-yellow-50',
      darkBackground: 'from-orange-950 via-amber-950 to-yellow-950',
      gradient: 'from-orange-500 to-amber-500',
      textColor: 'text-orange-900',
      cardBg: 'bg-gradient-to-br from-orange-50 to-amber-50',
      borderColor: 'border-orange-200',
    },
    aiPersonality: 'vui vẻ, hài hước, hay đùa, sử dụng nhiều từ ngữ tích cực',
    greetings: [
      'Chào bạn! Hôm nay trông bạn vui quá! Có chuyện gì hay kể tôi nghe đi!',
      'Ê, thấy bạn vui là tôi cũng vui lây rồi đó! Làm gì vui thế?',
      'Wow, năng lượng tích cực quá! Chia sẻ với tôi đi nào!',
    ],
    ambientSound: '/sounds/happy-ambient.mp3',
  },
  sad: {
    name: 'sad',
    nameVi: 'Buồn',
    emoji: '',
    theme: {
      primary: '#3b82f6',
      secondary: '#60a5fa',
      accent: '#93c5fd',
      background: 'from-blue-50 via-slate-50 to-gray-100',
      darkBackground: 'from-blue-950 via-slate-950 to-gray-950',
      gradient: 'from-blue-500 to-slate-500',
      textColor: 'text-blue-900',
      cardBg: 'bg-gradient-to-br from-blue-50 to-slate-50',
      borderColor: 'border-blue-200',
    },
    aiPersonality: 'nhẹ nhàng, đồng cảm, an ủi, lắng nghe, không phán xét',
    greetings: [
      'Này, tôi thấy bạn có vẻ không vui lắm... Muốn tâm sự gì không?',
      'Có chuyện gì à? Tôi đây, sẵn sàng lắng nghe bạn.',
      'Đôi khi cuộc sống khó khăn lắm, tôi hiểu mà. Kể tôi nghe đi.',
    ],
    ambientSound: '/sounds/sad-ambient.mp3',
  },
  tired: {
    name: 'tired',
    nameVi: 'Mệt mỏi',
    emoji: '',
    theme: {
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      accent: '#c4b5fd',
      background: 'from-violet-50 via-purple-50 to-indigo-50',
      darkBackground: 'from-violet-950 via-purple-950 to-indigo-950',
      gradient: 'from-violet-500 to-purple-500',
      textColor: 'text-violet-900',
      cardBg: 'bg-gradient-to-br from-violet-50 to-purple-50',
      borderColor: 'border-violet-200',
    },
    aiPersonality: 'nhẹ nhàng, thư giãn, khuyến khích nghỉ ngơi, không tạo áp lực',
    greetings: [
      'Trông bạn mệt quá... Hôm nay làm việc nhiều à?',
      'Này, đừng cố quá nhé. Nghỉ ngơi một chút đi.',
      'Mệt thì cứ thả lỏng đi, có gì tôi giúp được không?',
    ],
    ambientSound: '/sounds/tired-ambient.mp3',
  },
  stressed: {
    name: 'stressed',
    nameVi: 'Căng thẳng',
    emoji: '',
    theme: {
      primary: '#10b981',
      secondary: '#34d399',
      accent: '#6ee7b7',
      background: 'from-emerald-50 via-teal-50 to-cyan-50',
      darkBackground: 'from-emerald-950 via-teal-950 to-cyan-950',
      gradient: 'from-emerald-500 to-teal-500',
      textColor: 'text-emerald-900',
      cardBg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-200',
    },
    aiPersonality: 'bình tĩnh, hỗ trợ, đưa ra lời khuyên thực tế, giúp giảm stress',
    greetings: [
      'Hít thở sâu nào... Có gì căng thẳng kể tôi nghe đi.',
      'Stress à? Bình tĩnh, mọi chuyện rồi sẽ ổn thôi.',
      'Tôi biết bạn đang áp lực. Chia sẻ với tôi nhé, hai người gánh dễ hơn một người.',
    ],
    ambientSound: '/sounds/stressed-ambient.mp3',
  },
  excited: {
    name: 'excited',
    nameVi: 'Hào hứng',
    emoji: '🔥',
    theme: {
      primary: '#ec4899',
      secondary: '#f472b6',
      accent: '#f9a8d4',
      background: 'from-pink-50 via-rose-50 to-red-50',
      darkBackground: 'from-pink-950 via-rose-950 to-red-950',
      gradient: 'from-pink-500 to-rose-500',
      textColor: 'text-pink-900',
      cardBg: 'bg-gradient-to-br from-pink-50 to-rose-50',
      borderColor: 'border-pink-200',
    },
    aiPersonality: 'năng lượng cao, hào hứng, khuyến khích, sử dụng nhiều cảm thán',
    greetings: [
      'WOW! Năng lượng của bạn đang MAX rồi đó! Có gì hot thế?',
      'Ê ê, hào hứng gì thế? Kể tôi nghe đi!',
      'Thấy bạn hype quá! Có party gì không đấy?',
    ],
    ambientSound: '/sounds/excited-ambient.mp3',
  },
  neutral: {
    name: 'neutral',
    nameVi: 'Bình thường',
    emoji: '',
    theme: {
      primary: '#6b7280',
      secondary: '#9ca3af',
      accent: '#d1d5db',
      background: 'from-gray-50 via-slate-50 to-zinc-50',
      darkBackground: 'from-gray-950 via-slate-950 to-zinc-950',
      gradient: 'from-gray-500 to-slate-500',
      textColor: 'text-gray-900',
      cardBg: 'bg-gradient-to-br from-gray-50 to-slate-50',
      borderColor: 'border-gray-200',
    },
    aiPersonality: 'thân thiện, cân bằng, sẵn sàng trò chuyện về mọi thứ',
    greetings: [
      'Chào bạn! Hôm nay thế nào rồi?',
      'Này, có gì mới không?',
      'Ê, lâu rồi không gặp! Kể tôi nghe đi.',
    ],
    ambientSound: null,
  },
}
