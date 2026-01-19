import React from 'react'
import { FeedList } from '@/components/feed/FeedList'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

// Export as default for lazy loading
const FeedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-xl mx-auto px-4 pb-20 pt-6">
         {/* Title area to replace Layout header if needed, or rely on global nav */}
         <div className="flex items-center justify-between mb-6">
           <h1 className="text-xl font-bold font-heading tracking-tight">Bảng tin</h1>
         </div>

         {/* Status update placeholder */}
         <div className="flex items-center gap-3 py-4 mb-2">
            <div className="flex-1 bg-gray-800/50 h-10 rounded-full px-4 flex items-center text-gray-500 text-sm border border-gray-700">
               Bạn đang nghĩ gì?
            </div>
            <Button size="icon" className="rounded-full bg-indigo-600 hover:bg-indigo-500">
               <Plus className="w-5 h-5 text-white" />
            </Button>
         </div>

         <div className="mb-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Hoạt động mới nhất</h2>
            <FeedList />
         </div>
      </div>
    </div>
  )
}

export default FeedPage
