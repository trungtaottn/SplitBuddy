import React, { useState } from 'react'
import { FeedActivity } from '@/types/api'
import { CommentSection } from './CommentSection'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Receipt, 
  PartyPopper, 
  Banknote, 
  Trophy, 
  MessageCircle, 
  Heart,
  Share2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useLikeActivity } from '@/hooks/useFeed'
import { cn } from '@/lib/utils'

interface ActivityItemProps {
  activity: FeedActivity
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'bill_created':
      return { icon: Receipt, color: 'text-orange-400', bg: 'bg-orange-400/10' }
    case 'session_created':
      return { icon: PartyPopper, color: 'text-purple-400', bg: 'bg-purple-400/10' }
    case 'payment_sent':
      return { icon: Banknote, color: 'text-green-400', bg: 'bg-green-400/10' }
    case 'achievement_unlocked':
      return { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10' }
    default:
      return { icon: Share2, color: 'text-blue-400', bg: 'bg-blue-400/10' }
  }
}

const getActivityContent = (activity: FeedActivity) => {
  const { type, meta_data } = activity
  
  switch (type) {
    case 'bill_created':
      return (
        <div>
          <span className="text-gray-300">đã tạo hóa đơn </span>
          <span className="font-semibold text-white">"{meta_data.description}"</span>
          <span className="text-gray-300"> với giá trị </span>
          <span className="font-bold text-orange-400">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: meta_data.currency || 'VND' }).format(Number(meta_data.amount))}
          </span>
        </div>
      )
    case 'session_created':
      return (
        <div>
           <span className="text-gray-300">đã mở cuộc nhậu </span>
           <span className="font-semibold text-purple-400">"{meta_data.name}"</span>
           {meta_data.location && <span className="text-gray-400"> tại {meta_data.location}</span>}
        </div>
      )
    case 'payment_sent':
      return (
        <div>
          <span className="text-gray-300">đã thanh toán </span>
          <span className="font-bold text-green-400">
             {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: meta_data.currency || 'VND' }).format(Number(meta_data.amount))}
          </span>
          <span className="text-gray-400 text-sm block mt-1">qua {meta_data.method}</span>
        </div>
      )
    case 'achievement_unlocked':
      return (
        <div>
          <span className="text-gray-300">đã mở khóa thành tựu </span>
          <span className="font-bold text-yellow-400 flex items-center gap-1 inline-flex">
            <Trophy className="w-3 h-3" />
            {meta_data.achievement_name}
          </span>
          <span className="text-gray-400 text-xs block mt-1">+{meta_data.xp_reward} XP</span>
        </div>
      )
    default:
      return <span className="text-gray-300">đã thực hiện một hoạt động mới</span>
  }
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const { icon: Icon, color, bg } = getActivityIcon(activity.type)
  const { mutate: toggleLike } = useLikeActivity()
  const [showComments, setShowComments] = useState(false)

  const handleLike = () => {
    toggleLike(activity.id)
  }

  return (
    <Card className="border-gray-800 bg-gray-900/40 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex gap-4">
          <Avatar className="w-10 h-10 border-2 border-gray-800">
            <AvatarImage src={activity.user.avatar || undefined} />
            <AvatarFallback>{activity.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-200 text-sm sm:text-base">
                  {activity.user.name}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                   {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: vi })}
                </p>
              </div>
              
              <div className={cn("p-2 rounded-full", bg)}>
                <Icon className={cn("w-4 h-4", color)} />
              </div>
            </div>

            <div className="mt-2 text-sm sm:text-base leading-relaxed">
              {getActivityContent(activity)}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-800/50">
               <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-8 px-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 gap-1.5 transition-colors",
                  activity.user_interaction.has_liked && "text-red-500 hover:text-red-600 bg-red-500/10"
                )}
                onClick={handleLike}
               >
                 <Heart className={cn("w-4 h-4", activity.user_interaction.has_liked && "fill-current")} />
                 <span className="text-xs font-medium">{activity.stats.likes}</span>
               </Button>
               
               <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 gap-1.5 transition-colors"
                onClick={() => setShowComments(!showComments)}
               >
                 <MessageCircle className="w-4 h-4" />
                 <span className="text-xs font-medium">{activity.stats.comments}</span>
               </Button>
            </div>

            {showComments && (
              <CommentSection activityId={activity.id} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
