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
import type { Group, GroupDetail, ApiResponse, CreateGroupDto, AddMemberDto, GroupMember } from '@/types/api'
import { useAuth } from '@/contexts/AuthContext'

export default function GroupsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
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

  // Quick create session from group
  const quickCreateSession = useMutation({
    mutationFn: async (groupId: string) => {
      const today = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      const res = await api.post<ApiResponse<{ id: string }>>('/sessions', {
        name: `Nhậu ${today}`,
        group_id: groupId,
        session_date: new Date().toISOString().split('T')[0],
      })
      return res.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Tạo buổi nhậu thành công! 🍺')
      navigate(`/sessions/${data.id}`)
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi tạo buổi nhậu')
    },
  })

  const handleQuickCreateSession = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation()
    quickCreateSession.mutate(groupId)
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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">👥 Nhóm bạn nhậu</h1>
          <p className="text-muted-foreground">Quản lý các nhóm bạn bè của bạn</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo nhóm mới
        </Button>
      </div>

      {groups?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg font-medium">Chưa có nhóm nào</p>
            <p className="text-muted-foreground">Tạo nhóm để quản lý bạn nhậu dễ dàng hơn</p>
            <Button onClick={() => setShowCreateModal(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Tạo nhóm đầu tiên
            </Button>
          </CardContent>
        </Card>
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
                      onClick={(e) => handleQuickCreateSession(e, group.id)}
                      disabled={quickCreateSession.isPending}
                    >
                      <Beer className="h-4 w-4" />
                      {quickCreateSession.isPending ? '...' : 'Nhậu ngay!'}
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
    </div>
  )
}
