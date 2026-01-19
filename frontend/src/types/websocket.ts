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

// Helper to check event type safely
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isWsEvent(data: any): data is WsEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    typeof data.type === 'string'
  )
}
