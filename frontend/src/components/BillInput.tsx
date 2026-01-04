import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, X, Check, Users, Banknote, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/lib/utils'
import type { Participant, PayerInput, SplitDetailInput } from '@/types/api'

// Common bill descriptions for autocomplete
const BILL_SUGGESTIONS = [
  { icon: '🍺', label: 'Bia', keywords: ['bia', 'beer', 'ruou', 'rượu'] },
  { icon: '🍖', label: 'Đồ ăn', keywords: ['do an', 'đồ ăn', 'food', 'an', 'thit', 'thịt'] },
  { icon: '🍜', label: 'Lẩu', keywords: ['lau', 'lẩu', 'hotpot'] },
  { icon: '🦑', label: 'Hải sản', keywords: ['hai san', 'hải sản', 'oc', 'ốc', 'tom', 'tôm'] },
  { icon: '🥗', label: 'Rau/Salad', keywords: ['rau', 'salad'] },
  { icon: '🧊', label: 'Đá/Nước', keywords: ['da', 'đá', 'nuoc', 'nước', 'nuoc ngot'] },
  { icon: '🚕', label: 'Di chuyển', keywords: ['grab', 'taxi', 'xe', 'di chuyen'] },
  { icon: '💊', label: 'Thuốc lá', keywords: ['thuoc', 'thuốc', 'ciga', 'thuoc la'] },
  { icon: '🎤', label: 'Karaoke', keywords: ['karaoke', 'hat', 'hát'] },
]

// Quick amount buttons
const QUICK_AMOUNTS = [
  { label: '50k', value: 50000 },
  { label: '100k', value: 100000 },
  { label: '200k', value: 200000 },
  { label: '500k', value: 500000 },
  { label: '1tr', value: 1000000 },
]

interface BillInputProps {
  participants: Participant[]
  onSubmit: (data: {
    description: string
    total_amount: string
    payers: PayerInput[]
    split_strategy: string
    split_details?: SplitDetailInput[]
  }) => void
  onCancel: () => void
  isSubmitting?: boolean
  initialExpanded?: boolean
}

