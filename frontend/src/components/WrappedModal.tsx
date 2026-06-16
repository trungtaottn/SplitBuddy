import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Share2, X, Sparkles, Users, MapPin, Trophy, TrendingUp, Flame, Heart, Zap } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import { motion, AnimatePresence } from 'framer-motion'
import type { ApiResponse, WrappedStats } from '@/types/api'

interface WrappedModalProps {
  isOpen: boolean
  onClose: () => void
  year?: number
}

const SLIDES = [
  'intro',
  'sessions',
  'spending',
  'streak',
  'partner',
  'location',
  'personality',
  'achievements',
  'funfacts',
  'summary',
]

// Fun personality types based on stats
const getPersonality = (wrapped: WrappedStats) => {
  const avgSpent = wrapped.total_spent / (wrapped.total_sessions || 1)
  const socialScore = wrapped.unique_partners / (wrapped.total_sessions || 1)
  
  if (wrapped.total_sessions > 50) {
    return { emoji: '🎉', title: 'Party Legend', desc: 'Bạn là linh hồn của mọi buổi tiệc!' }
  }
  if (avgSpent > 500000) {
    return { emoji: '💎', title: 'Big Spender', desc: 'Chi tiền không tiếc tay!' }
  }
  if (socialScore > 0.8) {
    return { emoji: '🦋', title: 'Social Butterfly', desc: 'Giao lưu rộng, bạn bè khắp nơi!' }
  }
  if (wrapped.unique_locations > 10) {
    return { emoji: '🗺️', title: 'Explorer', desc: 'Luôn tìm kiếm địa điểm mới!' }
  }
  if (wrapped.achievements_earned > 5) {
    return { emoji: '🏆', title: 'Achievement Hunter', desc: 'Thu thập huy hiệu như sưu tầm!' }
  }
  return { emoji: '🍺', title: 'Casual Drinker', desc: 'Nhậu vừa đủ, sống cân bằng!' }
}

