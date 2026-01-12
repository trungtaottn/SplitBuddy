import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, X, Pencil, Trash2, Users, Ghost, UserPlus } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import type { SessionDetail, GroupDetail } from '@/types/api'
import { useState } from 'react'

interface SessionOverviewProps {
    session: SessionDetail
    groupDetail?: GroupDetail | null
    // Mutation handlers passed from parent
    onUpdateParticipant: (participantId: string, guestName: string) => void
    onDeleteParticipant: (participantId: string) => void
    onAddParticipant: (data: { user_id?: string; guest_name?: string }) => void
    // Loading states
    isUpdatingParticipant: boolean
    isDeletingParticipant: boolean
    isAddingParticipant: boolean
}

export function SessionOverview({
    session,
    groupDetail,
    onUpdateParticipant,
    onDeleteParticipant,
    onAddParticipant,
    isUpdatingParticipant,
    isDeletingParticipant,
    isAddingParticipant,
}: SessionOverviewProps) {
    const [editingParticipant, setEditingParticipant] = useState<{ id: string; name: string } | null>(null)
    const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null)
    const [showAddParticipant, setShowAddParticipant] = useState(false)
    const [addMode, setAddMode] = useState<'guest' | 'member'>('guest')
    const [newGuestName, setNewGuestName] = useState('')

    // Filter group members who are not already participants
    const availableMembers = groupDetail?.members.filter(
        (m) => !session.participants.some((p) => p.user_id === m.user_id)
    ) || []

    return (
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
                            className={`flex items-center gap-2 rounded-full px-3 py-2 ${p.role === 'owner' ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-800'
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
                                        onClick={() => {
                                            onUpdateParticipant(p.id, editingParticipant.name)
                                            setEditingParticipant(null)
                                        }}
                                        disabled={isUpdatingParticipant}
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
                                        onClick={() => {
                                            onDeleteParticipant(p.id)
                                            setDeletingParticipantId(null)
                                        }}
                                        disabled={isDeletingParticipant}
                                    >
                                        {isDeletingParticipant ? '...' : 'Xóa'}
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
                                            className={`px-2 py-1 text-xs rounded-full transition-all ${addMode === 'member'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                        >
                                            Nhóm
                                        </button>
                                        <button
                                            onClick={() => setAddMode('guest')}
                                            className={`px-2 py-1 text-xs rounded-full transition-all ${addMode === 'guest'
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
                                                    onAddParticipant({ user_id: e.target.value })
                                                    e.target.value = ''
                                                }
                                            }}
                                            disabled={isAddingParticipant}
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
                                                    onAddParticipant({ guest_name: newGuestName.trim() })
                                                    setNewGuestName('')
                                                }
                                            }}
                                        />
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={() => {
                                                if (newGuestName.trim()) {
                                                    onAddParticipant({ guest_name: newGuestName.trim() })
                                                    setNewGuestName('')
                                                }
                                            }}
                                            disabled={isAddingParticipant || !newGuestName.trim()}
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
    )
}
