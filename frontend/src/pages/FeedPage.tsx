import React from 'react'
import { FeedList } from '@/components/feed/FeedList'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { useQueryClient } from '@tanstack/react-query'

// Export as default for lazy loading
const FeedPage: React.FC = () => {
  const queryClient = useQueryClient()

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-xl mx-auto space-y-6 pb-24">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-heading text-white tracking-tight">BẢNG TIN</h1>
          
          <div className="flex gap-2">
            <button className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <span className="sr-only">Lọc</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </button>
            <button className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <span className="sr-only">Tìm kiếm</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
          </div>
        </header>

        {/* Stories / Highlights Area (Future V2) */}
        {/* <div className="h-24 flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
           <div className="flex-shrink-0 w-20 h-full bg-gradient-to-br from-primary/20 to-orange-600/20 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-lg font-bold">+</div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Thêm tin</span>
           </div>
        </div> */}

        <PullToRefresh onRefresh={async () => {
          await queryClient.invalidateQueries({ queryKey: ['feed'] })
        }}>
          <FeedList />
        </PullToRefresh>
      </div>
    </div>
  )
}

export default FeedPage
