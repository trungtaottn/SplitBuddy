import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Plus, UserPlus, Trash2, BarChart3, Beer } from 'lucide-react'
import { toast } from '@/components/ui/toaster'
import { showError } from '@/utils/errorHandler'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { Celebration } from '@/components/ui/Celebration'
import { staggerContainer, staggerItem } from '@/components/PageTransition'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import type { Group, GroupDetail, ApiResponse, CreateGroupDto, AddMemberDto, GroupMember } from '@/types/api'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext'

export default function GroupsPage() {
  const { user } = useAuth()
  const { isEnabled } = useFeatureFlags()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showQuickSessionModal, setShowQuickSessionModal] = useState(false)
  const [quickSessionGroup, setQuickSessionGroup] = useState<Group | null>(null)
  const [quickSessionLocation, setQuickSessionLocation] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups', includeArchived],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (includeArchived) params.set('include_archived', 'true')
      const res = await api.get<ApiResponse<Group[]>>(`/groups?${params.toString()}`)
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

  const createGroup = useMutation({
    mutationFn: async (data: CreateGroupDto) => {
      const res = await api.post<ApiResponse<Group>>('/groups', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setShowCreateModal(false)
      setGroupName('')
      setGroupDescription('')
      setShowCelebration(true)
      toast.success('Tạo nhóm thành công!')
    },
    onError: () => {
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.')
    },
  })

  const addMember = useMutation({
    mutationFn: async (data: AddMemberDto) => {
      const res = await api.post<ApiResponse<GroupMember>>(`/groups/${selectedGroupId}/members`, data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', selectedGroupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setMemberEmail('')
      toast.success('Thêm thành viên thành công!')
    },
    onError: (error: unknown) => {
      showError(error, 'Không thể thêm thành viên. Vui lòng thử lại.')
    },
  })

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/groups/${selectedGroupId}/members/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', selectedGroupId] })
      toast.success('Đã xoá thành viên')
    },
    onError: (error: unknown) => {
      showError(error, 'Không thể thêm thành viên. Vui lòng thử lại.')
    },
  })

  const archiveGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await api.post<ApiResponse<Group>>(`/groups/${groupId}/archive`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      if (selectedGroupId) {
        queryClient.invalidateQueries({ queryKey: ['groups', selectedGroupId] })
      }
      toast.success('Đã lưu trữ nhóm')
    },
    onError: (error: unknown) => {
      showError(error, 'Không thể lưu trữ nhóm.')
    },
  })

  const restoreGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await api.post<ApiResponse<Group>>(`/groups/${groupId}/restore`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      if (selectedGroupId) {
        queryClient.invalidateQueries({ queryKey: ['groups', selectedGroupId] })
      }
      toast.success('Đã khôi phục nhóm')
    },
    onError: (error: unknown) => {
      showError(error, 'Không thể khôi phục nhóm.')
    },
  })

  // Fetch group detail for quick session (to get member IDs)
  const { data: quickSessionGroupDetail, isFetching: isQuickSessionLoading } = useQuery({
    queryKey: ['groups', quickSessionGroup?.id],
    queryFn: async () => {
      if (!quickSessionGroup?.id) return null
      const res = await api.get<ApiResponse<GroupDetail>>(`/groups/${quickSessionGroup.id}`)
      return res.data.data
    },
    enabled: !!quickSessionGroup?.id,
  })

  // Quick create session from group
  const quickCreateSession = useMutation({
    mutationFn: async ({ groupId, location, memberIds }: { groupId: string; location?: string; memberIds: string[] }) => {
      const today = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      const res = await api.post<ApiResponse<{ id: string }>>('/sessions', {
        name: `Nhậu ${today}`,
        group_id: groupId,
        location: location || undefined,
        session_date: new Date().toISOString().split('T')[0],
        participant_ids: memberIds,
      })
      return res.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Tạo buổi nhậu thành công! 🍺')
      setShowQuickSessionModal(false)
      setQuickSessionGroup(null)
      setQuickSessionLocation('')
      navigate(`/sessions/${data.id}`)
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi tạo buổi nhậu')
    },
  })

  const handleQuickCreateSession = (e: React.MouseEvent, group: Group) => {
    e.stopPropagation()
    setQuickSessionGroup(group)
    setQuickSessionLocation('')
    setShowQuickSessionModal(true)
  }

  const submitQuickSession = () => {
    if (!quickSessionGroup || !quickSessionGroupDetail) return

    const memberIds = quickSessionGroupDetail.members
      .filter(m => m.user_id)
      .map(m => m.user_id as string)

    quickCreateSession.mutate({
      groupId: quickSessionGroup.id,
      location: quickSessionLocation,
      memberIds,
    })
  }

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    createGroup.mutate({
      name: groupName,
      description: groupDescription || undefined,
    })
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberEmail) {
      return
    }
    addMember.mutate({
      email: memberEmail,
    })
  }

  const openGroupDetail = (groupId: string) => {
    setSelectedGroupId(groupId)
    setShowDetailModal(true)
  }

  // State for celebration
  const [showCelebration, setShowCelebration] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton variant="circular" className="h-8 w-8" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-24 rounded-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const isGroupAdmin = groupDetail?.members?.some((m) => m.user_id === user?.id && m.role === 'admin') ?? false
  const isGroupArchived = Boolean(groupDetail?.archived_at)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Nhóm nhậu</h1>
          <p className="text-zinc-400 font-medium mt-1">Quản lý các hội nhóm và thành viên của bạn</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="rounded-full pl-4 pr-6 h-12 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-lg shadow-orange-900/20 border-0">
          <div className="bg-white/20 p-1.5 rounded-full mr-2">
            <Plus className="h-4 w-4" />
          </div>
          <span className="font-bold tracking-wide">Tạo nhóm mới</span>
        </Button>
      </div>

      <div className="flex items-center gap-2.5 bg-zinc-900/50 w-fit px-4 py-2 rounded-full border border-white/5">
        <input
          type="checkbox"
          id="show-archived"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500/50 focus:ring-offset-0"
        />
        <label htmlFor="show-archived" className="text-sm font-medium text-zinc-400 cursor-pointer select-none hover:text-white transition-colors">
          Hiện nhóm đã lưu trữ
        </label>
      </div>

      {/* Celebration effect */}
      <Celebration show={showCelebration} onComplete={() => setShowCelebration(false)} />

      {groups?.length === 0 ? (
        <EmptyState
          type="groups"
          action={{
            label: 'Tạo nhóm đầu tiên',
            onClick: () => setShowCreateModal(true),
          }}
        />
      ) : (
        <motion.div
          className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {groups?.map((group) => (
            <motion.div
              key={group.id}
              variants={staggerItem}
            >
              <Card
                className="group relative overflow-hidden bg-zinc-900 border-white/5 hover:border-orange-500/30 transition-all hover:shadow-xl cursor-pointer"
                onClick={() => openGroupDetail(group.id)}
              >
                {/* Gradient Bg Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <CardHeader className="pb-3 relative z-10">
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-3 text-xl font-heading font-bold text-white">
                      <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 group-hover:bg-orange-500/20 transition-colors">
                        <Users className="h-5 w-5 text-orange-500" />
                      </div>
                      <span className="line-clamp-1">{group.name}</span>
                    </CardTitle>
                    {group.archived_at && (
                      <span className="px-2.5 py-1 rounded-full bg-zinc-800 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Archived
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  {group.description && (
                    <p className="mb-4 text-sm text-zinc-400 line-clamp-2 min-h-[2.5em]">{group.description}</p>
                  )}
                  {!group.description && <div className="mb-4 text-sm text-zinc-600 italic">Chưa có mô tả</div>}
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-xs font-medium text-zinc-400 border border-white/5">
                      <Users className="h-3.5 w-3.5" />
                      {group.member_count} thành viên
                    </span>
                    
                    <div className="flex gap-2">
                       {isEnabled('group_debts') && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/groups/${group.id}/debts`)
                          }}
                          title="Xem công nợ nhóm"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="rounded-full bg-white text-black hover:bg-zinc-200 border-0 font-bold text-xs"
                        onClick={(e) => handleQuickCreateSession(e, group)}
                        disabled={quickCreateSession.isPending || !!group.archived_at}
                      >
                        <Beer className="h-3.5 w-3.5 mr-1.5" />
                        Nhậu ngay
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create Group Modal */}
      <ResponsiveModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Tạo hội nhóm mới"
        description="Tạo không gian riêng cho hội bạn thân để dễ dàng chia tiền."
        desktopClassName="max-w-md"
      >
        <form onSubmit={handleCreateGroup} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">Tên nhóm</Label>
            <Input
              id="name"
              placeholder="VD: Hội Chuyên Cần, CLB Yêu Bia..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-300">Mô tả (tuỳ chọn)</Label>
            <Input
              id="description"
              placeholder="VD: Nơi lưu giữ những kỷ niệm..."
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500/50"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/10 hover:bg-zinc-800 text-zinc-300"
              onClick={() => setShowCreateModal(false)}
            >
              Huỷ
            </Button>
            <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white" disabled={createGroup.isPending}>
              {createGroup.isPending ? 'Đang tạo...' : 'Tạo nhóm'}
            </Button>
          </div>
        </form>
      </ResponsiveModal>

      {/* Group Detail Modal */}
      <ResponsiveModal
        isOpen={showDetailModal && !!groupDetail}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedGroupId(null)
        }}
        title={groupDetail ? groupDetail.name : 'Chi tiết nhóm'}
        description={groupDetail?.description}
        desktopClassName="max-w-lg"
      >
        <div className="space-y-6 pt-2">
          {/* Add member form */}
          <form onSubmit={handleAddMember} className="space-y-4 p-4 rounded-xl bg-zinc-900 border border-white/10">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-orange-500" />
              Thêm thành viên mới
            </h4>
            <div className="flex gap-3">
              <Input
                placeholder="Nhập email thành viên..."
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                type="email"
                required
                disabled={!isGroupAdmin || isGroupArchived}
                className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500/50"
              />
              <Button
                type="submit"
                disabled={addMember.isPending || !memberEmail || !isGroupAdmin || isGroupArchived}
                className="bg-orange-600 hover:bg-orange-700 text-white shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {isGroupArchived ? (
              <p className="text-xs text-orange-500/80">Nhóm đã lưu trữ, không thể thêm thành viên.</p>
            ) : (
               <p className="text-xs text-zinc-500">
                💡 Thành viên phải có tài khoản trên hệ thống.
              </p>
            )}
          </form>

          {/* Members list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white">Danh sách thành viên</h4>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
                {groupDetail?.members?.length ?? 0}
              </span>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {groupDetail?.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-xl bg-zinc-900/50 border border-white/5 p-3 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 font-bold text-sm ring-1 ring-white/10">
                      {member.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{member.full_name}</p>
                      <p className="text-xs text-zinc-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role === 'admin' && (
                      <span className="rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-500">
                        Admin
                      </span>
                    )}
                    {member.user_id !== user?.id && member.role !== 'admin' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMember.mutate(member.user_id)}
                        disabled={removeMember.isPending || !isGroupAdmin || isGroupArchived}
                        className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/5">
            {isGroupAdmin && (
              <Button
                variant="outline"
                className="flex-1 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800"
                onClick={() => {
                  if (!groupDetail) return
                  if (isGroupArchived) {
                    restoreGroup.mutate(groupDetail.id)
                  } else {
                    archiveGroup.mutate(groupDetail.id)
                  }
                }}
                disabled={archiveGroup.isPending || restoreGroup.isPending}
              >
                {isGroupArchived
                  ? restoreGroup.isPending
                    ? 'Đang khôi phục...'
                    : 'Khôi phục nhóm'
                  : archiveGroup.isPending
                    ? 'Đang lưu trữ...'
                    : 'Lưu trữ nhóm'}
              </Button>
            )}

            <Button
              variant="secondary"
              className="flex-1 bg-zinc-800 text-white hover:bg-zinc-700"
              onClick={() => {
                setShowDetailModal(false)
                setSelectedGroupId(null)
              }}
            >
              Đóng
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      {/* Quick Session Modal */}
      <ResponsiveModal
        isOpen={showQuickSessionModal && !!quickSessionGroup}
        onClose={() => {
          setShowQuickSessionModal(false)
          setQuickSessionGroup(null)
          setQuickSessionLocation('')
        }}
        title="Bắt đầu cuộc vui"
        description="Tạo nhanh buổi nhậu cho nhóm này"
        desktopClassName="max-w-md"
      >
        <div className="space-y-5 pt-2">
          <div className="rounded-xl bg-gradient-to-br from-orange-500/20 via-orange-500/5 to-transparent p-4 border border-orange-500/20">
            <p className="text-sm text-orange-200">
              <span className="font-bold text-orange-400 uppercase text-xs tracking-wide block mb-1">Nhóm</span>
              <span className="text-lg font-heading font-bold text-white">{quickSessionGroup?.name}</span>
            </p>
            <p className="text-sm text-zinc-400 mt-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              {quickSessionGroup?.member_count} thành viên sẽ tham gia
            </p>
          </div>

          {quickSessionGroupDetail && (
            <div className="space-y-2.5">
              <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Thành viên tham gia</Label>
              <div className="flex flex-wrap gap-2">
                {quickSessionGroupDetail.members.map((member) => (
                  <span
                    key={member.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 border border-white/5 px-2.5 py-1 text-xs text-zinc-300"
                  >
                    <div className="h-4 w-4 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-white">
                      {member.full_name.charAt(0).toUpperCase()}
                    </div>
                    {member.full_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quickLocation" className="text-zinc-300">Địa điểm (tuỳ chọn)</Label>
            <Input
              id="quickLocation"
              placeholder="VD: Quán bia hơi, Nhà anh A..."
              value={quickSessionLocation}
              onChange={(e) => setQuickSessionLocation(e.target.value)}
              className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500/50"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1 border-white/10 hover:bg-zinc-800 text-zinc-300"
              onClick={() => {
                setShowQuickSessionModal(false)
                setQuickSessionGroup(null)
                setQuickSessionLocation('')
              }}
            >
              Huỷ
            </Button>
            <Button
              className="flex-1 gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-lg shadow-orange-900/20 border-0"
              onClick={submitQuickSession}
              disabled={quickCreateSession.isPending || !quickSessionGroupDetail || isQuickSessionLoading}
            >
              <Beer className="h-4 w-4" />
              {quickCreateSession.isPending ? 'Đang tạo...' : isQuickSessionLoading ? 'Đang tải...' : 'Lên bia! 🍺'}
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  )
}