export default function WrappedModal({ isOpen, onClose, year = new Date().getFullYear() }: WrappedModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const { data: wrapped, isLoading } = useQuery({
    queryKey: ['wrapped', year],
    queryFn: async () => {
      const res = await api.get<ApiResponse<WrappedStats>>(`/wrapped/me?year=${year}`)
      return res.data.data
    },
    enabled: isOpen,
  })

  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0)
    }
  }, [isOpen])

  const nextSlide = () => {
    if (currentSlide < SLIDES.length - 1 && !isAnimating) {
      setIsAnimating(true)
      setCurrentSlide(prev => prev + 1)
      setTimeout(() => setIsAnimating(false), 500)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0 && !isAnimating) {
      setIsAnimating(true)
      setCurrentSlide(prev => prev - 1)
      setTimeout(() => setIsAnimating(false), 500)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `My Split Buddy ${year} Wrapped`,
        text: `I attended ${wrapped?.total_sessions} sessions and spent ${formatCurrency(wrapped?.total_spent || 0)} in ${year}! 🍻`,
        url: window.location.origin,
      })
    } catch {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(
        `My Split Buddy ${year} Wrapped: ${wrapped?.total_sessions} sessions, ${formatCurrency(wrapped?.total_spent || 0)} spent! 🍻`
      )
    }
  }

  const renderSlide = () => {
    if (!wrapped) return null

    switch (SLIDES[currentSlide]) {
      case 'intro':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <Sparkles className="w-16 h-16 text-yellow-400 mb-4 animate-pulse" />
            <h1 className="text-4xl font-bold text-white mb-2">
              Your {year}
            </h1>
            <h2 className="text-5xl font-black bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
              WRAPPED
            </h2>
            <p className="text-gray-400 mt-4">Hành trình một năm của bạn</p>
          </motion.div>
        )

      case 'sessions':
        return (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="text-8xl mb-4">🍻</div>
            <p className="text-gray-400 mb-2">Bạn đã tham gia</p>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-7xl font-black text-orange-400"
            >
              {wrapped.total_sessions}
            </motion.div>
            <p className="text-2xl text-white mt-2">buổi nhậu</p>
            {wrapped.favorite_day && (
              <p className="text-gray-400 mt-4">
                Ngày yêu thích: <span className="text-orange-300">{wrapped.favorite_day}</span>
              </p>
            )}
          </motion.div>
        )

      case 'spending':
        return (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <TrendingUp className="w-16 h-16 text-green-400 mb-4" />
            <p className="text-gray-400 mb-2">Tổng chi tiêu</p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-black text-green-400"
            >
              {formatCurrency(wrapped.total_spent)}
            </motion.div>
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-gray-400">Trung bình/buổi</p>
                <p className="text-xl font-bold text-white">{formatCurrency(wrapped.avg_per_session)}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-gray-400">Đã nhận lại</p>
                <p className="text-xl font-bold text-green-300">{formatCurrency(wrapped.total_received)}</p>
              </div>
            </div>
          </motion.div>
        )

      case 'streak':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <Flame className="w-16 h-16 text-orange-500 mb-4 animate-pulse" />
            <p className="text-gray-400 mb-2">Tháng nhậu nhiều nhất</p>
            <div className="text-6xl mb-2">🔥</div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-orange-400"
            >
              {wrapped.peak_month || 'Tháng 12'}
            </motion.div>
            <p className="text-gray-400 mt-4 text-sm">
              Với {wrapped.peak_month_sessions || wrapped.total_sessions} buổi nhậu
            </p>
            
            {/* Mini calendar visualization */}
            <div className="mt-6 grid grid-cols-6 gap-1">
              {[1,2,3,4,5,6,7,8,9,10,11,12].map((month) => (
                <div 
                  key={month}
                  className={`w-6 h-6 rounded text-xs flex items-center justify-center ${
                    month === (wrapped.peak_month_number || 12) 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-white/10 text-gray-500'
                  }`}
                >
                  {month}
                </div>
              ))}
            </div>
          </motion.div>
        )

      case 'partner':
        return (
          <motion.div
            initial={{ opacity: 0, rotate: -10 }}
            animate={{ opacity: 1, rotate: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <Users className="w-16 h-16 text-blue-400 mb-4" />
            <p className="text-gray-400 mb-2">Bạn đã party với</p>
            <div className="text-5xl font-black text-blue-400">{wrapped.unique_partners}</div>
            <p className="text-xl text-white">người khác nhau</p>
            
            {wrapped.top_partner && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4"
              >
                <p className="text-gray-400 text-sm">Partner in crime</p>
                <p className="text-2xl font-bold text-white">{wrapped.top_partner.name}</p>
                <p className="text-purple-300">{wrapped.top_partner.sessions_together} buổi cùng nhau</p>
              </motion.div>
            )}
          </motion.div>
        )

      case 'location':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <MapPin className="w-16 h-16 text-red-400 mb-4" />
            <p className="text-gray-400 mb-2">Đã khám phá</p>
            <div className="text-5xl font-black text-red-400">{wrapped.unique_locations}</div>
            <p className="text-xl text-white">địa điểm</p>
            
            {wrapped.favorite_location && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6"
              >
                <p className="text-gray-400 text-sm">Quán ruột</p>
                <p className="text-2xl font-bold text-orange-300">📍 {wrapped.favorite_location}</p>
              </motion.div>
            )}
          </motion.div>
        )

      case 'personality': {
        const personality = getPersonality(wrapped)
        return (
          <motion.div
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <Heart className="w-12 h-12 text-pink-400 mb-2" />
            <p className="text-gray-400 mb-4">Tính cách nhậu của bạn là...</p>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-8xl mb-4"
            >
              {personality.emoji}
            </motion.div>
            <h3 className="text-3xl font-black bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
              {personality.title}
            </h3>
            <p className="text-gray-400 mt-2">{personality.desc}</p>
          </motion.div>
        )
      }

      case 'achievements':
        return (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <Trophy className="w-16 h-16 text-yellow-400 mb-4" />
            <p className="text-gray-400 mb-2">Achievements mở khóa</p>
            <div className="text-5xl font-black text-yellow-400">{wrapped.achievements_earned}</div>
            <p className="text-xl text-white">huy hiệu mới</p>
            
            <p className="text-gray-400 mt-4">Trong {wrapped.groups_count} nhóm</p>
          </motion.div>
        )

      case 'funfacts':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <Zap className="w-12 h-12 text-yellow-400 mb-4" />
            <h3 className="text-2xl font-bold text-white mb-6">Fun Facts</h3>
            
            <div className="space-y-4 text-left w-full max-w-xs">
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white/10 rounded-lg p-3 flex items-center gap-3"
              >
                <span className="text-2xl">🌙</span>
                <div>
                  <p className="text-white font-medium">{wrapped.late_night_sessions} buổi</p>
                  <p className="text-xs text-gray-400">Nhậu đêm khuya (sau 22h)</p>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-white/10 rounded-lg p-3 flex items-center gap-3"
              >
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="text-white font-medium">{wrapped.longest_streak_weeks} tuần</p>
                  <p className="text-xs text-gray-400">Chuỗi nhậu liên tiếp dài nhất</p>
                </div>
              </motion.div>
              
              {wrapped.biggest_session && (
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white/10 rounded-lg p-3 flex items-center gap-3"
                >
                  <span className="text-2xl">💰</span>
                  <div>
                    <p className="text-white font-medium">{formatCurrency(wrapped.biggest_session.total_amount)}</p>
                    <p className="text-xs text-gray-400">Buổi nhậu tốn kém nhất</p>
                  </div>
                </motion.div>
              )}
              
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="bg-white/10 rounded-lg p-3 flex items-center gap-3"
              >
                <span className="text-2xl">💝</span>
                <div>
                  <p className="text-white font-medium">{wrapped.generous_score}%</p>
                  <p className="text-xs text-gray-400">Điểm hào phóng (hay mời)</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )

      case 'summary':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <h2 className="text-3xl font-bold text-white mb-6">Tổng kết {year}</h2>
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              <div className="bg-orange-500/20 rounded-lg p-3">
                <div className="text-2xl">🍻</div>
                <div className="text-xl font-bold text-orange-400">{wrapped.total_sessions}</div>
                <div className="text-xs text-gray-400">Sessions</div>
              </div>
              <div className="bg-green-500/20 rounded-lg p-3">
                <div className="text-2xl">💸</div>
                <div className="text-lg font-bold text-green-400">{formatCurrency(wrapped.total_spent)}</div>
                <div className="text-xs text-gray-400">Chi tiêu</div>
              </div>
              <div className="bg-blue-500/20 rounded-lg p-3">
                <div className="text-2xl">👥</div>
                <div className="text-xl font-bold text-blue-400">{wrapped.unique_partners}</div>
                <div className="text-xs text-gray-400">Bạn nhậu</div>
              </div>
              <div className="bg-yellow-500/20 rounded-lg p-3">
                <div className="text-2xl">🏆</div>
                <div className="text-xl font-bold text-yellow-400">{wrapped.achievements_earned}</div>
                <div className="text-xs text-gray-400">Badges</div>
              </div>
            </div>
            
            <Button 
              onClick={handleShare}
              className="mt-6 bg-gradient-to-r from-orange-500 to-pink-500"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Chia sẻ Wrapped
            </Button>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl h-[600px] p-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 border-none">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
          </div>
        ) : (
          <div className="relative h-full flex flex-col">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 text-white/60 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Slide content */}
            <div className="flex-1 p-6">
              <AnimatePresence mode="wait">
                {renderSlide()}
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="p-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className="text-white/60 hover:text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>

              {/* Dots indicator */}
              <div className="flex gap-2">
                {SLIDES.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentSlide ? 'bg-orange-500 w-4' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={nextSlide}
                disabled={currentSlide === SLIDES.length - 1}
                className="text-white/60 hover:text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
