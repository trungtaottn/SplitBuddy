import { createContext } from 'react'
import type { PresenceUser } from '@/types/websocket'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error'

export interface ActiveUserActivity {
  userName: string
  action: string
  timestamp: number
}

export interface WebSocketContextType {
  isConnected: boolean
  connectionStatus: ConnectionStatus
  subscribeToSession: (sessionId: string) => void
  unsubscribeFromSession: (sessionId: string) => void
  sessionPresence: Map<string, PresenceUser[]>
  activeUsers: Map<string, Map<string, ActiveUserActivity>>
  reconnect: () => void
  sendActivity: (sessionId: string, action: string) => void
}

export const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)
