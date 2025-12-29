import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, MapPin, TrendingDown, TrendingUp, Calendar, Beer, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import { toast } from '@/components/ui/toaster'
import AiGreeting from '@/components/AiGreeting'
import FunTooltip, { FUN_MESSAGES } from '@/components/FunTooltip'
import type { Session, DebtSummary, ApiResponse, CreateSessionDto, Group, GroupDetail, PaginatedResponse } from '@/types/api'

export default function DashboardPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')
  const [newSessionLocation, setNewSessionLocation] = useState('')
  const [newSessionDate, setNewSessionDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [guestNames, setGuestNames] = useState<string[]>([])
  const [newGuestName, setNewGuestName] = useState('')
  const queryClient = useQueryClient()

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, statusFilter])

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions', debouncedSearch, statusFilter, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', String(currentPage))
      params.set('limit', '10')
      const res = await api.get<PaginatedResponse<Session[]>>(`/sessions?${params.toString()}`)
      return res.data
    },
  })

  const sessions = sessionsData?.data
  const pagination = sessionsData?.meta

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

  const { data: groupDetail } = useQuery({
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
      setShowCreateModal(false)
      setNewSessionName('')
      setNewSessionLocation('')
      setSelectedGroupId('')
      setSelectedParticipants([])
      setGuestNames([])
      setNewGuestName('')
      toast.success('Tạo cuộc nhậu thành công!')
    },
    onError: () => {
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.')
    },
  })

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault()
    createSession.mutate({
      name: newSessionName,
      location: newSessionLocation || undefined,
      session_date: newSessionDate || undefined,
      group_id: selectedGroupId || undefined,
      participant_ids: selectedParticipants.length > 0 ? selectedParticipants : undefined,
      guest_names: guestNames.length > 0 ? guestNames : undefined,
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

      <div className="grid gap-4 md:grid-cols-2">
        <FunTooltip messages={FUN_MESSAGES.debtOwed}>
          <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer hover-pulse">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bạn đang nợ</p>
                <p className="text-2xl font-bold text-red-500">
                  {debts ? formatCurrency(debts.total_i_owe) : '0đ'}
                </p>
              </div>
            </CardContent>
          </Card>
        </FunTooltip>
        <FunTooltip messages={FUN_MESSAGES.debtOwing}>
          <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer hover-pulse">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bạn được nợ</p>
                <p className="text-2xl font-bold text-green-500">
                  {debts ? formatCurrency(debts.total_owed_to_me) : '0đ'}
                </p>
              </div>
            </CardContent>
          </Card>
        </FunTooltip>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Beer className="h-5 w-5" /> Cuộc nhậu của tôi
        </h2>
        <FunTooltip messages={FUN_MESSAGES.createSession}>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2 bg-orange-500 hover:bg-orange-600 rounded-lg hover-wiggle font-bold">
            <Plus className="h-4 w-4" />
            Tạo cuộc nhậu
          </Button>
        </FunTooltip>
      </div>

      {/* Search & Filter */}
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
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="closed">Đã đóng</option>
          </select>
        </div>
        {pagination && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>{pagination.total} kết quả</span>
          </div>
        )}
      </div>

      {sessionsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-3/4 rounded bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 w-1/2 rounded bg-gray-200" />
                  <div className="h-4 w-1/3 rounded bg-gray-200" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sessions?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Chưa có cuộc nhậu nào</p>
            <Button onClick={() => setShowCreateModal(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Tạo cuộc nhậu đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {sessions?.map((session) => (
            <FunTooltip key={session.id} messages={FUN_MESSAGES.sessionCard}>
              <Link to={`/sessions/${session.id}`} className="block">
                <Card className="cursor-pointer border shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 group overflow-hidden relative">
                  {/* Animated background on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-pink-500/0 to-purple-500/0 group-hover:from-orange-500/5 group-hover:via-pink-500/5 group-hover:to-purple-500/5 transition-all duration-500" />
                  
                  <CardHeader className="p-4 pb-2 relative">
                    <CardTitle className="flex items-center gap-2 text-lg font-bold">
                      <Beer className="h-5 w-5 text-orange-500 group-hover:animate-wiggle" />
                      <span className="truncate">{session.name}</span>
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-4 pt-0 space-y-2 relative">
                    <div className="flex items-center gap-2 text-base text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(session.session_date).toLocaleDateString('vi-VN')}
                    </div>
                    {session.location && (
                      <div className="flex items-center gap-2 text-base text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{session.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-base text-muted-foreground">
                        {session.participant_count} người
                      </span>
                      <span className="text-lg font-bold text-orange-500">
                        {formatCurrency(session.total_amount)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Tạo cuộc nhậu mới</CardTitle>
            </CardHeader>
            <CardContent>
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
                          className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-gray-50"
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
                          className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-700"
                        >
                          <span>👤 {name}</span>
                          <button
                            type="button"
                            onClick={() => removeGuest(index)}
                            className="ml-1 text-orange-500 hover:text-orange-700"
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
                  <Button type="submit" className="flex-1" disabled={createSession.isPending}>
                    {createSession.isPending ? 'Đang tạo...' : 'Tạo'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
