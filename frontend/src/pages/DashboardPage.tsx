import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { api as apiWrapper } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, TrendingDown, TrendingUp, Beer, Search, ChevronLeft, ChevronRight, LayoutTemplate } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import { CURRENCY_OPTIONS } from '@/utils/currency'
import { toast } from '@/components/ui/toaster'
import AiGreeting from '@/components/AiGreeting'
import FunTooltip, { FUN_MESSAGES } from '@/components/FunTooltip'
import { SessionCard } from '@/components/SessionCard'
import { EmptyState } from '@/components/EmptyState'
import { SessionListSkeleton } from '@/components/ui/skeleton'
import { useOnboarding } from '@/components/Onboarding'
import { staggerContainer, staggerItem } from '@/components/PageTransition'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import type { Session, DebtSummary, ApiResponse, CreateSessionDto, Group, GroupDetail, PaginatedResponse } from '@/types/api'

export default function DashboardPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')
  const [newSessionLocation, setNewSessionLocation] = useState('')
  const [newSessionDate, setNewSessionDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [newSessionCurrency, setNewSessionCurrency] = useState('VND')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [guestNames, setGuestNames] = useState<string[]>([])
  const [newGuestName, setNewGuestName] = useState('')
  const queryClient = useQueryClient()
  const { startOnboarding } = useOnboarding()

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)

  // Auto-start onboarding for new users
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('splitbuddy-onboarding-completed')
    const hasSeenOnboarding = localStorage.getItem('splitbuddy-onboarding-shown')

    if (!hasCompletedOnboarding && !hasSeenOnboarding) {
      // Delay to let the page load first
      const timer = setTimeout(() => {
        localStorage.setItem('splitbuddy-onboarding-shown', 'true')
        startOnboarding()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [startOnboarding])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, statusFilter, includeArchived])

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions', debouncedSearch, statusFilter, includeArchived, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (statusFilter) params.set('status', statusFilter)
      if (includeArchived) params.set('include_archived', 'true')
      params.set('page', String(currentPage))
      params.set('limit', '10')
      const res = await api.get<PaginatedResponse<Session[]>>(`/sessions?${params.toString()}`)
      return res.data
    },
  })

  const sessions = sessionsData?.data
  const pagination = sessionsData?.meta

  const settledSessionIds = useMemo(() => {
    if (!sessions) return []
    return sessions
      .filter((session) => {
        const total = Number(session.total_amount) || 0
        const settled = Number(session.settled_amount) || 0
        return total > 0 && settled >= total && !session.archived_at
      })
      .map((session) => session.id)
  }, [sessions])

  const { data: debts } = useQuery({
    queryKey: ['debts', 'me'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DebtSummary>>('/debts/me')
      return res.data.data
    },
  })

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Group[]>>('/groups')
      return res.data.data
    },
  })

  const { data: groupDetail, isFetching: isGroupDetailLoading } = useQuery({
    queryKey: ['groups', selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return null
      const res = await api.get<ApiResponse<GroupDetail>>(`/groups/${selectedGroupId}`)
      return res.data.data
    },
    enabled: !!selectedGroupId,
  })

  const createSession = useMutation({
    mutationFn: async (data: CreateSessionDto) => {
      const res = await api.post<ApiResponse<Session>>('/sessions', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      setShowCreateModal(false)
      setNewSessionName('')
      setNewSessionLocation('')
      setSelectedGroupId('')
      setSelectedParticipants([])
      setGuestNames([])
      setNewGuestName('')
      setNewSessionCurrency('VND')
      toast.success('Tạo cuộc nhậu thành công!')
    },
    onError: () => {
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.')
    },
  })

  const bulkArchiveSettled = useMutation({
    mutationFn: () => apiWrapper.bulkArchiveSessions(settledSessionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Đã lưu trữ các phiên đã tất toán')
    },
    onError: (error: any) => {
      toast.error('Không thể lưu trữ: ' + (error.response?.data?.message || error.message))
    },
  })

  // Prevent race condition: disable submit when loading group members
  const isSubmitDisabled = createSession.isPending || (!!selectedGroupId && isGroupDetailLoading)

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault()
    createSession.mutate({
      name: newSessionName,
      location: newSessionLocation || undefined,
      session_date: newSessionDate || undefined,
      group_id: selectedGroupId || undefined,
      participant_ids: selectedParticipants.length > 0 ? selectedParticipants : undefined,
      guest_names: guestNames.length > 0 ? guestNames : undefined,
      base_currency: newSessionCurrency || undefined,
    })
  }

  const addGuest = () => {
    if (newGuestName.trim()) {
      setGuestNames([...guestNames, newGuestName.trim()])
      setNewGuestName('')
    }
  }

  const removeGuest = (index: number) => {
    setGuestNames(guestNames.filter((_, i) => i !== index))
  }

  const selectAllParticipants = () => {
    if (groupDetail) {
      setSelectedParticipants(groupDetail.members.map(m => m.user_id))
    }
  }

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* AI Greeting */}
      <AiGreeting
        onCreateSession={() => setShowCreateModal(true)}
        onViewDebts={() => navigate('/debts')}
      />

      {/* Debt Summary Cards - Minimalist Retro */}
      <motion.div
        className="grid gap-4 md:grid-cols-2"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerItem}>
          <FunTooltip messages={FUN_MESSAGES.debtOwed}>
            <Card className="card-interactive cursor-pointer animate-card-lift">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                  <TrendingDown className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-body">Bạn đang nợ</p>
                  <p className="text-2xl font-bold text-destructive font-mono">
                    {debts ? formatCurrency(debts.total_i_owe) : '0đ'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </FunTooltip>
        </motion.div>
        <motion.div variants={staggerItem}>
          <FunTooltip messages={FUN_MESSAGES.debtOwing}>
            <Card className="card-interactive cursor-pointer animate-card-lift">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-body">Bạn được nợ</p>
                  <p className="text-2xl font-bold text-success font-mono">
                    {debts ? formatCurrency(debts.total_owed_to_me) : '0đ'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </FunTooltip>
        </motion.div>
      </motion.div>

      {/* Section Header - Retro Typography */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-semibold text-foreground flex items-center gap-2">
          <Beer className="h-5 w-5 text-primary" /> Cuộc nhậu của tôi
        </h2>
        <div className="flex items-center gap-2">
          {settledSessionIds.length > 0 && !includeArchived && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => bulkArchiveSettled.mutate()}
              disabled={bulkArchiveSettled.isPending}
            >
              {bulkArchiveSettled.isPending ? 'Đang lưu trữ...' : 'Lưu trữ đã tất toán'}
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate('/templates')}
          >
            <LayoutTemplate className="h-4 w-4" strokeWidth={1.5} />
            Templates
          </Button>
          <FunTooltip messages={FUN_MESSAGES.createSession}>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="stamp"
              className="gap-2"
              data-onboarding="create-session"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Nhậu đê...
            </Button>
          </FunTooltip>
        </div>
      </div>

      {/* Search & Filter - Retro Style */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm cuộc nhậu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-sm border-0 border-b-2 border-border bg-transparent px-2 py-2 text-sm transition-all hover:border-foreground/40 focus:border-primary focus:outline-none uppercase tracking-wide"
          >
            <option value="">Tất cả</option>
            <option value="active">Đang diễn ra</option>
            <option value="closed">Đã xong</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Hiện lưu trữ
          </label>
        </div>
        {pagination && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground font-body">
            <span>{pagination.total} kết quả</span>
          </div>
        )}
      </div>

      {sessionsLoading ? (
        <SessionListSkeleton count={3} />
      ) : sessions?.length === 0 ? (
        debouncedSearch ? (
          <EmptyState
            type="search"
            searchTerm={debouncedSearch}
            action={{
              label: 'Xóa tìm kiếm',
              onClick: () => setSearchTerm(''),
            }}
          />
        ) : (
          <EmptyState
            type="sessions"
            action={{
              label: 'Book lịch nhậu đi chứ',
              onClick: () => setShowCreateModal(true),
            }}
            secondaryAction={{
              label: 'Tìm anh em cùng nhau nhậu',
              onClick: () => navigate('/groups'),
            }}
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions?.map((session) => (
            <FunTooltip key={session.id} messages={FUN_MESSAGES.sessionCard}>
                <SessionCard
                  id={session.id}
                  name={session.name}
                  location={session.location}
                  date={session.session_date}
                  status={session.status === 'closed' ? 'settled' : 'active'}
                  total_amount={Number(session.total_amount) || 0}
                  base_currency={session.base_currency}
                  participants={session.participants || []}
                  user_debt={Number(session.my_debt) || 0}
                  user_owed={Number(session.my_owed) || 0}
                  settled_amount={Number(session.settled_amount) || 0}
                  archived_at={session.archived_at}
                />
            </FunTooltip>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Trang {currentPage} / {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(pagination.total_pages, p + 1))}
            disabled={currentPage === pagination.total_pages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ResponsiveModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setSelectedGroupId('')
          setSelectedParticipants([])
        }}
        title="Tạo cuộc nhậu mới"
        desktopClassName="max-w-md"
      >
        <form onSubmit={handleCreateSession} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên cuộc nhậu</Label>
            <Input
              id="name"
              placeholder="VD: Nhậu tất niên"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Địa điểm (tuỳ chọn)</Label>
            <Input
              id="location"
              placeholder="VD: Quán Ốc 123"
              value={newSessionLocation}
              onChange={(e) => setNewSessionLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session_date">Ngày nhậu</Label>
            <Input
              id="session_date"
              type="date"
              value={newSessionDate}
              onChange={(e) => setNewSessionDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_currency">Tiền tệ gốc</Label>
            <select
              id="base_currency"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newSessionCurrency}
              onChange={(e) => setNewSessionCurrency(e.target.value)}
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Group Selection */}
          {groups && groups.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="group">Chọn nhóm (tuỳ chọn)</Label>
              <select
                id="group"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedGroupId}
                onChange={(e) => {
                  setSelectedGroupId(e.target.value)
                  setSelectedParticipants([])
                }}
              >
                <option value="">-- Không chọn nhóm --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.member_count} người)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Participant Selection */}
          {selectedGroupId && groupDetail && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Chọn thành viên tham gia</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllParticipants}
                >
                  Chọn tất cả
                </Button>
              </div>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                {groupDetail.members.map((member) => (
                  <label
                    key={member.user_id}
                    className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(member.user_id)}
                      onChange={() => toggleParticipant(member.user_id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">
                      {member.full_name.charAt(0)}
                    </div>
                    <span className="text-sm">{member.full_name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Đã chọn {selectedParticipants.length} người
              </p>
            </div>
          )}

          {/* Guest Input */}
          <div className="space-y-2">
            <Label>Thêm khách (không có trong nhóm)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Tên khách..."
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addGuest()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addGuest}>
                Thêm
              </Button>
            </div>
            {guestNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {guestNames.map((name, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 rounded-sm bg-secondary border border-border px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    <span> {name}</span>
                    <button
                      type="button"
                      onClick={() => removeGuest(index)}
                      className="ml-1 text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowCreateModal(false)
                setSelectedGroupId('')
                setSelectedParticipants([])
              }}
            >
              Huỷ
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitDisabled}>
              {createSession.isPending ? 'Đang tạo...' : isGroupDetailLoading ? 'Đang tải...' : 'Tạo'}
            </Button>
          </div>
        </form>
      </ResponsiveModal>
    </div>
  )
}
