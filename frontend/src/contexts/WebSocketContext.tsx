import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import { api } from '@/lib/axios'
import { useAuth } from "@/contexts/AuthContext";

import { WsEvent, PresenceUser, isWsEvent, WsTicketResponse } from '@/types/websocket'
import { ApiResponse } from '@/types/api'
import { queryClient } from '@/lib/queryClient'
import { toast } from 'sonner'

interface WebSocketContextType {
  isConnected: boolean
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error'
  subscribeToSession: (sessionId: string) => void
  unsubscribeFromSession: (sessionId: string) => void
  sessionPresence: Map<string, PresenceUser[]>
  activeUsers: Map<string, Map<string, { userName: string, action: string, timestamp: number }>> // sessionId -> userId -> info
  reconnect: () => void
  sendActivity: (sessionId: string, action: string) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

const RECONNECT_INTERVAL_BASE = 1000
const MAX_RECONNECT_INTERVAL = 30000

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<WebSocketContextType['connectionStatus']>('disconnected')
  const [sessionPresence, setSessionPresence] = useState<Map<string, PresenceUser[]>>(new Map())
  const [activeUsers, setActiveUsers] = useState<Map<string, Map<string, { userName: string, action: string, timestamp: number }>>>(new Map())
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const subscriptionsRef = useRef<Set<string>>(new Set())
  const isConnectingRef = useRef(false)

