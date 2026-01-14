import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { ArrowLeft, Plus } from 'lucide-react'
import type {
  Bill,
  ExpenseCategory,
} from '@/types/api'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { BillInput } from '@/components/BillInput'
import { useAuth } from '@/contexts/AuthContext'

// Sub-components
import { SessionOverview } from './session/SessionOverview'
import { BillList } from './session/BillList'
import { DebtBreakdown } from './session/DebtBreakdown'

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [showBillInput, setShowBillInput] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null)

  // Queries
  const { data: session, isLoading: isSessionLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.getSession(id!),
    enabled: !!id,
  })

  const { data: bills, isLoading: isBillsLoading } = useQuery({
    queryKey: ['session-bills', id],
    queryFn: () => api.inputs.listBills(id!),
    enabled: !!id,
  })

  const { data: groupDetail } = useQuery({
    queryKey: ['group', session?.group_id],
    queryFn: () => api.groups.get(session!.group_id!),
    enabled: !!session?.group_id,
  })

  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ['categories'],
    queryFn: api.inputs.getCategories,
  })

  const categoriesById = categories.reduce((acc, cat) => {
    acc[cat.id] = cat
    return acc
  }, {} as Record<string, ExpenseCategory>)

  // Mutations
  const updateSessionStatus = useMutation({
    mutationFn: (status: 'active' | 'closed') =>
      status === 'closed' ? api.closeSession(id!) : api.reopenSession(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      toast.success('Cập nhật trạng thái thành công')
    },
  })

  const updateDebtStrategy = useMutation({
    mutationFn: (minimizeDebts: boolean) => api.updateMinimizeDebts(id!, minimizeDebts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Cập nhật cách tính công nợ')
    },
  })

  const archiveSession = useMutation({
    mutationFn: () => api.archiveSession(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Đã lưu trữ cuộc nhậu')
    },
  })

  const restoreSession = useMutation({
    mutationFn: () => api.restoreSession(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Đã khôi phục cuộc nhậu')
    },
  })

  const deleteSession = useMutation({
    mutationFn: () => api.deleteSession(id!),
    onSuccess: () => {
      toast.success('Đã xóa phiên nhậu')
      navigate('/')
    },
  })

  const createBill = useMutation({
    mutationFn: (data: any) => api.inputs.createBill(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-bills', id] })
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      setShowBillInput(false)
    },
    onError: (error: any) => {
      toast.error('Lỗi khi tạo hóa đơn: ' + (error.response?.data?.message || error.message))
    }
  })

  const updateBill = useMutation({
    mutationFn: (data: any) => api.inputs.updateBill(id!, data.billId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-bills', id] })
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      setEditingBill(null)
      toast.success('Đã cập nhật hóa đơn')
    },
  })

  const deleteBill = useMutation({
    mutationFn: (billId: string) => api.inputs.deleteBill(id!, billId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-bills', id] })
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      setDeletingBillId(null)
      toast.success('Đã xóa hóa đơn')
    },
  })

  const addParticipant = useMutation({
    mutationFn: (data: { user_id?: string; guest_name?: string }) =>
      api.addParticipant(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      toast.success('Thêm thành viên thành công')
    },
  })

  const updateParticipant = useMutation({
    mutationFn: ({ pid, guestName }: { pid: string; guestName: string }) =>
      api.updateParticipant(id!, pid, { guest_name: guestName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      toast.success('Cập nhật thành công')
    },
  })

  const deleteParticipant = useMutation({
    mutationFn: (pid: string) => api.deleteParticipant(id!, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      toast.success('Xóa thành viên thành công')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Không thể xóa thành viên')
    },
  })

  // Handlers for Overview
  const handleUpdateParticipant = (pid: string, guestName: string) => {
    updateParticipant.mutate({ pid, guestName })
  }

  const handleDeleteParticipant = (pid: string) => {
    deleteParticipant.mutate(pid)
  }

  const handleAddParticipant = (data: { user_id?: string; guest_name?: string }) => {
    addParticipant.mutate(data)
  }

  // Handlers for BillList
  const handleDeleteBill = (billId: string) => {
    if (!billId) {
      setDeletingBillId(null)
      return;
    }
    if (deletingBillId === billId) {
      deleteBill.mutate(billId)
    } else {
      setDeletingBillId(billId)
    }
  }

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill)
    setShowBillInput(true) // Reuse BillInput modal/drawer logic or inline
  }


  if (isSessionLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const isOwner = session.created_by === user?.id

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold truncate px-2">{session.name}</h1>
        <div className="w-9" /> {/* Spacer */}
      </div>

      {session.archived_at && (
        <div className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Cuộc nhậu đã được lưu trữ. Bạn có thể khôi phục để tiếp tục chỉnh sửa.
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="bills">Hoá đơn</TabsTrigger>
          <TabsTrigger value="debts">Chia tiền</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SessionOverview
            session={session}
            groupDetail={groupDetail}
            onUpdateParticipant={handleUpdateParticipant}
            onDeleteParticipant={handleDeleteParticipant}
            onAddParticipant={handleAddParticipant}
            isUpdatingParticipant={updateParticipant.isPending}
            isDeletingParticipant={deleteParticipant.isPending}
            isAddingParticipant={addParticipant.isPending}
            onUpdateDebtStrategy={updateDebtStrategy.mutate}
            isUpdatingDebtStrategy={updateDebtStrategy.isPending}
            isOwner={isOwner}
          />

          <div className="mt-6 flex flex-col gap-3">
            {session.status === 'active' ? (
              <Button
                variant="outline"
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                onClick={() => updateSessionStatus.mutate('closed')}
                disabled={!!session.archived_at}
              >
                Kết thúc cuộc nhậu
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => updateSessionStatus.mutate('active')}
                disabled={!!session.archived_at}
              >
                Mở lại cuộc nhậu
              </Button>
            )}

            {session.archived_at ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => restoreSession.mutate()}
                disabled={!isOwner || restoreSession.isPending}
              >
                {restoreSession.isPending ? 'Đang khôi phục...' : 'Khôi phục cuộc nhậu'}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => archiveSession.mutate()}
                disabled={!isOwner || archiveSession.isPending}
              >
                {archiveSession.isPending ? 'Đang lưu trữ...' : 'Lưu trữ cuộc nhậu'}
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full text-red-400 hover:text-red-500"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={!!session.archived_at}
            >
              Xóa cuộc nhậu
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="bills">
          <div className="mb-4">
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => {
                setEditingBill(null)
                setShowBillInput(true)
              }}
              disabled={session.status === 'closed' || !!session.archived_at}
            >
              <Plus className="h-5 w-5" />
              Thêm hoá đơn
            </Button>
          </div>

          {/* If editing or creating, show input form. Wait, original design was inline if editing? 
               The original code showed BillInput inside a Drawer/Modal driven by showBillInput for Creation
               AND inline for Editing? 
               Let's check previous code.
               Lines 616: <ResponsiveModal isOpen={showBillInput} ...> <BillInput ... /> </ResponsiveModal>
               Lines 791: map(bill => ( editingBill?.id === bill.id ? <BillInput ... inline /> : <Card>... )
               
               My BillList doesn't support inline editing. It calls onEdit.
               I should open the Modal for editing too, OR make BillList support inline editing.
               Modal is cleaner for virtualization.
               So I will use the Modal for both Create and Edit.
           */}

          <div className="space-y-4">
            {isBillsLoading ? (
              <div className="text-center py-8">Đang tải hóa đơn...</div>
            ) : (
              <BillList
                bills={bills || []}
                onEdit={handleEditBill}
                onDelete={handleDeleteBill}
                deletingBillId={deletingBillId}
                categoriesById={categoriesById}
                baseCurrency={session.base_currency}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="debts">
          <DebtBreakdown session={session} bills={bills || []} />
        </TabsContent>
      </Tabs>

      {/* Bill Input Modal (Create + Edit) */}
      <ResponsiveModal
        isOpen={showBillInput}
        onClose={() => {
          setShowBillInput(false)
          setEditingBill(null)
        }}
        title={editingBill ? "Sửa hóa đơn" : "Thêm hoá đơn"}
      >
        <BillInput
          participants={session.participants}
          baseCurrency={session.base_currency}
          onSubmit={(data) => {
            if (editingBill) {
              updateBill.mutate({ ...data, billId: editingBill.id })
            } else {
              createBill.mutate(data)
            }
          }}
          onCancel={() => {
            setShowBillInput(false)
            setEditingBill(null)
          }}
          isSubmitting={createBill.isPending || updateBill.isPending}
          initialData={editingBill}
          categories={categories}
        />
      </ResponsiveModal>

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

    </div>
  )
}
