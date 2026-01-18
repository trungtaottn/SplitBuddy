import React, { useState } from 'react'
import { useGetComments, useAddComment } from '@/hooks/useFeed'
import { ActivityComment } from '@/types/api'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface CommentSectionProps {
  activityId: string
}

export const CommentSection: React.FC<CommentSectionProps> = ({ activityId }) => {
  const { data: comments, isLoading } = useGetComments(activityId)
  const { mutate: addComment, isPending: isAdding } = useAddComment()
  const [content, setContent] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    addComment(
      { activityId, content },
      {
        onSuccess: () => setContent(''),
      }
    )
  }

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-gray-500">Đang tải bình luận...</div>
  }

  return (
    <div className="space-y-4 pt-4 border-t border-gray-800/50">
      <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar px-1">
        {comments && comments.length > 0 ? (
          comments.map((comment: ActivityComment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="w-8 h-8 border border-gray-700">
                <AvatarImage src={comment.user.avatar || undefined} />
                <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="bg-gray-800/50 rounded-2xl px-3 py-2 text-sm">
                  <span className="font-semibold text-gray-200 block text-xs mb-0.5">
                    {comment.user.name}
                  </span>
                  <p className="text-gray-300 leading-relaxed">{comment.content}</p>
                </div>
                <p className="text-[10px] text-gray-500 pl-2">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: vi })}
                </p>
              </div>
            </div>
          ))
        ) : (
            <p className="text-center text-xs text-gray-500 py-2">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Viết bình luận..."
          className="h-9 text-sm bg-gray-900/50 border-gray-700/50 focus-visible:ring-indigo-500/30"
          disabled={isAdding}
        />
        <Button 
            type="submit" 
            size="icon" 
            disabled={!content.trim() || isAdding}
            className="w-9 h-9 shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  )
}
