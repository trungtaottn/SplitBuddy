import {
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import { api } from '@/lib/axios'
import { useAuth } from "@/contexts/use-auth";

import { WsEvent, PresenceUser, isWsEvent, WsTicketResponse } from '@/types/websocket'
import { ApiResponse } from '@/types/api'
import { queryClient } from '@/lib/queryClient'
import { toast } from 'sonner'
import { getErrorStatus } from '@/utils/errorHandler'
import { WebSocketContext, type ActiveUserActivity, type WebSocketContextType } from './websocket-context'

const RECONNECT_INTERVAL_BASE = 1000
const MAX_RECONNECT_INTERVAL = 30000

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<WebSocketContextType['connectionStatus']>('disconnected')
  const [sessionPresence, setSessionPresence] = useState<Map<string, PresenceUser[]>>(new Map())
  const [activeUsers, setActiveUsers] = useState<Map<string, Map<string, ActiveUserActivity>>>(new Map())
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const subscriptionsRef = useRef<Set<string>>(new Set())
  const isConnectingRef = useRef(false)
  const shouldReconnectRef = useRef(false)

  const closeSocket = useCallback(() => {
    shouldReconnectRef.current = false
    clearTimeout(reconnectTimeoutRef.current)
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    isConnectingRef.current = false
  }, [])

  const handleEvent = useCallback((event: WsEvent) => {
    switch (event.type) {
      case 'Connected':
        console.log('WebSocket Connected:', event.user_id)
        break

      case 'BillUpdated':
      case 'BillDeleted':
        queryClient.invalidateQueries({ queryKey: ['session-bills', event.session_id] })
        queryClient.invalidateQueries({ queryKey: ['session', event.session_id] }) // Detail view
        queryClient.invalidateQueries({ queryKey: ['sessions'] }) // List view (total amounts)
        break

      case 'DebtsRecalculated':
        queryClient.invalidateQueries({ queryKey: ['debts'] }) // My debts
        queryClient.invalidateQueries({ queryKey: ['session', event.session_id] }) // Detail
        break
        
      case 'DebtUpdated':
         queryClient.invalidateQueries({ queryKey: ['debts'] })
         queryClient.invalidateQueries({ queryKey: ['session', event.session_id] })
         break

      case 'ParticipantChanged':
        queryClient.invalidateQueries({ queryKey: ['session', event.session_id] })
        queryClient.invalidateQueries({ queryKey: ['debts'] })
        break

      case 'SessionStatusChanged':
      case 'SessionUpdated':
        queryClient.invalidateQueries({ queryKey: ['session', event.session_id] })
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
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

      case 'SubscriptionRejected':
        subscriptionsRef.current.delete(event.session_id)
        setSessionPresence((prev) => {
          const newMap = new Map(prev)
          newMap.delete(event.session_id)
          return newMap
        })
        toast.error(event.message)
        break
    }
  }, [])

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnectingRef.current) return

    try {
      shouldReconnectRef.current = true
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
        if (!shouldReconnectRef.current) return
        
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
    } catch (error: unknown) {
      console.error('Failed to connect WebSocket:', error)
      isConnectingRef.current = false
      setConnectionStatus('error')

      // Stop reconnecting if Auth error (401/403)
      const status = getErrorStatus(error)
      if (status === 401 || status === 403) {
          shouldReconnectRef.current = false
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
      closeSocket()
      setConnectionStatus('disconnected')
      setSessionPresence(new Map())
      subscriptionsRef.current.clear()
    }

    return () => {
      closeSocket()
    }
  }, [user, connect, closeSocket])

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
             shouldReconnectRef.current = true
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
