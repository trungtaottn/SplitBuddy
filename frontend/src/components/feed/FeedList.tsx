import React from 'react'
import { useGetFeed } from '@/hooks/useFeed'
import { ActivityItem } from './ActivityItem'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const FeedList: React.FC = () => {
  const { data, isLoading, isError, refetch } = useGetFeed()

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-red-400">Không thể tải hoạt động.</p>
        <Button onClick={() => refetch()} variant="outline" className="border-gray-700 text-gray-300">
          Thử lại
        </Button>
      </div>
    )
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-gray-900/40 rounded-xl border border-dashed border-gray-800">
        <p>Chưa có hoạt động nào.</p>
        <p className="text-sm mt-1">Các hoạt động mới sẽ xuất hiện tại đây.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.data.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
      
      {/* 
        TODO: Infinite Scroll Trigger 
        For now simple pagination via limit/offset in hook updates
      */}
    </div>
  )
}
