import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { api as apiWrapper } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, ArrowUpRight, ArrowDownLeft, Search, ChevronLeft, ChevronRight, LayoutTemplate } from 'lucide-react'
import { CURRENCY_OPTIONS } from '@/utils/currency'
import { toast } from '@/components/ui/toaster'
import AiGreeting from '@/components/AiGreeting'
import { SessionCard } from '@/components/SessionCard'
import { EmptyState } from '@/components/EmptyState'
import { SessionListSkeleton } from '@/components/ui/skeleton'
import { useOnboarding } from '@/components/Onboarding'
import { staggerContainer, staggerItem, CountUp } from '@/components/PageTransition'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import type { Session, DebtSummary, ApiResponse, CreateSessionDto, Group, GroupDetail, PaginatedResponse } from '@/types/api'

/**
 * DashboardPage - Dark Luxury / Modular Style
 * Features:
 * - Geometric/Bento Grid Layout
 * - High Contrast Typography
 * - Orange/Red Accent Gradients
 */

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
    retry: (failureCount, error: any) => {
        if (error?.response?.status === 429) return false
        return failureCount < 2
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
    retry: (failureCount, error: any) => {
        if (error?.response?.status === 429) return false
        return failureCount < 2
    },
  })

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Group[]>>('/groups')
      return res.data.data
    },
    retry: (failureCount, error: any) => {
        if (error?.response?.status === 429) return false
        return failureCount < 2
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
      toast.success('Session Created.')
    },
    onError: () => {
      toast.error('Error creating session.')
    },
  })

  const bulkArchiveSettled = useMutation({
    mutationFn: () => apiWrapper.bulkArchiveSessions(settledSessionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Sessions Archived.')
    },
    onError: (error: any) => {
      toast.error('Archive failed: ' + (error.response?.data?.message || error.message))
    },
  })

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
    <div className="space-y-12">
      <PullToRefresh onRefresh={async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['sessions'] }),
          queryClient.invalidateQueries({ queryKey: ['debts'] }),
          queryClient.invalidateQueries({ queryKey: ['groups'] })
        ])
      }}>
        {/* AI Greeting - Top priority for mood setting */}
        <div className="-mt-4">
           <AiGreeting
            onCreateSession={() => setShowCreateModal(true)}
            onViewDebts={() => navigate('/debts')}
          />
        </div>

        {/* Financial Overview - Compact & Horizontal */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch mt-8"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {/* Debt Owed Card */}
          <motion.div variants={staggerItem}>
              <Card variant="default" className="bg-card hover:bg-card/80 transition-colors border-l-4 border-l-orange-500 rounded-[4px]">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                     <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Bạn cần trả</h3>
                     <p className="text-3xl font-heading font-bold text-white tracking-tight">
                      {debts ? <CountUp value={Number(debts.total_i_owe)} className="text-white" /> : '0'}
                      <span className="text-sm ml-1 text-muted-foreground">đ</span>
                     </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                     <ArrowUpRight className="h-6 w-6 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
          </motion.div>

          {/* Debt Owing Card */}
          <motion.div variants={staggerItem}>
              <Card variant="default" className="bg-card hover:bg-card/80 transition-colors border-l-4 border-l-green-500 rounded-[4px]">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                     <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Cần trả bạn</h3>
                     <p className="text-3xl font-heading font-bold text-white tracking-tight">
                      {debts ? <CountUp value={Number(debts.total_owed_to_me)} className="text-white" /> : '0'}
                      <span className="text-sm ml-1 text-muted-foreground">đ</span>
                     </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                     <ArrowDownLeft className="h-6 w-6 text-green-500" />
                  </div>
                </CardContent>
              </Card>
          </motion.div>
        </motion.div>

        {/* Recent Sessions Filter Bar */}
        <div className="space-y-6 mt-12 pb-24">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5 pb-4">
             <h2 className="text-xl font-bold font-heading text-white tracking-tight">CUỘC NHẬU GẦN ĐÂY</h2>
             
             <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    variant="default" // Underline
                    className="pl-9 h-10 text-sm"
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
               
               <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-sm font-bold uppercase tracking-widest text-muted-foreground focus:outline-none cursor-pointer hover:text-white transition-colors"
               >
                  <option value="">Tất cả</option>
                  <option value="active">Đang mở</option>
                  <option value="closed">Đã chốt</option>
               </select>
               
               <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                    className="rounded border-white/20 bg-transparent text-primary focus:ring-primary h-4 w-4"
                  />
                  Lưu trữ
               </label>
             </div>
          </div>

          {settledSessionIds.length > 0 && !includeArchived && (
             <div className="flex justify-end">
               <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-white"
                  onClick={() => bulkArchiveSettled.mutate()}
                  disabled={bulkArchiveSettled.isPending}
                >
                  {bulkArchiveSettled.isPending ? 'ĐANG LƯU TRỮ...' : 'LƯU TRỮ CÁC KHOẢN ĐÃ XONG'}
                </Button>
             </div>
          )}

          {/* Sessions Grid */}
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
                    label: 'Thêm cuộc nhậu',
                    onClick: () => setShowCreateModal(true),
                  }}
                  secondaryAction={{
                    label: 'Quản lý nhóm',
                    onClick: () => navigate('/groups'),
                  }}
                />
              )
          ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sessions?.map((session) => (
                      <SessionCard
                        key={session.id}
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
                ))}
              </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-8 border-t border-white/5">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-full w-10 h-10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-bold font-mono">
                {currentPage} / {pagination.total_pages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(pagination.total_pages, p + 1))}
                disabled={currentPage === pagination.total_pages}
                className="rounded-full w-10 h-10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Creation Modal */}
      <ResponsiveModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setSelectedGroupId('')
          setSelectedParticipants([])
        }}
        title="TẠO CUỘC NHẬU"
        desktopClassName="max-w-md border border-white/10 bg-black/90 backdrop-blur-xl"
      >
        <form onSubmit={handleCreateSession} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Tên cuộc nhậu</Label>
            <Input
              id="name"
              placeholder="Ví dụ: Nhậu cuối tuần"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              required
              variant="glass"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="location" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Địa điểm</Label>
                <Input
                  id="location"
                  placeholder="Ở đâu?"
                  value={newSessionLocation}
                  onChange={(e) => setNewSessionLocation(e.target.value)}
                  variant="glass"
                />
             </div>
             <div className="space-y-2">
                <Label htmlFor="session_date" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Ngày</Label>
                <Input
                  id="session_date"
                  type="date"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  variant="glass"
                  className="justify-center"
                />
             </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_currency" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Đơn vị tiền tệ</Label>
            <select
              id="base_currency"
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={newSessionCurrency}
              onChange={(e) => setNewSessionCurrency(e.target.value)}
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code} className="bg-black">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Group Selection */}
          {groups && groups.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="group" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Chọn nhóm (Tùy chọn)</Label>
              <select
                id="group"
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedGroupId}
                onChange={(e) => {
                  setSelectedGroupId(e.target.value)
                  setSelectedParticipants([])
                }}
              >
                <option value="" className="bg-black">-- Chọn nhóm --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id} className="bg-black">
                    {g.name} ({g.member_count} thành viên)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Participant Selection */}
          {selectedGroupId && groupDetail && (
            <div className="space-y-2 bg-white/5 p-4 rounded-md border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs uppercase tracking-widest font-bold">Thành viên tham gia</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllParticipants}
                  className="text-primary hover:text-primary/80 h-auto p-0 text-xs"
                >
                  Chọn tất cả
                </Button>
              </div>
              <div className="max-h-40 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                {groupDetail.members.map((member) => (
                  <label
                    key={member.user_id}
                    className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(member.user_id)}
                      onChange={() => toggleParticipant(member.user_id)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary"
                    />
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs text-primary font-bold">
                      {member.full_name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium">{member.full_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Guest Input */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Thêm khách ngoài</Label>
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
                variant="glass"
              />
              <Button type="button" variant="secondary" onClick={addGuest}>
                Thêm
              </Button>
            </div>
            {guestNames.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {guestNames.map((name, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary"
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => removeGuest(index)}
                      className="ml-1 hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
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
              Hủy
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitDisabled} variant="default">
              {createSession.isPending ? 'Đang tạo...' : isGroupDetailLoading ? 'Đang tải...' : 'Tạo cuộc nhậu'}
            </Button>
          </div>
        </form>
      </ResponsiveModal>

      {/* Floating Action Buttons - Rendered via Portal */}
      {typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-24 right-4 md:bottom-4 z-[100] flex flex-col gap-3">
          <Button
            onClick={() => navigate('/templates')}
            variant="outline"
            className="rounded-full h-14 w-14 shadow-lg p-0 flex items-center justify-center bg-black/80 backdrop-blur-sm border-white/20 hover:border-primary/50"
            title="Mẫu có sẵn"
          >
            <LayoutTemplate className="h-6 w-6 text-white" />
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="default"
            className="rounded-full h-16 w-16 shadow-lg shadow-primary/20 p-0 flex items-center justify-center animate-bounce-subtle"
            title="Tạo cuộc nhậu"
            data-onboarding="create-session"
          >
            <Plus className="h-8 w-8 text-white" />
          </Button>
        </div>,
        document.body
      )}
    </div>
  )
}
