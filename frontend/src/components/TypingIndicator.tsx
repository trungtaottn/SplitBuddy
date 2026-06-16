import { useSessionActivity } from '@/contexts/use-websocket'
import { motion, AnimatePresence } from 'framer-motion'

export function TypingIndicator({ sessionId }: { sessionId: string }) {
  const activity = useSessionActivity(sessionId)
  
  // Filter for 'typing' action
  const typingUsers = activity.filter(a => a.action === 'typing')
  
  if (typingUsers.length === 0) return null

  return (
    <div className="flex items-center gap-2 h-6">
      <AnimatePresence mode="popLayout">
        <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <div className="flex gap-1 items-center bg-muted/50 px-2 py-1 rounded-full">
            <div className="flex gap-1">
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce" />
            </div>
            <span className="font-medium">
              {typingUsers.length === 1 
                ? `${typingUsers[0].userName} is typing...`
                : `${typingUsers.length} people are typing...`
              }
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
