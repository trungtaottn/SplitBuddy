import { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, X, Check, Users, Banknote, ChevronDown, ChevronUp, Upload, Image as ImageIcon } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import { CURRENCY_OPTIONS } from '@/utils/currency'
import { cn } from '@/lib/utils'
import { api } from '@/lib/axios'
import { api as apiWrapper } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import type { ApiResponse, ExpenseCategory, Participant, PayerInput, SplitDetailInput, Bill, RateHistoryEntry } from '@/types/api'

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
  baseCurrency: string
  defaultPayerId?: string
  onSubmit: (data: {
    description: string
    total_amount: string
    payers: PayerInput[]
    split_strategy: string
    split_details?: SplitDetailInput[]
    category_id?: string | null
    receipt_url?: string | null
    currency_code?: string
    exchange_rate?: string
  }) => void
  onCancel: () => void
  isSubmitting?: boolean
  initialExpanded?: boolean
  initialData?: Bill | null
  categories?: ExpenseCategory[]
}

export function BillInput({
  participants,
  baseCurrency,
  defaultPayerId,
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialExpanded = false,
  initialData,
  categories: propCategories,
}: BillInputProps) {
  const [description, setDescription] = useState(initialData?.description || '')
  const [amount, setAmount] = useState(initialData?.amount_original?.toString() || initialData?.amount?.toString() || '')
  const [selectedPayer, setSelectedPayer] = useState(
    initialData?.payers?.[0]?.participant_id || defaultPayerId || ''
  )
  const [currencyCode, setCurrencyCode] = useState(initialData?.currency_code || baseCurrency)
  const [exchangeRate, setExchangeRate] = useState(initialData?.exchange_rate || '')
  const [rateHistory, setRateHistory] = useState<RateHistoryEntry[]>([])
  const [rateHistoryLoading, setRateHistoryLoading] = useState(false)
  // Determine split mode from initialData
  const [splitMode, setSplitMode] = useState<'EQUAL' | 'WEIGHTED' | 'CUSTOM'>(
    initialData?.split_strategy === 'CUSTOM' ? 'CUSTOM' : 
    initialData?.split_strategy === 'WEIGHTED' ? 'WEIGHTED' : 'EQUAL'
  )

  // Setup initial split participants
  const [selectedSplitParticipants, setSelectedSplitParticipants] = useState<string[]>([])
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})

  // Initialize splits on mount
  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description || '')
      setAmount(initialData.amount_original?.toString() || initialData.amount?.toString() || '')
      setSelectedPayer(initialData.payers?.[0]?.participant_id || '')
      setCurrencyCode(initialData.currency_code || baseCurrency)
      setExchangeRate(initialData.exchange_rate || '')
      setSplitMode(initialData.split_strategy === 'CUSTOM' ? 'CUSTOM' : 'EQUAL')

      if (initialData.participants && initialData.participants.length > 0) {
        setSelectedSplitParticipants(initialData.participants.map(p => p.participant_id))

        if (initialData.split_strategy === 'CUSTOM') {
          const splits: Record<string, string> = {}
          const rate = parseFloat(initialData.exchange_rate || '1')
          const useRate = initialData.currency_code && initialData.currency_code !== baseCurrency && rate > 0
          const decimals = ['VND', 'JPY', 'KRW', 'IDR'].includes(initialData.currency_code || '')
            ? 0
            : 2

          initialData.participants.forEach(p => {
            const baseAmount = parseFloat(p.amount_owed || '0')
            const originalAmount = useRate ? baseAmount / rate : baseAmount
            splits[p.participant_id] = decimals === 0 ? Math.round(originalAmount).toString() : originalAmount.toFixed(decimals)
          })
          setCustomSplits(splits)
        }
      } else {
        setSelectedSplitParticipants(participants.map(p => p.id))
        setCustomSplits({})
      }
      if (initialData.category_id) {
        setSelectedCategoryId(initialData.category_id)
      }
      if (initialData.receipt_url) {
        setReceiptUrl(initialData.receipt_url)
      }
    } else {
      setDescription('')
      setAmount('')
      setSelectedPayer('')
      setCurrencyCode(baseCurrency)
      setExchangeRate('')
      setSplitMode('EQUAL')
      setSelectedSplitParticipants(participants.map(p => p.id))
      setCustomSplits({})
      setSelectedCategoryId('')
      setReceiptUrl(null)
    }
    if (!initialData && defaultPayerId) {
      setSelectedPayer(defaultPayerId)
    }
  }, [initialData, participants, baseCurrency, defaultPayerId])

  useEffect(() => {
    if (currencyCode === baseCurrency) {
      setExchangeRate('')
    }
  }, [currencyCode, baseCurrency])

  useEffect(() => {
    let isMounted = true

    if (currencyCode && baseCurrency && currencyCode !== baseCurrency) {
      setRateHistoryLoading(true)
      apiWrapper.fx
        .rateHistory(currencyCode, baseCurrency, 7)
        .then((data) => {
          if (isMounted) {
            setRateHistory(data || [])
          }
        })
        .catch(() => {
          if (isMounted) {
            setRateHistory([])
          }
        })
        .finally(() => {
          if (isMounted) {
            setRateHistoryLoading(false)
          }
        })
    } else {
      setRateHistory([])
    }

    return () => {
      isMounted = false
    }
  }, [currencyCode, baseCurrency])

  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(initialExpanded || !!initialData)
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isZeroDecimalCurrency = ['VND', 'JPY', 'KRW', 'IDR'].includes(currencyCode)
  const formattedAmount = isZeroDecimalCurrency && amount
    ? Number(amount).toLocaleString('vi-VN')
    : amount

  const handleAmountChange = (rawValue: string) => {
    if (isZeroDecimalCurrency) {
      const value = rawValue.replace(/[^\d]/g, '')
      setAmount(value)
      return
    }

    const normalized = rawValue.replace(/,/g, '.')
    const cleaned = normalized.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    const value = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned
    setAmount(value)
  }



  // Fetch expense categories if not provided
  useEffect(() => {
    if (propCategories && propCategories.length > 0) {
      setCategories(propCategories)
      return
    }

    let mounted = true
    setCategoriesLoading(true)
    api.get<ApiResponse<ExpenseCategory[]>>('/categories')
      .then((res) => {
        if (!mounted) return
        setCategories(res.data.data || [])
      })
      .catch(() => {
        if (!mounted) return
        setCategories([])
      })
      .finally(() => {
        if (!mounted) return
        setCategoriesLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [propCategories])

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
      const perPersonRaw = numAmount / selectedSplitParticipants.length
      const perPerson = isZeroDecimalCurrency
        ? Math.round(perPersonRaw)
        : parseFloat(perPersonRaw.toFixed(2))
      return selectedSplitParticipants.map(pid => {
        const p = participants.find(x => x.id === pid)
        return {
          id: pid,
          name: p?.display_name || 'Unknown',
          amount: perPerson,
        }
      })
    } else if (splitMode === 'WEIGHTED') {
      // Calculate weighted split based on participant weights
      const activeParticipants = selectedSplitParticipants
        .map(pid => participants.find(x => x.id === pid))
        .filter(p => p && p.is_active)
      
      const totalWeight = activeParticipants.reduce((sum, p) => sum + (p?.default_weight || 1), 0)
      if (totalWeight === 0) return null

      return activeParticipants.map(p => {
        if (!p) return { id: '', name: 'Unknown', amount: 0 }
        const weightRatio = p.default_weight / totalWeight
        const weightedAmount = numAmount * weightRatio
        const amount = isZeroDecimalCurrency
          ? Math.round(weightedAmount)
          : parseFloat(weightedAmount.toFixed(2))
        return {
          id: p.id,
          name: p.display_name,
          amount,
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
  }, [amount, selectedSplitParticipants, splitMode, customSplits, participants, isZeroDecimalCurrency])

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
    } else if (splitMode === 'WEIGHTED') {
      // For weighted mode, backend calculates split based on participant weights
      // No need to send split_details
      split_details = undefined
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
      category_id: selectedCategoryId || null,
      receipt_url: receiptUrl,
      currency_code: currencyCode,
      exchange_rate: exchangeRate || undefined,
    })
  }

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File ảnh phải nhỏ hơn 10MB')
      return
    }

    setUploadingReceipt(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await api.post<{ data: { url: string } }>('/uploads/receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setReceiptUrl(res.data.data.url)
      toast.success('Upload ảnh hóa đơn thành công!')
    } catch (error) {
      console.error('Upload receipt error:', error)
      toast.error('Không thể upload ảnh. Vui lòng thử lại.')
    } finally {
      setUploadingReceipt(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveReceipt = () => {
    setReceiptUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">Số tiền</Label>
              <select
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              type="text"
              inputMode={isZeroDecimalCurrency ? 'numeric' : 'decimal'}
              placeholder="0"
              value={formattedAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="text-lg font-semibold"
              required
            />
            {currencyCode !== baseCurrency && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <span>
                  Quy đổi sang {baseCurrency}. Bạn có thể nhập tỷ giá thủ công bên dưới.
                </span>
              </div>
            )}
            {/* Quick amount buttons */}
            {currencyCode === 'VND' && (
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
            )}
          </div>

          {currencyCode !== baseCurrency && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Tỷ giá ({currencyCode} → {baseCurrency}) <span className="text-muted-foreground">(tuỳ chọn)</span>
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Để trống = tự động"
                value={exchangeRate}
                onChange={(e) => {
                  const normalized = e.target.value.replace(/,/g, '.')
                  const cleaned = normalized.replace(/[^0-9.]/g, '')
                  const parts = cleaned.split('.')
                  const value = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned
                  setExchangeRate(value)
                }}
              />
              {amount && exchangeRate && (
                <p className="text-xs text-muted-foreground">
                  Ước tính: {formatCurrency((parseFloat(amount) * parseFloat(exchangeRate)).toFixed(2), baseCurrency)}
                </p>
              )}

              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Tỷ giá gần đây</span>
                  {rateHistoryLoading && <span>Đang tải...</span>}
                </div>
                {rateHistory.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {rateHistory.slice(0, 3).map((entry) => (
                        <button
                          key={`${entry.rate_date}-${entry.rate_source}`}
                          type="button"
                          className="rounded-full border px-2 py-1 text-[11px] hover:border-primary hover:text-primary"
                          onClick={() => setExchangeRate(entry.rate)}
                        >
                          {entry.rate} ({new Date(entry.rate_date).toLocaleDateString('vi-VN')})
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px]">
                      Nguồn: {rateHistory[0].rate_source} • Mới nhất: {rateHistory[0].rate_date}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-[11px]">Chưa có lịch sử tỷ giá.</div>
                )}
              </div>
            </div>
          )}

          {/* Category selection (optional) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Phân loại (tùy chọn)</Label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={categoriesLoading}
            >
              <option value="">
                {categoriesLoading ? 'Đang tải danh mục...' : 'Không phân loại'}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.icon || '🏷️') + ' ' + c.name}
                </option>
              ))}
            </select>
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
                  {p.user_id ? '' : '👻'} {p.display_name}
                </button>
              ))}
            </div>
          </div>

          {/* Split Preview (Real-time) - Enhanced Visual Breakdown */}
          {splitPreview && splitPreview.length > 0 && amount && (
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-heading font-medium flex items-center gap-1.5 text-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  Chia cho {selectedSplitParticipants.length} người
                </span>
                {splitMode === 'EQUAL' && (
                  <span className="text-primary font-mono font-semibold text-sm bg-primary/10 px-2 py-0.5 rounded-lg">
                    {formatCurrency(
                      isZeroDecimalCurrency
                        ? Math.round(parseFloat(amount) / selectedSplitParticipants.length)
                        : parseFloat((parseFloat(amount) / selectedSplitParticipants.length).toFixed(2)),
                      currencyCode
                    )}/người
                  </span>
                )}
              </div>

              {/* Divider */}
              <div className="divider-retro" />

              {/* Visual breakdown with progress bars */}
              <div className="space-y-2">
                {splitPreview.slice(0, 6).map((p, index) => {
                  const percentage = (p.amount / parseFloat(amount)) * 100
                  return (
                    <div key={p.id} className="space-y-1 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${index * 50}ms` }}>
                      <div className="flex justify-between items-center text-sm">
                        <span className="truncate font-body text-foreground flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                          {p.name}
                        </span>
                        <span className="font-mono font-semibold text-primary">
                          {formatCurrency(p.amount, currencyCode)}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {splitPreview.length > 6 && (
                  <div className="text-muted-foreground text-xs font-body text-center pt-1">
                    +{splitPreview.length - 6} người khác
                  </div>
                )}
              </div>

              {/* Total verification */}
              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-body">Tổng cộng:</span>
                  <span className={cn(
                    "font-mono font-bold flex items-center gap-1",
                    splitMode === 'CUSTOM' && Math.abs(customSplitTotal - parseFloat(amount || '0')) >= 1
                      ? "text-destructive"
                      : "text-success"
                  )}>
                    {formatCurrency(splitPreview.reduce((sum, p) => sum + p.amount, 0), currencyCode)} / {formatCurrency(amount, currencyCode)}
                    {(splitMode === 'EQUAL' || Math.abs(customSplitTotal - parseFloat(amount || '0')) < 1) && (
                      <Check className="h-4 w-4" />
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <ImageIcon className="h-4 w-4" /> Ảnh hóa đơn (tùy chọn)
            </Label>
            {receiptUrl ? (
              <div className="relative group">
                <img
                  src={receiptUrl}
                  alt="Receipt"
                  className="w-full h-48 object-contain rounded-lg border-2 border-primary/20"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleRemoveReceipt}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingReceipt}
                  className="flex-1 gap-2"
                >
                  {uploadingReceipt ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Đang upload...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Chọn ảnh hóa đơn
                    </>
                  )}
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Hỗ trợ: JPEG, PNG, GIF, WebP (tối đa 10MB)
            </p>
          </div>

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
                  variant={splitMode === 'WEIGHTED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSplitMode('WEIGHTED')}
                  className="flex-1"
                  title="Chia theo trọng số (weight) của từng người"
                >
                  Theo tỷ lệ
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

              {/* Weighted split view */}
              {splitMode === 'WEIGHTED' && (
                <div className="space-y-2">
                  <Label className="text-sm">
                    Chia theo tỷ lệ (weight) - Chỉ người active tham gia
                  </Label>
                  <div className="space-y-1">
                    {participants.filter(p => p.is_active).map((p) => {
                      const totalWeight = participants.filter(x => x.is_active).reduce((sum, x) => sum + x.default_weight, 0)
                      const weightRatio = totalWeight > 0 ? (p.default_weight / totalWeight * 100).toFixed(1) : 0
                      return (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                          <span className="text-sm font-medium">{p.display_name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Weight: {p.default_weight}</span>
                            <span>({weightRatio}%)</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 Người không active sẽ không được chia tiền. Cập nhật weight trong trang chi tiết session.
                  </p>
                </div>
              )}

              {/* Custom split inputs */}
              {splitMode === 'CUSTOM' && (
                <div className="space-y-2">
                  <Label className="text-sm">
                    Nhập số tiền mỗi người (Tổng phải = {amount ? formatCurrency(amount, currencyCode) : '0'})
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
                    Tổng: {formatCurrency(customSplitTotal, currencyCode)} / {formatCurrency(amount || '0', currencyCode)}
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