  const handleEvent = useCallback((event: WsEvent) => {
    switch (event.type) {
      case 'Connected':
        console.log('WebSocket Connected:', event.user_id)
        break

      case 'BillUpdated':
      case 'BillDeleted':
        queryClient.invalidateQueries({ queryKey: ['bills', event.session_id] })
        queryClient.invalidateQueries({ queryKey: ['sessions', event.session_id] }) // Update total amount
        break

      case 'DebtsRecalculated':
        queryClient.invalidateQueries({ queryKey: ['debts', event.session_id] })
        // Also refetch session details as my_debt might change
        queryClient.invalidateQueries({ queryKey: ['sessions', event.session_id] })
        break
        
      case 'DebtUpdated':
         queryClient.invalidateQueries({ queryKey: ['debts', event.session_id] })
         break

      case 'ParticipantChanged':
        queryClient.invalidateQueries({ queryKey: ['sessions', event.session_id] })
        queryClient.invalidateQueries({ queryKey: ['debts', event.session_id] })
        break

      case 'SessionStatusChanged':
      case 'SessionUpdated':
        queryClient.invalidateQueries({ queryKey: ['sessions', event.session_id] })
        if (event.type === 'SessionStatusChanged' && event.status === 'ARCHIVED') {
          toast.info('Session has been archived.')
        }
        break

      case 'PresenceJoined':
        setSessionPresence((prev) => {
          const newMap = new Map(prev)
          const currentUsers = newMap.get(event.session_id) || []
          
          // Avoid duplicates
          if (!currentUsers.some(u => u.user_id === event.user_id)) {
            newMap.set(event.session_id, [
              ...currentUsers,
              {
                user_id: event.user_id,
                user_name: event.user_name,
                joined_at: new Date().toISOString(),
              },
            ])
          }
          return newMap
        })
        break

      case 'PresenceLeft':
        setSessionPresence((prev) => {
          const newMap = new Map(prev)
          const currentUsers = newMap.get(event.session_id) || []
          newMap.set(
            event.session_id,
            currentUsers.filter((u) => u.user_id !== event.user_id)
          )
          return newMap
        })
        break

      case 'PresenceList':
        setSessionPresence((prev) => {
          const newMap = new Map(prev)
          newMap.set(event.session_id, event.users)
          return newMap
        })
        break

      case 'NotificationReceived':
        toast(event.title, {
          description: 'Click to view details', // Enhancement: Add link
          // action: ...
        })
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
        break
        
      case 'UserActivity':
        setActiveUsers(prev => {
            const newMap = new Map(prev)
            const sessionMap = newMap.get(event.session_id) || new Map()
            
            // Update user activity
            sessionMap.set(event.user_id, {
                userName: event.user_name,
                action: event.action,
                timestamp: Date.now()
            })
            newMap.set(event.session_id, sessionMap)
            return newMap
        })
        
        // Auto-clear after 3 seconds
        setTimeout(() => {
            setActiveUsers(prev => {
                const newMap = new Map(prev)
                const sessionMap = newMap.get(event.session_id)
                if (sessionMap) {
                    const activity = sessionMap.get(event.user_id)
                    // Only clear if it hasn't been updated since
                    if (activity && Date.now() - activity.timestamp >= 3000) {
                        sessionMap.delete(event.user_id)
                        if (sessionMap.size === 0) {
                            newMap.delete(event.session_id)
                        } else {
                            newMap.set(event.session_id, sessionMap)
                        }
                    }
                }
                return newMap
            })
        }, 3500)
        break
      
      case 'Error':
        console.error('WebSocket Error from server:', event.message)
        break
    }
  }, [])

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnectingRef.current) return

    try {
      isConnectingRef.current = true
      setConnectionStatus(reconnectAttemptsRef.current > 0 ? 'reconnecting' : 'connecting')

      // 1. Get ticket
      const { data } = await api.post<ApiResponse<WsTicketResponse>>('/auth/ws-ticket')
      const ticket = data.data.ticket

      // 2. Connect
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const wsUrl = `${protocol}//${host}/api/ws?ticket=${ticket}`
      
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setConnectionStatus('connected')
        reconnectAttemptsRef.current = 0
        isConnectingRef.current = false
        console.log('WebSocket Client Connected')
        
        // Resubscribe to active sessions
        subscriptionsRef.current.forEach(sessionId => {
          ws.send(JSON.stringify({
            type: 'Subscribe',
            session_id: sessionId
          }))
        })
      }

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          if (isWsEvent(parsed)) {
            handleEvent(parsed)
          }
        } catch (error) {
          console.error('Failed to parse WS message:', error)
        }
      }

      ws.onclose = () => {
        setConnectionStatus('disconnected')
        wsRef.current = null
        isConnectingRef.current = false
        
        // Attempt reconnect
        const timeout = Math.min(
          MAX_RECONNECT_INTERVAL,
          RECONNECT_INTERVAL_BASE * 2 ** reconnectAttemptsRef.current
        )
        reconnectAttemptsRef.current += 1
        console.log(`WebSocket disconnected. Reconnecting in ${timeout}ms...`)
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (user) connect()
        }, timeout)
      }

      wsRef.current = ws
    } catch (error: any) {
      console.error('Failed to connect WebSocket:', error)
      isConnectingRef.current = false
      setConnectionStatus('error')

      // Stop reconnecting if Auth error (401/403)
      if (error.response?.status === 401 || error.response?.status === 403) {
          console.warn('WebSocket Auth failed. Stopping reconnect.')
          return
      }

      // Retry on other errors
      const timeout = Math.min(
          MAX_RECONNECT_INTERVAL,
          RECONNECT_INTERVAL_BASE * 2 ** reconnectAttemptsRef.current
        )
      reconnectAttemptsRef.current += 1
      reconnectTimeoutRef.current = setTimeout(() => {
          if (user) connect()
        }, timeout)
    }
  }, [user, handleEvent])

  useEffect(() => {
    if (user) {
      connect()
    } else {
      // Cleanup on logout
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      clearTimeout(reconnectTimeoutRef.current)
      setConnectionStatus('disconnected')
      setSessionPresence(new Map())
      subscriptionsRef.current.clear()
      isConnectingRef.current = false
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      clearTimeout(reconnectTimeoutRef.current)
    }
  }, [user, connect])

  const subscribeToSession = useCallback((sessionId: string) => {
    subscriptionsRef.current.add(sessionId)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'Subscribe',
        session_id: sessionId
      }))
    }
  }, [])

  const unsubscribeFromSession = useCallback((sessionId: string) => {
    subscriptionsRef.current.delete(sessionId)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'Unsubscribe',
        session_id: sessionId
      }))
    }
    // Optimistically remove presence
    setSessionPresence(prev => {
        const newMap = new Map(prev)
        newMap.delete(sessionId)
        return newMap
    })
  }, [])

  const sendActivity = useCallback((sessionId: string, action: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'Activity',
        session_id: sessionId,
        action
      }))
    }
  }, [])

  return (
    <WebSocketContext.Provider
      value={{
        isConnected: connectionStatus === 'connected',
        connectionStatus,
        subscribeToSession,
        unsubscribeFromSession,
        sessionPresence,
        reconnect: () => {
             reconnectAttemptsRef.current = 0
             connect()
         },
         activeUsers,
         sendActivity
       }}
     >
      {children}
    </WebSocketContext.Provider>
  )
}

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
