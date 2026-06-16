export interface WsTicketResponse {
  ticket: string
  expires_in_seconds: number
}

export interface PresenceUser {
  user_id: string
  user_name: string
  joined_at: string // ISO date string
}

export type WsEvent =
  | {
      type: 'Connected'
      user_id: string
    }
  | {
      type: 'Error'
      message: string
    }
  | {
      type: 'SubscriptionRejected'
      session_id: string
      message: string
    }
  | {
      type: 'BillUpdated'
      session_id: string
      bill_id: string
    }
  | {
      type: 'BillDeleted'
      session_id: string
      bill_id: string
    }
  | {
      type: 'DebtUpdated'
      session_id: string
      debt_id: string
    }
  | {
      type: 'DebtsRecalculated'
      session_id: string
    }
  | {
      type: 'SessionStatusChanged'
      session_id: string
      status: string
    }
  | {
      type: 'SessionUpdated'
      session_id: string
    }
  | {
      type: 'ParticipantChanged'
      session_id: string
      action: string
    }
  | {
      type: 'PresenceJoined'
      session_id: string
      user_id: string
      user_name: string
    }
  | {
      type: 'PresenceLeft'
      session_id: string
      user_id: string
    }
  | {
      type: 'PresenceList'
      session_id: string
      users: PresenceUser[]
    }
  | {
      type: 'UserActivity'
      session_id: string
      user_id: string
      user_name: string
      action: string
    }
  | {
      type: 'NotificationReceived'
      notification_id: string
      title: string
      notification_type: string
    }

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null
}

function hasString(data: Record<string, unknown>, key: string): boolean {
  return typeof data[key] === 'string'
}

function isPresenceUser(data: unknown): data is PresenceUser {
  return isRecord(data)
    && hasString(data, 'user_id')
    && hasString(data, 'user_name')
    && hasString(data, 'joined_at')
}

export function isWsEvent(data: unknown): data is WsEvent {
  if (!isRecord(data) || !hasString(data, 'type')) return false

  switch (data.type) {
    case 'Connected':
      return hasString(data, 'user_id')
    case 'Error':
      return hasString(data, 'message')
    case 'SubscriptionRejected':
      return hasString(data, 'session_id') && hasString(data, 'message')
    case 'BillUpdated':
    case 'BillDeleted':
      return hasString(data, 'session_id') && hasString(data, 'bill_id')
    case 'DebtUpdated':
      return hasString(data, 'session_id') && hasString(data, 'debt_id')
    case 'DebtsRecalculated':
    case 'SessionUpdated':
      return hasString(data, 'session_id')
    case 'SessionStatusChanged':
      return hasString(data, 'session_id') && hasString(data, 'status')
    case 'ParticipantChanged':
      return hasString(data, 'session_id') && hasString(data, 'action')
    case 'PresenceJoined':
      return hasString(data, 'session_id') && hasString(data, 'user_id') && hasString(data, 'user_name')
    case 'PresenceLeft':
      return hasString(data, 'session_id') && hasString(data, 'user_id')
    case 'PresenceList':
      return hasString(data, 'session_id')
        && Array.isArray(data.users)
        && data.users.every(isPresenceUser)
    case 'UserActivity':
      return hasString(data, 'session_id')
        && hasString(data, 'user_id')
        && hasString(data, 'user_name')
        && hasString(data, 'action')
    case 'NotificationReceived':
      return hasString(data, 'notification_id')
        && hasString(data, 'title')
        && hasString(data, 'notification_type')
    default:
      return false
  }
}
