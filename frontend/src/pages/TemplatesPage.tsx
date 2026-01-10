import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
import { showError } from '@/utils/errorHandler'
import { TemplateCard } from '@/components/TemplateCard'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import type { ApiResponse, CreateTemplateDto, Group, GroupDetail, Session, SessionTemplate, UpdateTemplateDto } from '@/types/api'

export default function TemplatesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SessionTemplate | null>(null)

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([])

  const resetForm = () => {
    setName('')
    setLocation('')
    setSelectedGroupId('')
    setSelectedParticipantIds([])
  }

  const openCreate = () => {
    setEditingTemplate(null)
    resetForm()
    setShowModal(true)
  }

  const openEdit = (t: SessionTemplate) => {
    setEditingTemplate(t)
    setName(t.name || '')
    setLocation(t.location || '')
    setSelectedGroupId('')
    setSelectedParticipantIds(t.participant_ids || [])
    setShowModal(true)
  }

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SessionTemplate[]>>('/templates')
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
      const res = await api.get<ApiResponse<GroupDetail>>(`/groups/${selectedGroupId}`)
      return res.data.data
    },
    enabled: !!selectedGroupId,
  })

  const members = useMemo(() => groupDetail?.members || [], [groupDetail])

  const createTemplate = useMutation({
    mutationFn: async (data: CreateTemplateDto) => {
      const res = await api.post<ApiResponse<SessionTemplate>>('/templates', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Đã tạo template!')
      setShowModal(false)
      resetForm()
    },
    onError: (error: unknown) => showError(error, 'Không thể tạo template. Vui lòng thử lại.'),
  })

  const updateTemplate = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTemplateDto }) => {
      const res = await api.put<ApiResponse<SessionTemplate>>(`/templates/${id}`, data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Đã cập nhật template!')
      setShowModal(false)
      resetForm()
      setEditingTemplate(null)
    },
    onError: (error: unknown) => showError(error, 'Không thể cập nhật template. Vui lòng thử lại.'),
  })

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/templates/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Đã xóa template!')
    },
    onError: (error: unknown) => showError(error, 'Không thể xóa template. Vui lòng thử lại.'),
  })

  const createSessionFromTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await api.post<ApiResponse<Session>>(`/templates/${templateId}/create-session`, {})
      return res.data.data
    },
    onSuccess: (session) => {
      toast.success('Đã tạo session từ template!')
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      navigate(`/sessions/${session.id}`)
    },
    onError: (error: unknown) => showError(error, 'Không thể tạo session từ template. Vui lòng thử lại.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const payload: CreateTemplateDto = {
      name: name.trim(),
      location: location.trim() ? location.trim() : null,
      participant_ids: selectedParticipantIds.length > 0 ? selectedParticipantIds : undefined,
    }

    if (editingTemplate) {
      updateTemplate.mutate({
        id: editingTemplate.id,
        data: payload,
      })
    } else {
      createTemplate.mutate(payload)
    }
  }

  const toggleParticipant = (userId: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId],
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Session Templates</h1>
          <p className="text-muted-foreground text-sm">Tạo nhanh session từ cấu hình có sẵn</p>
        </div>
        <Button onClick={openCreate}>Tạo template</Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Đang tải...</CardContent>
        </Card>
      ) : (templates?.length || 0) === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Chưa có template nào. Hãy tạo template đầu tiên!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates?.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={() => openEdit(t)}
              onDelete={() => deleteTemplate.mutate(t.id)}
              onCreateSession={() => createSessionFromTemplate.mutate(t.id)}
              isCreating={createSessionFromTemplate.isPending}
            />
          ))}
        </div>
      )}

      <ResponsiveModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          resetForm()
          setEditingTemplate(null)
        }}
        title={editingTemplate ? 'Cập nhật template' : 'Tạo template'}
        desktopClassName="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tên template</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Nhậu cuối tuần" />
                </div>

                <div className="space-y-2">
                  <Label>Địa điểm (tùy chọn)</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="VD: Quán bia XYZ" />
                </div>

                <div className="space-y-2">
                  <Label>Chọn nhóm để lấy danh sách thành viên (tùy chọn)</Label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Không chọn nhóm</option>
                    {(groups || []).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedGroupId && (
                  <div className="space-y-2">
                    <Label>Chọn thành viên tham gia session</Label>
                    <div className="rounded-lg border p-2 max-h-48 overflow-y-auto">
                      {members.map((m) => (
                        <label
                          key={m.user_id}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={selectedParticipantIds.includes(m.user_id)}
                              onChange={() => toggleParticipant(m.user_id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className="text-sm truncate">{m.full_name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground truncate">{m.email}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Đã chọn {selectedParticipantIds.length} người
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                      setEditingTemplate(null)
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createTemplate.isPending || updateTemplate.isPending}
                    onClick={() => {
                      if (!name.trim()) toast.error('Vui lòng nhập tên template')
                    }}
                  >
                    {createTemplate.isPending || updateTemplate.isPending ? 'Đang lưu...' : 'Lưu'}
                  </Button>
                </div>
        </form>
      </ResponsiveModal>
    </div>
  )
}

