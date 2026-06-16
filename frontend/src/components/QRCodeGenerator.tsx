import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import QRCode from 'react-qr-code'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'
import type { ApiResponse, QrResponse } from '@/types/api'

export function QRCodeGenerator({
  initialAmount = '',
  initialNote = '',
}: {
  initialAmount?: string
  initialNote?: string
}) {
  const [amount, setAmount] = useState(initialAmount)
  const [note, setNote] = useState(initialNote)

  const generate = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams()
      params.set('amount', amount)
      if (note.trim()) params.set('note', note.trim())
      const res = await api.get<ApiResponse<QrResponse>>(`/payments/qr?${params.toString()}`)
      return res.data.data
    },
    onError: () => {
      toast.error('Không thể tạo VietQR. Vui lòng kiểm tra tài khoản ngân hàng default trong Profile.')
    },
  })

  const data = generate.data

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Số tiền (VND)</Label>
          <Input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="VD: 100000"
          />
        </div>
        <div className="space-y-2">
          <Label>Nội dung (tùy chọn)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Thanh toán nợ" />
        </div>
      </div>

      <Button
        className="w-full"
        onClick={() => {
          if (!amount || Number(amount) <= 0) {
            toast.error('Vui lòng nhập số tiền hợp lệ')
            return
          }
          generate.mutate()
        }}
        disabled={generate.isPending}
      >
        {generate.isPending ? 'Đang tạo...' : 'Tạo VietQR'}
      </Button>

      {data && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 md:items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium">QR (từ backend)</p>
                <div className="rounded-lg border p-3 bg-white">
                  <img src={data.qr_image} alt="VietQR" className="w-full h-48 object-contain" />
                </div>
              </div>
              {data.qr_data ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">QR (render từ qr_data)</p>
                  <div className="rounded-lg border p-3 bg-white flex items-center justify-center">
                    <QRCode value={data.qr_data} size={180} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">QR data</p>
                  <div className="rounded-lg border p-3 bg-white text-sm text-muted-foreground">
                    Đang dùng ảnh QR do bạn upload trong Profile (không cần qr_data).
                  </div>
                </div>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Ngân hàng:</span> {data.bank_name}
              </p>
              <p>
                <span className="font-medium text-foreground">Số TK:</span> {data.account_number}
              </p>
              <p>
                <span className="font-medium text-foreground">Chủ TK:</span> {data.account_holder}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={async () => {
                  try {
                    if (!data.qr_data) {
                      toast.error('Không có qr_data để copy (đang dùng ảnh QR upload).')
                      return
                    }
                    await navigator.clipboard.writeText(data.qr_data)
                    toast.success('Đã copy QR data!')
                  } catch {
                    toast.error('Không thể copy. Trình duyệt không hỗ trợ.')
                  }
                }}
              >
                Copy QR data
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const w = window.open('', '_blank')
                  if (!w) return
                  w.document.write(`<img src="${data.qr_image}" style="max-width:100%;height:auto;" />`)
                  w.document.close()
                }}
              >
                Mở ảnh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

