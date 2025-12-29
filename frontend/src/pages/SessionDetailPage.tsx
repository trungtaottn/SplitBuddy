import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plus, Users, Receipt, Wallet, Beer, Calendar, MapPin, Banknote, Trash2, Pencil, X, Check, Lock, Unlock, Download } from 'lucide-react'
import FunTooltip, { FUN_MESSAGES } from '@/components/FunTooltip'
import { formatCurrency } from '@/utils/formatCurrency'
import { toast } from '@/components/ui/toaster'
import type { SessionDetail, Bill, ApiResponse, CreateBillDto, PayerInput, SplitDetailInput } from '@/types/api'

type TabType = 'overview' | 'bills' | 'debts'
type SplitMode = 'EQUAL' | 'CUSTOM'

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [showBillModal, setShowBillModal] = useState(false)
  const [billDescription, setBillDescription] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [selectedPayer, setSelectedPayer] = useState('')
  const [splitMode, setSplitMode] = useState<SplitMode>('EQUAL')
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})
  const [selectedSplitParticipants, setSelectedSplitParticipants] = useState<string[]>([])
  const [editingBill, setEditingBill] = useState<{
    id: string
    description: string
    amount: string
    payerId: string
    splitParticipants: string[]
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

  const createBill = useMutation({
    mutationFn: async (data: CreateBillDto) => {
      const res = await api.post<ApiResponse<Bill>>(`/sessions/${id}/bills`, data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions', id, 'bills'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      resetBillForm()
      toast.success('Thêm hoá đơn thành công!')
    },
    onError: () => {
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.')
    },
  })

  const updateBill = useMutation({
    mutationFn: async ({ 
      billId, 
      description, 
      amount, 
      payerId,
      splitParticipants 
    }: { 
      billId: string
      description: string
      amount: string
      payerId: string
      splitParticipants: string[]
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
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions', id, 'bills'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      setEditingBill(null)
      toast.success('Cập nhật hoá đơn thành công!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Có lỗi xảy ra'
      toast.error(message)
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
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Có lỗi xảy ra'
      toast.error(message)
      setDeletingBillId(null)
    },
  })

  const [editingParticipant, setEditingParticipant] = useState<{ id: string; name: string } | null>(null)
  const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null)

  const updateParticipant = useMutation({
    mutationFn: async ({ participantId, guestName }: { participantId: string; guestName: string }) => {
      await api.put(`/sessions/${id}/participants/${participantId}`, { guest_name: guestName })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      setEditingParticipant(null)
      toast.success('Đã cập nhật tên!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Có lỗi xảy ra'
      toast.error(message)
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
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Có lỗi xảy ra'
      toast.error(message)
      setDeletingParticipantId(null)
    },
  })

  const closeSession = useMutation({
    mutationFn: async () => {
      await api.post(`/sessions/${id}/close`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Đã đóng session!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Có lỗi xảy ra'
      toast.error(message)
    },
  })

  const reopenSession = useMutation({
    mutationFn: async () => {
      await api.post(`/sessions/${id}/reopen`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Đã mở lại session!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Có lỗi xảy ra'
      toast.error(message)
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
    onError: (error: any) => {
      console.error('Delete session error:', error)
      const message = error?.response?.data?.error?.message || error?.message || 'Có lỗi xảy ra khi xóa session'
      toast.error(message)
      setShowDeleteConfirm(false)
    },
  })

  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPayer) {
      toast.error('Vui lòng chọn người trả tiền')
      return
    }

    const payers: PayerInput[] = [
      { participant_id: selectedPayer, amount: billAmount },
    ]

    let split_details: SplitDetailInput[] | undefined

    if (splitMode === 'EQUAL') {
      // Equal split among selected participants only
      if (selectedSplitParticipants.length === 0) {
        toast.error('Vui lòng chọn ít nhất 1 người để chia tiền')
        return
      }
      const amountPerPerson = (parseFloat(billAmount) / selectedSplitParticipants.length).toFixed(0)
      split_details = selectedSplitParticipants.map((participant_id) => ({
        participant_id,
        amount: amountPerPerson,
      }))
    } else if (splitMode === 'CUSTOM') {
      split_details = Object.entries(customSplits)
        .filter(([, amount]) => parseFloat(amount) > 0)
        .map(([participant_id, amount]) => ({
          participant_id,
          amount,
        }))

      const totalCustom = split_details.reduce((sum, s) => sum + parseFloat(s.amount), 0)
      if (Math.abs(totalCustom - parseFloat(billAmount)) > 0.01) {
        toast.error(`Tổng tiền chia (${totalCustom.toLocaleString()}) phải bằng tổng hoá đơn (${parseFloat(billAmount).toLocaleString()})`)
        return
      }
    }

    createBill.mutate({
      description: billDescription,
      total_amount: billAmount,
      payers,
      split_strategy: splitMode,
      split_details,
    })
  }

  const resetBillForm = () => {
    setShowBillModal(false)
    setBillDescription('')
    setBillAmount('')
    setSelectedPayer('')
    setSplitMode('EQUAL')
    setCustomSplits({})
    setSelectedSplitParticipants([])
  }

  const toggleSplitParticipant = (participantId: string) => {
    setSelectedSplitParticipants((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId]
    )
  }

  const selectAllParticipants = () => {
    if (session) {
      setSelectedSplitParticipants(session.participants.map((p) => p.id))
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
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
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
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
                    p.role === 'owner' ? 'bg-primary/10 text-primary' : 'bg-gray-100'
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
                      <span>{p.user_id ? '👤' : '👻'}</span>
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
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bills' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {session.status === 'active' ? (
              <FunTooltip messages={FUN_MESSAGES.addBill}>
                <Button onClick={() => setShowBillModal(true)} className="gap-2 hover-wiggle">
                  <Plus className="h-4 w-4" />
                  Thêm hoá đơn
                </Button>
              </FunTooltip>
            ) : (
              <Button disabled className="gap-2 opacity-50">
                <Lock className="h-4 w-4" />
                Session đã đóng
              </Button>
            )}
          </div>

          {bills?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Chưa có hoá đơn nào</p>
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
                                className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50"
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
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingBill(null)}
                          >
                            Hủy
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateBill.mutate({
                              billId: bill.id,
                              description: editingBill.description,
                              amount: editingBill.amount,
                              payerId: editingBill.payerId,
                              splitParticipants: editingBill.splitParticipants,
                            })}
                            disabled={updateBill.isPending || editingBill.splitParticipants.length === 0 || !editingBill.payerId}
                          >
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
                              })}
                            >
                              ✏️
                            </Button>
                            {deletingBillId === bill.id ? (
                              <div className="flex items-center gap-1">
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
                              </div>
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
                              <div key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span>{p.user_id ? '👤' : '👻'}</span>
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

      {showBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Thêm hoá đơn mới</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateBill} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Input
                    id="description"
                    placeholder="VD: Tăng 1 - Ốc xào"
                    value={billDescription}
                    onChange={(e) => setBillDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Số tiền (VND)</Label>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="numeric"
                    placeholder="500,000"
                    value={billAmount ? Number(billAmount).toLocaleString('vi-VN') : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, '')
                      setBillAmount(value)
                    }}
                    required
                  />
                  {billAmount && (
                    <p className="text-xs text-muted-foreground">
                      = {Number(billAmount).toLocaleString('vi-VN')}đ
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payer">Ai trả tiền?</Label>
                  <select
                    id="payer"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedPayer}
                    onChange={(e) => setSelectedPayer(e.target.value)}
                    required
                  >
                    <option value="">Chọn người trả</option>
                    {session.participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Cách chia tiền</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={splitMode === 'EQUAL' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSplitMode('EQUAL')
                        selectAllParticipants()
                      }}
                      className="flex-1"
                    >
                      Chia đều
                    </Button>
                    <Button
                      type="button"
                      variant={splitMode === 'CUSTOM' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSplitMode('CUSTOM')
                        const initial: Record<string, string> = {}
                        session.participants.forEach((p) => {
                          initial[p.id] = ''
                        })
                        setCustomSplits(initial)
                      }}
                      className="flex-1"
                    >
                      Tuỳ chỉnh
                    </Button>
                  </div>
                </div>

                {splitMode === 'EQUAL' && (
                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Chọn người chia tiền</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={selectAllParticipants}
                      >
                        Chọn tất cả
                      </Button>
                    </div>
                    {session.participants.map((p) => (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSplitParticipants.includes(p.id)}
                          onChange={() => toggleSplitParticipant(p.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm">{p.display_name}</span>
                      </label>
                    ))}
                    {selectedSplitParticipants.length > 0 && billAmount && (
                      <p className="text-sm font-medium text-primary">
                        Mỗi người: {formatCurrency(
                          (parseFloat(billAmount) / selectedSplitParticipants.length).toFixed(0)
                        )} ({selectedSplitParticipants.length} người)
                      </p>
                    )}
                  </div>
                )}

                {splitMode === 'CUSTOM' && (
                  <div className="space-y-3 rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">
                      Nhập số tiền mỗi người chịu (tổng phải bằng {billAmount ? formatCurrency(billAmount) : '0đ'})
                    </p>
                    {session.participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className="w-24 truncate text-sm">{p.display_name}</span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={customSplits[p.id] || ''}
                          onChange={(e) =>
                            setCustomSplits((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          className="flex-1"
                        />
                      </div>
                    ))}
                    <p className="text-sm font-medium">
                      Tổng: {formatCurrency(
                        Object.values(customSplits)
                          .reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
                          .toString()
                      )}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={resetBillForm}
                  >
                    Huỷ
                  </Button>
                  <Button type="submit" className="flex-1" disabled={createBill.isPending}>
                    {createBill.isPending ? 'Đang thêm...' : 'Thêm'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Xác nhận xóa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Bạn có chắc muốn xóa buổi nhậu <strong>"{session?.name}"</strong>? 
                Tất cả hoá đơn và công nợ liên quan sẽ bị xóa vĩnh viễn.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