export function BillInput({
  participants,
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialExpanded = false,
}: BillInputProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedPayer, setSelectedPayer] = useState('')
  const [splitMode, setSplitMode] = useState<'EQUAL' | 'CUSTOM'>('EQUAL')
  const [selectedSplitParticipants, setSelectedSplitParticipants] = useState<string[]>([])
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(initialExpanded)

  // Auto-select all participants for split on mount
  useEffect(() => {
    setSelectedSplitParticipants(participants.map(p => p.id))
  }, [participants])

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!description) return BILL_SUGGESTIONS.slice(0, 4)
    const lower = description.toLowerCase()
    return BILL_SUGGESTIONS.filter(s => 
      s.label.toLowerCase().includes(lower) ||
      s.keywords.some(k => k.includes(lower))
    ).slice(0, 4)
  }, [description])

  // Calculate split preview
  const splitPreview = useMemo(() => {
    const numAmount = parseFloat(amount) || 0
    if (numAmount === 0 || selectedSplitParticipants.length === 0) return null

    if (splitMode === 'EQUAL') {
      const perPerson = Math.round(numAmount / selectedSplitParticipants.length)
      return selectedSplitParticipants.map(pid => {
        const p = participants.find(x => x.id === pid)
        return {
          id: pid,
          name: p?.display_name || 'Unknown',
          amount: perPerson,
        }
      })
    } else {
      return Object.entries(customSplits)
        .filter(([, amt]) => parseFloat(amt) > 0)
        .map(([pid, amt]) => {
          const p = participants.find(x => x.id === pid)
          return {
            id: pid,
            name: p?.display_name || 'Unknown',
            amount: parseFloat(amt) || 0,
          }
        })
    }
  }, [amount, selectedSplitParticipants, splitMode, customSplits, participants])

  // Custom split total
  const customSplitTotal = useMemo(() => {
    return Object.values(customSplits).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
  }, [customSplits])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPayer || !amount || selectedSplitParticipants.length === 0) return

    const payers: PayerInput[] = [{ participant_id: selectedPayer, amount }]
    
    let split_details: SplitDetailInput[] | undefined
    if (splitMode === 'EQUAL') {
      const perPerson = (parseFloat(amount) / selectedSplitParticipants.length).toFixed(0)
      split_details = selectedSplitParticipants.map(pid => ({
        participant_id: pid,
        amount: perPerson,
      }))
    } else {
      split_details = Object.entries(customSplits)
        .filter(([, amt]) => parseFloat(amt) > 0)
        .map(([pid, amt]) => ({
          participant_id: pid,
          amount: amt,
        }))
    }

    onSubmit({
      description,
      total_amount: amount,
      payers,
      split_strategy: splitMode,
      split_details,
    })
  }

  const toggleParticipant = (pid: string) => {
    setSelectedSplitParticipants(prev =>
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
    )
  }

  return (
    <Card className="border-2 border-primary/20 shadow-lg animate-in slide-in-from-bottom-4 duration-300">
      <CardContent className="p-4 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description with autocomplete */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Mô tả (VD: Bia, Đồ ăn...)"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="pr-10"
                  required
                />
              </div>
            </div>
            
            {/* Suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-10 overflow-hidden">
                {filteredSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                    onClick={() => {
                      setDescription(s.label)
                      setShowSuggestions(false)
                    }}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount with quick buttons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Số tiền (VND)</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={amount ? Number(amount).toLocaleString('vi-VN') : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d]/g, '')
                setAmount(value)
              }}
              className="text-lg font-semibold"
              required
            />
            {/* Quick amount buttons */}
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((qa) => (
                <Button
                  key={qa.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "text-xs px-3",
                    amount === String(qa.value) && "bg-primary text-white border-primary"
                  )}
                  onClick={() => setAmount(String(qa.value))}
                >
                  {qa.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Payer selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <Banknote className="h-4 w-4" /> Ai trả tiền?
            </Label>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPayer(p.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    selectedPayer === p.id
                      ? "bg-primary text-white shadow-md scale-105"
                      : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  )}
                >
                  {p.user_id ? '👤' : '👻'} {p.display_name}
                </button>
              ))}
            </div>
          </div>

          {/* Split Preview (Real-time) */}
          {splitPreview && splitPreview.length > 0 && amount && (
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Users className="h-4 w-4" /> Chia cho {selectedSplitParticipants.length} người
                </span>
                {splitMode === 'EQUAL' && (
                  <span className="text-primary font-semibold">
                    {formatCurrency(Math.round(parseFloat(amount) / selectedSplitParticipants.length))}/người
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {splitPreview.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex justify-between items-center bg-white dark:bg-gray-800 rounded px-2 py-1">
                    <span className="truncate">{p.name}</span>
                    <span className="font-medium text-primary">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
                {splitPreview.length > 4 && (
                  <div className="text-gray-500 text-xs">+{splitPreview.length - 4} người khác</div>
                )}
              </div>
            </div>
          )}

          {/* Advanced options toggle */}
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-1"
          >
            {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {isAdvancedOpen ? 'Ẩn tùy chọn' : 'Tùy chọn nâng cao'}
          </button>

          {/* Advanced: Split mode & participant selection */}
          {isAdvancedOpen && (
            <div className="space-y-4 pt-2 border-t">
              {/* Split mode */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={splitMode === 'EQUAL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSplitMode('EQUAL')}
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
                    participants.forEach(p => { initial[p.id] = '' })
                    setCustomSplits(initial)
                  }}
                  className="flex-1"
                >
                  Tuỳ chỉnh
                </Button>
              </div>

              {/* Participant selection for EQUAL mode */}
              {splitMode === 'EQUAL' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Chọn người chia tiền</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSplitParticipants(participants.map(p => p.id))}
                    >
                      Chọn tất cả
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {participants.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleParticipant(p.id)}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all",
                          selectedSplitParticipants.includes(p.id)
                            ? "bg-primary/10 text-primary border border-primary/30"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-500 line-through"
                        )}
                      >
                        {selectedSplitParticipants.includes(p.id) ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        {p.display_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom split inputs */}
              {splitMode === 'CUSTOM' && (
                <div className="space-y-2">
                  <Label className="text-sm">
                    Nhập số tiền mỗi người (Tổng phải = {amount ? formatCurrency(amount) : '0đ'})
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className="text-sm truncate flex-1">{p.display_name}</span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={customSplits[p.id] || ''}
                          onChange={(e) => setCustomSplits(prev => ({ ...prev, [p.id]: e.target.value }))}
                          className="w-24 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className={cn(
                    "text-sm font-medium text-right",
                    Math.abs(customSplitTotal - parseFloat(amount || '0')) < 1 
                      ? "text-green-600" 
                      : "text-red-600"
                  )}>
                    Tổng: {formatCurrency(customSplitTotal)} / {formatCurrency(amount || '0')}
                    {Math.abs(customSplitTotal - parseFloat(amount || '0')) < 1 && ' ✓'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2 bg-primary hover:bg-primary/90"
              disabled={isSubmitting || !description || !amount || !selectedPayer || selectedSplitParticipants.length === 0}
            >
              <Plus className="h-4 w-4" />
              {isSubmitting ? 'Đang thêm...' : 'Thêm bill'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Compact inline input for quick add
export function BillInputInline({
  participants,
  onExpand,
}: {
  participants: Participant[]
  onExpand: () => void
}) {
  return (
    <button
      onClick={onExpand}
      className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/5 transition-all group"
    >
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Plus className="h-5 w-5 text-primary" />
      </div>
      <div className="text-left">
        <p className="font-medium text-gray-900 dark:text-gray-100">Thêm hoá đơn mới</p>
        <p className="text-sm text-gray-500">Nhấn để thêm bill cho {participants.length} người</p>
      </div>
    </button>
  )
}

