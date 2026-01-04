import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Plus, UserPlus, Trash2, BarChart3, Beer } from 'lucide-react'
import { toast } from '@/components/ui/toaster'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { Celebration } from '@/components/ui/Celebration'
import type { Group, GroupDetail, ApiResponse, CreateGroupDto, AddMemberDto, GroupMember } from '@/types/api'
import { useAuth } from '@/contexts/AuthContext'

export default function GroupsPage() {
  const { user } = useAuth()
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

  const { data: groups, isLoading } = useQuery({
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
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Có lỗi xảy ra'
      toast.error(message)
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
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Có lỗi xảy ra'
      toast.error(message)
    },
  })

  // Fetch group detail for quick session (to get member IDs)
  const { data: quickSessionGroupDetail } = useQuery({
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
            <div key={i} className="rounded-xl border bg-white dark:bg-gray-800 p-4 space-y-3">
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nhóm nhậu</h1>
          <p className="text-muted-foreground">Đây là nơi chứa các con me men</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo nhóm mới
        </Button>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups?.map((group) => (
            <Card
              key={group.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openGroupDetail(group.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  {group.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {group.description && (
                  <p className="mb-2 text-sm text-muted-foreground">{group.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-sm text-primary">
                    {group.member_count} thành viên
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                      onClick={(e) => handleQuickCreateSession(e, group)}
                      disabled={quickCreateSession.isPending}
                    >
                      <Beer className="h-4 w-4" />
                      Nhậu ngay!
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/groups/${group.id}/debts`)
                      }}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Tạo nhóm mới</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên nhóm</Label>
                  <Input
                    id="name"
                    placeholder="VD: Hội nhậu xóm"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả (tuỳ chọn)</Label>
                  <Input
                    id="description"
                    placeholder="VD: Nhóm bạn nhậu khu phố 3"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Huỷ
                  </Button>
                  <Button type="submit" className="flex-1" disabled={createGroup.isPending}>
                    {createGroup.isPending ? 'Đang tạo...' : 'Tạo nhóm'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Group Detail Modal */}
      {showDetailModal && groupDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {groupDetail.name}
              </CardTitle>
              {groupDetail.description && (
                <p className="text-sm text-muted-foreground">{groupDetail.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add member form */}
              <form onSubmit={handleAddMember} className="space-y-3">
                <Input
                  placeholder="Email thành viên *"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  type="email"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  💡 Thành viên phải có tài khoản (liên hệ Admin để tạo)
                </p>
                <Button type="submit" disabled={addMember.isPending || !memberEmail} className="w-full gap-2">
                  <UserPlus className="h-4 w-4" />
                  Thêm thành viên
                </Button>
              </form>

              {/* Members list */}
              <div className="space-y-2">
                <h4 className="font-medium">Thành viên ({groupDetail.members.length})</h4>
                {groupDetail.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {member.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{member.full_name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === 'admin' && (
                        <span className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                          Admin
                        </span>
                      )}
                      {member.user_id !== user?.id && member.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMember.mutate(member.user_id)}
                          disabled={removeMember.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedGroupId(null)
                }}
              >
                Đóng
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Session Modal */}
      {showQuickSessionModal && quickSessionGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md animate-in zoom-in-95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beer className="h-5 w-5 text-orange-500" />
                Tạo buổi nhậu nhanh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-orange-50 p-3 border border-orange-200">
                <p className="text-sm text-orange-800">
                  <span className="font-semibold">Nhóm:</span> {quickSessionGroup.name}
                </p>
                <p className="text-sm text-orange-600 mt-1">
                  {quickSessionGroup.member_count} thành viên sẽ tham gia
                </p>
              </div>

              {quickSessionGroupDetail && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Thành viên tham gia:</Label>
                  <div className="flex flex-wrap gap-2">
                    {quickSessionGroupDetail.members.map((member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs"
                      >
                        <div className="h-4 w-4 rounded-full bg-primary/30 flex items-center justify-center text-[10px] font-bold">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                        {member.full_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="quickLocation">Địa điểm (tuỳ chọn)</Label>
                <Input
                  id="quickLocation"
                  placeholder="VD: Quán bia hơi, Nhà anh A..."
                  value={quickSessionLocation}
                  onChange={(e) => setQuickSessionLocation(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowQuickSessionModal(false)
                    setQuickSessionGroup(null)
                    setQuickSessionLocation('')
                  }}
                >
                  Huỷ
                </Button>
                <Button
                  className="flex-1 gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                  onClick={submitQuickSession}
                  disabled={quickCreateSession.isPending || !quickSessionGroupDetail}
                >
                  <Beer className="h-4 w-4" />
                  {quickCreateSession.isPending ? 'Đang tạo...' : 'Bắt đầu nhậu!'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
