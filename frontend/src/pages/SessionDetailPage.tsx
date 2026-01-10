import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Users, Receipt, Wallet, Beer, Calendar, MapPin, Banknote, Trash2, Pencil, X, Check, Lock, Unlock, Download, UserPlus, Ghost, Image as ImageIcon, Upload } from 'lucide-react'
import { BillInput, BillInputInline } from '@/components/BillInput'
import { PageSkeleton } from '@/components/ui/skeleton'
import { SuccessToast } from '@/components/ui/Celebration'
import { formatCurrency } from '@/utils/formatCurrency'
import { toast } from '@/components/ui/toaster'
import { showError } from '@/utils/errorHandler'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import type { SessionDetail, Bill, ApiResponse, CreateBillDto, PayerInput, SplitDetailInput, GroupDetail, ExpenseCategory } from '@/types/api'

type TabType = 'overview' | 'bills' | 'debts'

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [showBillModal, setShowBillModal] = useState(false)
  const [editingBill, setEditingBill] = useState<{
    id: string
    description: string
    amount: string
    payerId: string
    splitParticipants: string[]
    receipt_url?: string | null
  } | null>(null)

  const { data: session, isLoading } = useQuery({
    queryKey: ['sessions', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SessionDetail>>(`/sessions/${id}`)
      return res.data.data
    },
  })

  const { data: bills } = useQuery({
    queryKey: ['sessions', id, 'bills'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Bill[]>>(`/sessions/${id}/bills`)
      return res.data.data
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ExpenseCategory[]>>('/categories')
      return res.data.data
    },
  })

  const categoriesById = (categories || []).reduce<Record<string, ExpenseCategory>>((acc, c) => {
    acc[c.id] = c
    return acc
  }, {})

  const createBill = useMutation({
    mutationFn: async (data: CreateBillDto) => {
      const res = await api.post<ApiResponse<Bill>>(`/sessions/${id}/bills`, data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions', id, 'bills'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      setShowBillModal(false)
      setShowBillSuccess(true)
    },
    onError: (error: unknown) => {
      showError(error, 'Không thể tạo hoá đơn. Vui lòng thử lại.')
    },
  })

  const updateBill = useMutation({
    mutationFn: async ({ 
      billId, 
      description, 
      amount, 
      payerId,
      splitParticipants,
      receipt_url
    }: { 
      billId: string
      description: string
      amount: string
      payerId: string
      splitParticipants: string[]
      receipt_url?: string | null
    }) => {
      const payers: PayerInput[] = [{ participant_id: payerId, amount }]
      const amountPerPerson = (parseFloat(amount) / splitParticipants.length).toFixed(0)
      const split_details: SplitDetailInput[] = splitParticipants.map((participant_id) => ({
        participant_id,
        amount: amountPerPerson,
      }))
      
      await api.put(`/sessions/${id}/bills/${billId}`, {
        description,
        total_amount: amount,
        split_strategy: 'EQUAL',
        payers,
        split_details,
        receipt_url,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions', id, 'bills'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      setEditingBill(null)
      toast.success('Cập nhật hoá đơn thành công!')
    },
    onError: (error: unknown) => {
      showError(error, 'Không thể cập nhật hoá đơn. Vui lòng thử lại.')
    },
  })

  const [deletingBillId, setDeletingBillId] = useState<string | null>(null)

  const deleteBill = useMutation({
    mutationFn: async (billId: string) => {
      await api.delete(`/sessions/${id}/bills/${billId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions', id, 'bills'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      setDeletingBillId(null)
      toast.success('Đã xóa hoá đơn!')
    },
    onError: (error: unknown) => {
      showError(error, 'Không thể xóa hoá đơn. Vui lòng thử lại.')
      setDeletingBillId(null)
    },
  })

  const [editingParticipant, setEditingParticipant] = useState<{ id: string; name: string } | null>(null)
  const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null)
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [addMode, setAddMode] = useState<'guest' | 'member'>('guest')
  const [newGuestName, setNewGuestName] = useState('')

  // Fetch group details if session has a group
  const { data: groupDetail } = useQuery({
    queryKey: ['groups', session?.group_id],
    queryFn: async () => {
      if (!session?.group_id) return null
      const res = await api.get<ApiResponse<GroupDetail>>(`/groups/${session.group_id}`)
      return res.data.data
    },
    enabled: !!session?.group_id,
  })

  // Filter group members who are not already participants
  const availableMembers = groupDetail?.members.filter(
    (m) => !session?.participants.some((p) => p.user_id === m.user_id)
  ) || []

  const updateParticipant = useMutation({
    mutationFn: async ({ participantId, guestName }: { participantId: string; guestName: string }) => {
      await api.put(`/sessions/${id}/participants/${participantId}`, { guest_name: guestName })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      setEditingParticipant(null)
      toast.success('Đã cập nhật tên!')
    },
    onError: (error: unknown) => {
      showError(error, 'Không thể cập nhật hoá đơn. Vui lòng thử lại.')
    },
  })

  const deleteParticipant = useMutation({
    mutationFn: async (participantId: string) => {
      await api.delete(`/sessions/${id}/participants/${participantId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      setDeletingParticipantId(null)
      toast.success('Đã xóa người tham gia!')
    },
    onError: (error: unknown) => {
      showError(error, 'Không thể xóa người tham gia. Vui lòng thử lại.')
      setDeletingParticipantId(null)
    },
  })

  const addParticipant = useMutation({
    mutationFn: async (data: { user_id?: string; guest_name?: string }) => {
      await api.post(`/sessions/${id}/participants`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions', id, 'bills'] })
      setShowAddParticipant(false)
      setNewGuestName('')
      toast.success('Đã thêm người tham gia!')
    },
    onError: (error: unknown) => {
      showError(error, 'Không thể cập nhật hoá đơn. Vui lòng thử lại.')
    },
  })

  const closeSession = useMutation({
    mutationFn: async () => {
      await api.post(`/sessions/${id}/close`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Đã đóng session!')
    },
    onError: (error: unknown) => {
      showError(error, 'Không thể cập nhật hoá đơn. Vui lòng thử lại.')
    },
  })

  const reopenSession = useMutation({
    mutationFn: async () => {
      await api.post(`/sessions/${id}/reopen`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Đã mở lại session!')
    },
    onError: (error: unknown) => {
      showError(error, 'Không thể cập nhật hoá đơn. Vui lòng thử lại.')
    },
  })

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const deleteSession = useMutation({
    mutationFn: async () => {
      await api.delete(`/sessions/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Đã xóa buổi nhậu!')
      navigate('/')
    },
    onError: (error: unknown) => {
      showError(error, 'Không thể xóa buổi nhậu. Vui lòng thử lại.')
      setShowDeleteConfirm(false)
    },
  })


  // Celebration states
  const [showBillSuccess, setShowBillSuccess] = useState(false)

  if (isLoading) {
    return <PageSkeleton type="detail" />
  }

  if (!session) {
    return (
      <div className="text-center">
        <p>Không tìm thấy cuộc nhậu</p>
        <Button onClick={() => navigate('/')} className="mt-4">
          Về trang chủ
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Beer className="h-6 w-6 text-orange-500" /> {session.name}
            {session.status === 'closed' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                <Lock className="h-3 w-3" /> Đã đóng
              </span>
            )}
          </h1>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(session.session_date).toLocaleDateString('vi-VN')}</span>
            {session.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {session.location}</span>}
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const response = await api.get(`/sessions/${id}/export`, { responseType: 'blob' })
                const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${session.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
                toast.success('Đã xuất file CSV!')
              } catch {
                toast.error('Không thể xuất file')
              }
            }}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            Xuất CSV
          </Button>
          {session.status === 'active' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => closeSession.mutate()}
              disabled={closeSession.isPending}
              className="gap-1"
            >
              <Lock className="h-4 w-4" />
              {closeSession.isPending ? 'Đang đóng...' : 'Đóng session'}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => reopenSession.mutate()}
              disabled={reopenSession.isPending}
              className="gap-1"
            >
              <Unlock className="h-4 w-4" />
              {reopenSession.isPending ? 'Đang mở...' : 'Mở lại session'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Xóa
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {(['overview', 'bills', 'debts'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 ${
              activeTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {tab === 'overview' && <Users className="h-4 w-4" />}
            {tab === 'bills' && <Receipt className="h-4 w-4" />}
            {tab === 'debts' && <Wallet className="h-4 w-4" />}
            {tab === 'overview' && 'Tổng quan'}
            {tab === 'bills' && 'Hoá đơn'}
            {tab === 'debts' && 'Công nợ'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng chi</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(session.total_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số người</p>
                  <p className="text-2xl font-bold">{session.participants.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Thành viên</h3>
            <div className="flex flex-wrap gap-2">
              {session.participants.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 ${
                    p.role === 'owner' ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  {editingParticipant?.id === p.id ? (
                    <>
                      <Input
                        value={editingParticipant.name}
                        onChange={(e) => setEditingParticipant({ ...editingParticipant, name: e.target.value })}
                        className="h-7 w-32 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => updateParticipant.mutate({ participantId: p.id, guestName: editingParticipant.name })}
                        disabled={updateParticipant.isPending}
                      >
                        <Check className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => setEditingParticipant(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : deletingParticipantId === p.id ? (
                    <>
                      <span className="text-sm">Xóa {p.display_name}?</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-6 px-2 text-xs"
                        onClick={() => deleteParticipant.mutate(p.id)}
                        disabled={deleteParticipant.isPending}
                      >
                        {deleteParticipant.isPending ? '...' : 'Xóa'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => setDeletingParticipantId(null)}
                      >
                        Hủy
                      </Button>
                    </>
                  ) : (
                    <>
                      <span>{p.user_id ? '' : '👻'}</span>
                      <span>{p.display_name}</span>
                      {p.role === 'owner' && (
                        <span className="text-xs">(Chủ xị)</span>
                      )}
                      {p.role !== 'owner' && !p.user_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
                          onClick={() => setEditingParticipant({ id: p.id, name: p.guest_name || p.display_name })}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {p.role !== 'owner' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 text-red-400 opacity-50 hover:opacity-100 hover:text-red-600"
                          onClick={() => setDeletingParticipantId(p.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ))}
              
              {/* Add Participant Button */}
              {session.status === 'active' && (
                showAddParticipant ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Mode Toggle - show only if session has group */}
                    {session.group_id && availableMembers.length > 0 && (
                      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-0.5">
                        <button
                          onClick={() => setAddMode('member')}
                          className={`px-2 py-1 text-xs rounded-full transition-all ${
                            addMode === 'member' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                           Nhóm
                        </button>
                        <button
                          onClick={() => setAddMode('guest')}
                          className={`px-2 py-1 text-xs rounded-full transition-all ${
                            addMode === 'guest' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          👻 Khách
                        </button>
                      </div>
                    )}

                    {/* Add Group Member */}
                    {addMode === 'member' && availableMembers.length > 0 && (
                      <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2">
                        <Users className="h-4 w-4 text-primary" />
                        <select
                          className="h-7 text-sm bg-transparent border-none outline-none cursor-pointer"
                          onChange={(e) => {
                            if (e.target.value) {
                              addParticipant.mutate({ user_id: e.target.value })
                              e.target.value = ''
                            }
                          }}
                          disabled={addParticipant.isPending}
                        >
                          <option value="">Chọn thành viên...</option>
                          {availableMembers.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Add Guest */}
                    {addMode === 'guest' && (
                      <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2">
                        <Ghost className="h-4 w-4 text-primary" />
                        <Input
                          value={newGuestName}
                          onChange={(e) => setNewGuestName(e.target.value)}
                          placeholder="Tên khách..."
                          className="h-7 w-32 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newGuestName.trim()) {
                              addParticipant.mutate({ guest_name: newGuestName.trim() })
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            if (newGuestName.trim()) {
                              addParticipant.mutate({ guest_name: newGuestName.trim() })
                            }
                          }}
                          disabled={addParticipant.isPending || !newGuestName.trim()}
                        >
                          <Check className="h-3 w-3 text-green-600" />
                        </Button>
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setShowAddParticipant(false)
                        setNewGuestName('')
                        setAddMode('guest')
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddParticipant(true)}
                    className="rounded-full gap-1"
                  >
                    <UserPlus className="h-4 w-4" />
                    Thêm người
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bills' && (
        <div className="space-y-4">
          {/* Bill Input - Inline or Expanded */}
          {session.status === 'active' ? (
            showBillModal ? (
              <BillInput
                participants={session.participants}
                onSubmit={(data) => {
                  createBill.mutate({
                    description: data.description,
                    total_amount: data.total_amount,
                    payers: data.payers,
                    split_strategy: data.split_strategy,
                    split_details: data.split_details,
                    category_id: data.category_id ?? null,
                    receipt_url: data.receipt_url,
                  })
                }}
                onCancel={() => setShowBillModal(false)}
                isSubmitting={createBill.isPending}
              />
            ) : (
              <BillInputInline
                participants={session.participants}
                onExpand={() => setShowBillModal(true)}
              />
            )
          ) : (
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500">
              <Lock className="h-4 w-4" />
              <span>Session đã đóng - Không thể thêm hoá đơn mới</span>
            </div>
          )}

          {bills?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-muted-foreground">Chưa có hoá đơn nào</p>
                <p className="text-sm text-gray-400">Thêm hoá đơn đầu tiên để bắt đầu chia tiền</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {bills?.map((bill) => (
                <Card key={bill.id}>
                  <CardContent className="p-4">
                    {editingBill?.id === bill.id && session ? (
                      <div className="space-y-3">
                        <Input
                          value={editingBill.description}
                          onChange={(e) => setEditingBill({ ...editingBill, description: e.target.value })}
                          placeholder="Mô tả"
                        />
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={editingBill.amount ? Number(editingBill.amount).toLocaleString('vi-VN') : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d]/g, '')
                            setEditingBill({ ...editingBill, amount: value })
                          }}
                          placeholder="Số tiền"
                        />
                        
                        {/* Payer selection */}
                        <div className="space-y-2">
                          <Label className="text-sm">Người trả tiền</Label>
                          <select
                            value={editingBill.payerId}
                            onChange={(e) => setEditingBill({ ...editingBill, payerId: e.target.value })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Chọn người trả</option>
                            {session.participants.map((p) => (
                              <option key={p.id} value={p.id}>{p.display_name}</option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Split participants */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Chia cho</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingBill({
                                ...editingBill,
                                splitParticipants: session.participants.map(p => p.id)
                              })}
                            >
                              Chọn tất cả
                            </Button>
                          </div>
                          <div className="rounded-lg border p-2 max-h-40 overflow-y-auto">
                            {session.participants.map((p) => (
                              <label
                                key={p.id}
                                className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                <input
                                  type="checkbox"
                                  checked={editingBill.splitParticipants.includes(p.id)}
                                  onChange={() => {
                                    const isSelected = editingBill.splitParticipants.includes(p.id)
                                    setEditingBill({
                                      ...editingBill,
                                      splitParticipants: isSelected
                                        ? editingBill.splitParticipants.filter(id => id !== p.id)
                                        : [...editingBill.splitParticipants, p.id]
                                    })
                                  }}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">{p.display_name}</span>
                              </label>
                            ))}
                          </div>
                          {editingBill.splitParticipants.length > 0 && editingBill.amount && (
                            <p className="text-sm text-primary">
                              Mỗi người: {formatCurrency(
                                (parseFloat(editingBill.amount) / editingBill.splitParticipants.length).toFixed(0)
                              )} ({editingBill.splitParticipants.length} người)
                            </p>
                          )}
                        </div>
                        
                        {/* Receipt Upload/Edit */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-1">
                            <ImageIcon className="h-4 w-4" /> Ảnh hóa đơn (tùy chọn)
                          </Label>
                          {editingBill.receipt_url ? (
                            <div className="relative group">
                              <img
                                src={editingBill.receipt_url}
                                alt="Receipt"
                                className="w-full h-48 object-contain rounded-lg border-2 border-primary/20"
                              />
                              <div className="absolute top-2 right-2 flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => window.open(editingBill.receipt_url!, '_blank')}
                                  className="bg-black/50 text-white hover:bg-black/70"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Xem
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setEditingBill({ ...editingBill, receipt_url: null })}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return

                                  if (!file.type.startsWith('image/')) {
                                    toast.error('Chỉ chấp nhận file ảnh')
                                    return
                                  }

                                  if (file.size > 10 * 1024 * 1024) {
                                    toast.error('File ảnh phải nhỏ hơn 10MB')
                                    return
                                  }

                                  try {
                                    const formData = new FormData()
                                    formData.append('file', file)
                                    const res = await api.post<{ data: { url: string } }>('/uploads/receipt', formData, {
                                      headers: { 'Content-Type': 'multipart/form-data' },
                                    })
                                    setEditingBill({ ...editingBill, receipt_url: res.data.data.url })
                                    toast.success('Upload ảnh hóa đơn thành công!')
                                  } catch (error) {
                                    console.error('Upload receipt error:', error)
                                    toast.error('Không thể upload ảnh. Vui lòng thử lại.')
                                  }
                                }}
                                className="hidden"
                                id={`receipt-upload-${editingBill.id}`}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById(`receipt-upload-${editingBill.id}`)?.click()}
                                className="flex-1 gap-2"
                              >
                                <Upload className="h-4 w-4" />
                                Chọn ảnh hóa đơn
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Hỗ trợ: JPEG, PNG, GIF, WebP (tối đa 10MB)
                          </p>
                        </div>
                        
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingBill(null)}
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Hủy
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => updateBill.mutate({
                              billId: bill.id,
                              description: editingBill.description,
                              amount: editingBill.amount,
                              payerId: editingBill.payerId,
                              splitParticipants: editingBill.splitParticipants,
                              receipt_url: editingBill.receipt_url,
                            })}
                            disabled={updateBill.isPending || editingBill.splitParticipants.length === 0 || !editingBill.payerId}
                            className="flex-1"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {updateBill.isPending ? 'Đang lưu...' : 'Lưu'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🧾</span>
                            <div>
                              <p className="font-medium">{bill.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(bill.created_at).toLocaleDateString('vi-VN')}
                              </p>
                              {bill.category_id && categoriesById[bill.category_id] && (
                                <div className="mt-1">
                                  <span
                                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
                                    style={
                                      categoriesById[bill.category_id]?.color
                                        ? {
                                            borderColor: categoriesById[bill.category_id].color!,
                                            color: categoriesById[bill.category_id].color!,
                                          }
                                        : undefined
                                    }
                                  >
                                    <span>{categoriesById[bill.category_id].icon || '🏷️'}</span>
                                    <span>{categoriesById[bill.category_id].name}</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-bold text-primary">
                              {formatCurrency(bill.amount)}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingBill({
                                id: bill.id,
                                description: bill.description,
                                amount: bill.amount,
                                payerId: bill.payers?.[0]?.participant_id || '',
                                splitParticipants: bill.participants?.map(p => p.participant_id) || [],
                                receipt_url: bill.receipt_url || null,
                              })}
                            >
                              ✏️
                            </Button>
                            {deletingBillId === bill.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteBill.mutate(bill.id)}
                                  disabled={deleteBill.isPending}
                                >
                                  {deleteBill.isPending ? '...' : 'Xóa'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeletingBillId(null)}
                                >
                                  Hủy
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeletingBillId(bill.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Receipt Image - Hiển thị ngay sau description */}
                        {bill.receipt_url && (
                          <div className="relative group">
                            <img
                              src={bill.receipt_url}
                              alt="Receipt"
                              className="w-full max-h-64 object-contain rounded-lg border-2 border-primary/20 cursor-pointer hover:border-primary/40 transition-colors"
                              onClick={() => window.open(bill.receipt_url!, '_blank')}
                            />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => window.open(bill.receipt_url!, '_blank')}
                                className="bg-black/50 text-white hover:bg-black/70"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Xem
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Payer info */}
                        {bill.payers && bill.payers.length > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-600 flex items-center gap-1"><Banknote className="h-4 w-4" /> Người trả:</span>
                            <span className="font-medium">
                              {bill.payers.map(p => p.name).join(', ')}
                            </span>
                          </div>
                        )}
                        
                        {/* Participants info */}
                        {bill.participants && bill.participants.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-blue-600 flex items-center gap-1"><Users className="h-4 w-4" /> Chia cho:</span>
                            <span className="font-medium">
                              {bill.participants.map(p => p.name).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'debts' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                Chia tiền ({session.participants.length} người)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bills && bills.length > 0 ? (
                (() => {
                  // Calculate actual amounts from bill splits
                  const participantTotals: Record<string, { name: string; owed: number; paid: number }> = {}
                  
                  // Initialize all participants
                  session.participants.forEach((p) => {
                    participantTotals[p.id] = { name: p.display_name, owed: 0, paid: 0 }
                  })
                  
                  // Sum up actual amounts from bills
                  bills.forEach((bill) => {
                    // Add amounts owed from bill splits
                    bill.participants?.forEach((bp) => {
                      if (participantTotals[bp.participant_id]) {
                        participantTotals[bp.participant_id].owed += parseFloat(bp.amount_owed) || 0
                      }
                    })
                    // Add amounts paid
                    bill.payers?.forEach((payer) => {
                      if (participantTotals[payer.participant_id]) {
                        participantTotals[payer.participant_id].paid += parseFloat(payer.amount_paid) || 0
                      }
                    })
                  })
                  
                  return (
                    <div className="space-y-3">
                      <div className="rounded-lg bg-primary/10 p-4 text-center">
                        <p className="text-sm text-muted-foreground">Tổng tiền cuộc nhậu</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(session.total_amount)}</p>
                      </div>
                      
                      <div className="rounded-lg border p-4">
                        <p className="mb-3 text-sm font-medium text-muted-foreground">Chi tiết mỗi người:</p>
                        <div className="space-y-2">
                          {session.participants.map((p) => {
                            const data = participantTotals[p.id] || { owed: 0, paid: 0 }
                            return (
                              <div key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span>{p.user_id ? '' : '👻'}</span>
                                  <span className="font-medium">{p.display_name}</span>
                                </div>
                                <div className="text-right">
                                  {data.owed > 0 ? (
                                    <span className="font-bold text-primary">{formatCurrency(data.owed.toFixed(0))}</span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  Chưa có hoá đơn nào. Thêm hoá đơn để xem chia tiền.
                </p>
              )}
            </CardContent>
          </Card>
          <Button onClick={() => navigate('/debts')} variant="outline" className="w-full">
            Xem tổng hợp công nợ tất cả cuộc nhậu
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ResponsiveModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Xác nhận xóa"
        desktopClassName="max-w-sm"
        showHandle={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xóa buổi nhậu <strong>"{session?.name}"</strong>? Tất cả hoá đơn và công nợ liên quan sẽ bị
            xóa vĩnh viễn.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => deleteSession.mutate()}
              disabled={deleteSession.isPending}
            >
              {deleteSession.isPending ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      {/* Success Toast for Bill Creation */}
      <SuccessToast
        message="Thêm hoá đơn thành công! 🧾"
        show={showBillSuccess}
        onHide={() => setShowBillSuccess(false)}
        emoji="✅"
      />
    </div>
  )
}
