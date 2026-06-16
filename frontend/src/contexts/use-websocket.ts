import { useContext, useEffect } from 'react'
import { WebSocketContext } from './websocket-context'

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

export function useSessionPresence(sessionId?: string) {
  const { subscribeToSession, unsubscribeFromSession, sessionPresence } = useWebSocket()

  useEffect(() => {
    if (sessionId) {
      subscribeToSession(sessionId)
      return () => {
        unsubscribeFromSession(sessionId)
      }
    }
  }, [sessionId, subscribeToSession, unsubscribeFromSession])

  return sessionId ? (sessionPresence.get(sessionId) || []) : []
}

export function useSessionActivity(sessionId?: string) {
  const { activeUsers } = useWebSocket()
  return sessionId ? Array.from(activeUsers.get(sessionId)?.values() || []) : []
}
