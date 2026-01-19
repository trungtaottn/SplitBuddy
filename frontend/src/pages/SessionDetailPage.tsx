import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Upload } from "lucide-react";
import type { Bill, ExpenseCategory } from "@/types/api";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { BillInput } from "@/components/BillInput";
import { useAuth } from "@/contexts/AuthContext";
import { useSessionPresence } from "@/contexts/WebSocketContext";

// Sub-components
import { SessionOverview } from "./session/SessionOverview";
import { BillList } from "./session/BillList";
import { DebtBreakdown } from "./session/DebtBreakdown";
import { RecurringExpenses } from "./session/RecurringExpenses";
import { ImportExportModal } from "./session/ImportExportModal";
import { TypingIndicator } from "@/components/TypingIndicator";
import { GameHistory } from "@/components/games/GameHistory";
import { SessionDrinkingStats as DrinkingStats } from "@/components/games/DrinkingStats";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [showBillInput, setShowBillInput] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [defaultPayerId, setDefaultPayerId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);

  const presence = useSessionPresence(id);
  const uniquePresence = presence.filter((v, i, a) => a.findIndex(t => t.user_id === v.user_id) === i);

  // Queries
  const { data: session, isLoading: isSessionLoading } = useQuery({
    queryKey: ["session", id],
    queryFn: () => api.getSession(id!),
    enabled: !!id,
  });

  const { data: bills, isLoading: isBillsLoading } = useQuery({
    queryKey: ["session-bills", id],
    queryFn: () => api.inputs.listBills(id!),
    enabled: !!id,
  });

  const { data: groupDetail } = useQuery({
    queryKey: ["group", session?.group_id],
    queryFn: () => api.groups.get(session!.group_id!),
    enabled: !!session?.group_id,
  });

  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ["categories"],
    queryFn: api.inputs.getCategories,
  });

  const { data: whoPaysNext } = useQuery({
    queryKey: ["who-pays-next", id],
    queryFn: () => api.whoPaysNext(id!),
    enabled: !!id,
  });

  const categoriesById = categories.reduce(
    (acc, cat) => {
      acc[cat.id] = cat;
      return acc;
    },
    {} as Record<string, ExpenseCategory>
  );

  // Mutations
  const updateSessionStatus = useMutation({
    mutationFn: (status: "active" | "closed") =>
      status === "closed" ? api.closeSession(id!) : api.reopenSession(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Cập nhật trạng thái thành công");
    },
  });

  const updateDebtStrategy = useMutation({
    mutationFn: (minimizeDebts: boolean) =>
      api.updateMinimizeDebts(id!, minimizeDebts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      toast.success("Cập nhật cách tính công nợ");
    },
  });

  const { data: debtStats } = useQuery({
    queryKey: ["debt-stats", id],
    queryFn: () => api.getDebtStats(id!),
    enabled: !!id,
  });

  const archiveSession = useMutation({
    mutationFn: () => api.archiveSession(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Đã lưu trữ cuộc nhậu");
    },
  });

  const restoreSession = useMutation({
    mutationFn: () => api.restoreSession(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Đã khôi phục cuộc nhậu");
    },
  });

  const deleteSession = useMutation({
    mutationFn: () => api.deleteSession(id!),
    onSuccess: () => {
      toast.success("Đã xóa phiên nhậu");
      navigate("/");
    },
  });

  const createBill = useMutation({
    mutationFn: (data: any) => api.inputs.createBill(id!, data),
    onMutate: async (newBillData) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["session-bills", id] });

      // Snapshot the previous value
      const previousBills = queryClient.getQueryData(["session-bills", id]);

      // Optimistically update to the new value
      queryClient.setQueryData(["session-bills", id], (old: any) => {
        if (!old) return { data: [], meta: {} };

        // Construct optimistic bill
        const optimisticBill: Bill = {
          id: `temp-${Date.now()}`,
          session_id: id!,
          description: newBillData.description,
          amount: newBillData.total_amount,
          amount_original: newBillData.total_amount, // Simplified
          currency_code: newBillData.currency_code || session?.base_currency || 'VND',
          exchange_rate: newBillData.exchange_rate || '1.0',
          rate_source: 'manual',
          rate_timestamp: new Date().toISOString(),
          split_strategy: newBillData.split_strategy || 'EQUAL',
          created_by: user?.id || 'me',
          created_at: new Date().toISOString(),
          category_id: newBillData.category_id,
          receipt_url: newBillData.receipt_url,
          payers: newBillData.payers.map((p: any) => ({
            participant_id: p.participant_id,
            name: session?.participants.find((sp: any) => sp.id === p.participant_id)?.display_name || 'Unknown',
            amount_paid: p.amount,
          })),
          participants: newBillData.split_details?.map((p: any) => ({
             participant_id: p.participant_id,
             name: session?.participants.find((sp: any) => sp.id === p.participant_id)?.display_name || 'Unknown',
             amount_owed: p.amount,
          })) || [],
        };

        return { ...old, data: [optimisticBill, ...(old.data || [])] };
      });
      
      // Also update session total amount optimistically
      const previousSession = queryClient.getQueryData(["session", id]);
      queryClient.setQueryData(["session", id], (oldSession: any) => {
        if (!oldSession) return oldSession;
        const currentTotal = parseFloat(oldSession.total_amount || "0");
        const newTotal = currentTotal + parseFloat(newBillData.total_amount || "0");
        return {
            ...oldSession,
            total_amount: newTotal.toString(),
            // We can't easily calculate my_debt/my_owed without complex logic, so leave them stale until refetch
        };
      });

      // Return a context object with the snapshotted value
      return { previousBills, previousSession };
    },
    onSuccess: () => {
       setShowBillInput(false);
    },
    onError: (error: any, _newBill, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBills) {
        queryClient.setQueryData(["session-bills", id], context.previousBills);
      }
      if (context?.previousSession) {
        queryClient.setQueryData(["session", id], context.previousSession);
      }
      toast.error(
        "Lỗi khi tạo hóa đơn: " +
          (error.response?.data?.message || error.message)
      );
    },
    onSettled: () => {
      // Always refetch after error or success:
      queryClient.invalidateQueries({ queryKey: ["session-bills", id] });
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["debts"] });
    },
  });

  const updateBill = useMutation({
    mutationFn: (data: any) => api.inputs.updateBill(id!, data.billId, data),
    onMutate: async (newBillData) => {
      await queryClient.cancelQueries({ queryKey: ["session-bills", id] });
      const previousBills = queryClient.getQueryData(["session-bills", id]);

      queryClient.setQueryData(["session-bills", id], (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.map((bill: Bill) => {
            if (bill.id === newBillData.billId) {
               return {
                  ...bill,
                  description: newBillData.description,
                  amount: newBillData.total_amount,
                  amount_original: newBillData.total_amount,
                  currency_code: newBillData.currency_code,
                  category_id: newBillData.category_id,
                  receipt_url: newBillData.receipt_url,
                  payers: newBillData.payers.map((p: any) => ({
                    participant_id: p.participant_id,
                    name: session?.participants.find((sp: any) => sp.id === p.participant_id)?.display_name || 'Unknown',
                    amount_paid: p.amount,
                  })),
                  participants: newBillData.split_details?.map((p: any) => ({
                    participant_id: p.participant_id,
                    name: session?.participants.find((sp: any) => sp.id === p.participant_id)?.display_name || 'Unknown',
                    amount_owed: p.amount,
                 })) || bill.participants, // Fallback if no split change
               };
            }
            return bill;
          }),
        };
      });

      // Update session total
      const previousSession = queryClient.getQueryData(["session", id]);
      queryClient.setQueryData(["session", id], (oldSession: any) => {
        if (!oldSession) return oldSession;
        // Need to find old bill amount to subtract? 
        // We know newBillData.total_amount, but we need the diff.
        // We can find old bill in previousBills.
        // Type assertion as previousBills might be unknown structure
        const prevData = previousBills as { data: Bill[] } | undefined;
        const oldBill = prevData?.data?.find((b: Bill) => b.id === newBillData.billId);
        const oldAmount = oldBill ? parseFloat(oldBill.amount) : 0;
        const newAmount = parseFloat(newBillData.total_amount || "0");
        const currentTotal = parseFloat(oldSession.total_amount || "0");
        
        return {
            ...oldSession,
            total_amount: (currentTotal - oldAmount + newAmount).toString()
        };
      });

      return { previousBills, previousSession };
    },
    onSuccess: () => {
      setEditingBill(null);
      toast.success("Đã cập nhật hóa đơn");
    },
    onError: (_err, _newBill, context) => {
        if (context?.previousBills) {
            queryClient.setQueryData(["session-bills", id], context.previousBills);
        }
        if (context?.previousSession) {
            queryClient.setQueryData(["session", id], context.previousSession);
        }
        toast.error("Lỗi khi cập nhật hóa đơn");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["session-bills", id] });
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["debts"] });
    },
  });

  const deleteBill = useMutation({
    mutationFn: (billId: string) => api.inputs.deleteBill(id!, billId),
    onMutate: async (billId) => {
      await queryClient.cancelQueries({ queryKey: ["session-bills", id] });
      const previousBills = queryClient.getQueryData(["session-bills", id]);

      queryClient.setQueryData(["session-bills", id], (old: any) => {
         if (!old || !old.data) return old;
         return {
            ...old,
            data: old.data.filter((bill: Bill) => bill.id !== billId),
         };
      });
      
      const previousSession = queryClient.getQueryData(["session", id]);
      queryClient.setQueryData(["session", id], (oldSession: any) => {
        if (!oldSession) return oldSession;
        // Find deleted bill amount
        const prevData = previousBills as { data: Bill[] } | undefined;
        const deletedBill = prevData?.data?.find((b: Bill) => b.id === billId);
        const amount = deletedBill ? parseFloat(deletedBill.amount) : 0;
        const currentTotal = parseFloat(oldSession.total_amount || "0");
        
        return {
             ...oldSession,
             total_amount: (currentTotal - amount).toString()
        };
      });

      return { previousBills, previousSession };
    },
    onSuccess: () => {
      setDeletingBillId(null);
      toast.success("Đã xóa hóa đơn");
    },
    onError: (_err, _billId, context) => {
         if (context?.previousBills) {
            queryClient.setQueryData(["session-bills", id], context.previousBills);
         }
         if (context?.previousSession) {
            queryClient.setQueryData(["session", id], context.previousSession);
         }
         toast.error("Không thể xóa hóa đơn");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["session-bills", id] });
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["debts"] });
    },
  });

  const addParticipant = useMutation({
    mutationFn: (data: { user_id?: string; guest_name?: string }) =>
      api.addParticipant(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Thêm thành viên thành công')
    },
  });

  const updateParticipant = useMutation({
    mutationFn: ({
      pid,
      guest_name,
      default_weight,
      is_active,
    }: {
      pid: string;
      guest_name?: string;
      default_weight?: number;
      is_active?: boolean;
    }) =>
      api.updateParticipant(id!, pid, {
        guest_name,
        default_weight,
        is_active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Cập nhật thành công')
    },
  });

  const deleteParticipant = useMutation({
    mutationFn: (pid: string) => api.deleteParticipant(id!, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Xóa thành viên thành công')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Không thể xóa thành viên");
    },
  });

  // Handlers for Overview
  const handleUpdateParticipant = (
    pid: string,
    updates: {
      guest_name?: string;
      default_weight?: number;
      is_active?: boolean;
    }
  ) => {
    updateParticipant.mutate({ pid, ...updates });
  };

  const handleDeleteParticipant = (pid: string) => {
    deleteParticipant.mutate(pid);
  };

  const handleAddParticipant = (data: {
    user_id?: string;
    guest_name?: string;
  }) => {
    addParticipant.mutate(data);
  };

  if (isSessionLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isOwner = session.created_by === user?.id;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold truncate px-2">{session.name}</h1>
        <div className="flex items-center -space-x-2">
            {uniquePresence.map((p) => (
              <div
                key={p.user_id}
                className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-[10px] font-bold text-primary-foreground shadow-sm ring-offset-background transition-all hover:z-10 hover:scale-110"
                title={p.user_name}
              >
                {/* Simple avatar with initials */}
                {p.user_name.slice(0, 2).toUpperCase()}
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background bg-green-500" />
              </div>
            ))}
        </div>
      </div>

      <div className="mb-4">
        <TypingIndicator sessionId={id!} />
      </div>

      {session.archived_at && (
        <div className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Cuộc nhậu đã được lưu trữ. Bạn có thể khôi phục để tiếp tục chỉnh sửa.
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="bills">Hoá đơn</TabsTrigger>
          <TabsTrigger value="debts">Chia tiền</TabsTrigger>
          <TabsTrigger value="recurring">Định kỳ</TabsTrigger>
          <TabsTrigger value="stats">Thống kê</TabsTrigger>
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
            whoPaysNext={whoPaysNext}
            onQuickCreate={() => {
              const suggestedId = whoPaysNext?.suggested?.participant_id;
              setDefaultPayerId(suggestedId || null);
              setEditingBill(null);
              setShowBillInput(true);
            }}
            debtStats={debtStats}
          />

          <div className="mt-6 flex flex-col gap-3">
            {session.status === "active" ? (
              <Button
                variant="outline"
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                onClick={() => updateSessionStatus.mutate("closed")}
                disabled={!!session.archived_at}
              >
                Kết thúc cuộc nhậu
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => updateSessionStatus.mutate("active")}
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
                {restoreSession.isPending
                  ? "Đang khôi phục..."
                  : "Khôi phục cuộc nhậu"}
              </Button>
            ) : (
              <div className="w-full">
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                        if (debtStats && debtStats.pending_count > 0) {
                            toast.error(`Còn ${debtStats.pending_count} khoản nợ chưa thanh toán. Vui lòng thanh toán hết trước khi lưu trữ.`);
                            return;
                        }
                        archiveSession.mutate();
                    }}
                    disabled={!isOwner || archiveSession.isPending}
                >
                    {archiveSession.isPending
                    ? "Đang lưu trữ..."
                    : "Lưu trữ cuộc nhậu"}
                </Button>
                {debtStats && debtStats.pending_count > 0 && (
                     <p className="text-xs text-red-500 text-center mt-1">
                        Cần thanh toán hết {debtStats.pending_count} khoản nợ
                     </p>
                )}
              </div>
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
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => {
                setDefaultPayerId(null);
                setEditingBill(null);
                setShowBillInput(true);
              }}
              disabled={session.status === "closed" || !!session.archived_at}
            >
              <Plus className="h-5 w-5" />
              Thêm hoá đơn
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              size="lg"
              onClick={() => setShowImportExport(true)}
            >
              <Upload className="h-5 w-5" />
              Import/Export CSV
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
                bills={bills?.data || []}
                onEdit={(bill) => {
                  setEditingBill(bill);
                  setShowBillInput(true);
                  setDefaultPayerId(null);
                }}
                onDelete={(billId) => {
                  if (!billId) {
                    setDeletingBillId(null);
                    return;
                  }
                  if (deletingBillId === billId) {
                    deleteBill.mutate(billId);
                  } else {
                    setDeletingBillId(billId);
                  }
                }}
                deletingBillId={deletingBillId}
                categoriesById={categoriesById}
                baseCurrency={session?.base_currency || 'VND'}
                isLoading={isBillsLoading}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="debts">
          <DebtBreakdown session={session} bills={bills?.data || []} />
        </TabsContent>

        <TabsContent value="recurring">
          <RecurringExpenses
            sessionId={session.id}
            baseCurrency={session.base_currency}
            isOwner={isOwner}
            isArchived={!!session.archived_at}
            isClosed={session.status === "closed"}
          />
        </TabsContent>

        <TabsContent value="stats" className="mt-6 space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
             <DrinkingStats sessionId={id!} />
             <GameHistory sessionId={id!} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Bill Input Modal (Create + Edit) */}
      <ResponsiveModal
        isOpen={showBillInput}
        onClose={() => {
          setShowBillInput(false);
          setEditingBill(null);
        }}
        title={editingBill ? "Sửa hóa đơn" : "Thêm hoá đơn"}
      >
        <BillInput
          participants={session.participants}
          baseCurrency={session.base_currency}
          sessionId={session.id}
          defaultPayerId={defaultPayerId || undefined}
          onSubmit={(data) => {
            if (editingBill) {
              updateBill.mutate({ ...data, billId: editingBill.id });
            } else {
              createBill.mutate(data);
            }
          }}
          onCancel={() => {
            setShowBillInput(false);
            setEditingBill(null);
          }}
          isSubmitting={createBill.isPending || updateBill.isPending}
          initialData={editingBill}
          categories={categories}
        />
      </ResponsiveModal>

      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        sessionId={session.id}
        onImported={() => {
          queryClient.invalidateQueries({ queryKey: ["session-bills", id] });
          queryClient.invalidateQueries({ queryKey: ["session", id] });
        }}
      />

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
              {deleteSession.isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}
