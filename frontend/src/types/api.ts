export interface ApiResponse<T> {
  data: T
  meta: {
    timestamp: string
    pagination?: PaginationMeta
  }
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface PaginatedResponse<T> {
  data: T
  meta: PaginationMeta
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta: {
    timestamp: string
  }
}

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role?: string
}

export interface AuthResponse {
  user: User
  access_token: string
}

export type SessionStatus = 'active' | 'closed'
export type ParticipantRole = 'owner' | 'member'
export type DebtStatus = 'pending' | 'settlement_requested' | 'settled'

export interface Session {
  id: string
  name: string
  location: string | null
  status: SessionStatus
  created_by: string
  created_at: string
  session_date: string
  participant_count: number
  total_amount: string
}

export interface SessionDetail {
  id: string
  name: string
  location: string | null
  status: SessionStatus
  created_by: string
  created_at: string
  session_date: string
  participants: Participant[]
  total_amount: string
}

export interface Participant {
  id: string
  user_id: string | null
  guest_name: string | null
  display_name: string
  role: ParticipantRole
  joined_at: string
}

export interface Bill {
  id: string
  session_id: string
  description: string
  amount: string
  split_strategy: string
  created_by: string
  created_at: string
  payers: BillPayerInfo[]
  participants: BillParticipantInfo[]
}

export interface BillPayerInfo {
  participant_id: string
  name: string
  amount_paid: string
}

export interface BillParticipantInfo {
  participant_id: string
  name: string
  amount_owed: string
}

export interface DebtItem {
  id: string
  session_id: string
  session_name: string
  counterpart_id: string
  counterpart_name: string
  amount: string
  status: DebtStatus
}

export interface DebtSummary {
  i_owe: DebtItem[]
  owed_to_me: DebtItem[]
  total_i_owe: string
  total_owed_to_me: string
}

export interface CreateSessionDto {
  name: string
  location?: string
  session_date?: string
  group_id?: string
  participant_ids?: string[]
}

export interface AddParticipantDto {
  user_id?: string
  guest_name?: string
}

export interface PayerInput {
  participant_id: string
  amount: string
}

export interface SplitDetailInput {
  participant_id: string
  amount: string
}

export interface CreateBillDto {
  description: string
  total_amount: string
  payers: PayerInput[]
  split_strategy?: string
  split_details?: SplitDetailInput[]
}

// Group types
export interface Group {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  member_count: number
}

export interface GroupDetail {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  members: GroupMember[]
}

export interface GroupMember {
  id: string
  user_id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: 'admin' | 'member'
  joined_at: string
}

export interface CreateGroupDto {
  name: string
  description?: string
}

export interface AddMemberDto {
  email: string
  full_name?: string
  password?: string
}

export interface CreateSessionDto {
  name: string
  location?: string
  session_date?: string
  group_id?: string
  participant_ids?: string[]
  guest_names?: string[]
}

export interface SessionDebt {
  session_id: string
  session_name: string
  session_date: string
  participants: ParticipantDebt[]
}

export interface ParticipantDebt {
  participant_id: string
  name: string
  total_paid: string
  total_owed: string
  balance: string
}

// Group Debt Summary
export interface GroupDebtSummary {
  group_id: string
  group_name: string
  members: GroupMemberDebt[]
  sessions: GroupSessionDebt[]
}

export interface GroupMemberDebt {
  user_id: string
  name: string
  total_paid: string
  total_owed: string
  balance: string
}

export interface GroupSessionDebt {
  session_id: string
  session_name: string
  session_date: string
  total_amount: string
  payers: SessionPayer[]
  member_amounts: MemberSessionAmount[]
}

export interface SessionPayer {
  user_id: string
  name: string
  amount_paid: string
}

export interface MemberSessionAmount {
  user_id: string
  amount_owed: string
}

// Simplified Debt (after netting)
export interface SimplifiedDebtSummary {
  group_id: string
  group_name: string
  simplified_debts: SimplifiedDebt[]
  total_transactions: number
  total_amount: string
}

export interface SimplifiedDebt {
  from_user_id: string
  from_user_name: string
  to_user_id: string
  to_user_name: string
  amount: string
}

// Game Types
export interface GameHistoryEntry {
  id: string
  game_type: string
  content_text: string
  difficulty: string | null
  player_name: string | null
  result: string | null
  drink_count: number | null
  created_at: string
}

export interface CustomQuestion {
  id: string
  user_id: string
  game_type: string
  content_type: string
  content: string
  difficulty: string | null
  is_public: boolean | null
  use_count: number | null
  created_at: string
}

export interface CreateCustomQuestion {
  game_type: string
  content_type?: string
  content: string
  difficulty?: string
  is_public?: boolean
}

export interface DrinkingStats {
  participant_id: string
  participant_name: string
  total_drinks: number
  games_played: number
  games_lost: number
}

export interface LeaderboardEntry {
  participant_id: string
  participant_name: string
  total_drinks: number
  total_games: number
  rank: number | null
}

export interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface FeatureFlagPublic {
  key: string
  enabled: boolean
}
