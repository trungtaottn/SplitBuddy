import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { ImportPreviewResponse, ImportResultResponse } from '@/types/api'

interface ImportExportModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  onImported: () => void
}

export function ImportExportModal({
  isOpen,
  onClose,
  sessionId,
  onImported,
}: ImportExportModalProps) {
  const [fileName, setFileName] = useState<string>('')
  const [csvText, setCsvText] = useState<string>('')
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)

  const previewMutation = useMutation({
    mutationFn: (csv: string) => api.importSessionPreview(sessionId, csv),
    onSuccess: (data) => {
      setPreview(data)
      if (data.errors.length > 0) {
        toast.error('CSV có lỗi, vui lòng kiểm tra trước khi import')
      }
    },
    onError: (error: any) => {
      toast.error('Không thể xem trước CSV: ' + (error.response?.data?.message || error.message))
    },
  })

  const importMutation = useMutation({
    mutationFn: (csv: string) => api.importSessionCsv(sessionId, csv) as Promise<ImportResultResponse>,
    onSuccess: (data) => {
      if (data.errors.length > 0) {
        toast.error('Import thất bại, vui lòng kiểm tra lỗi')
        return
      }
      toast.success(`Đã import ${data.created_count} hóa đơn`)
      onImported()
      onClose()
      setCsvText('')
      setPreview(null)
      setFileName('')
    },
    onError: (error: any) => {
      toast.error('Không thể import: ' + (error.response?.data?.message || error.message))
    },
  })

  const handleFileChange = (file: File | null) => {
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      setCsvText(text)
      previewMutation.mutate(text)
    }
    reader.readAsText(file)
  }

  const handleExport = async () => {
    try {
      const res = await api.exportSessionCsv(sessionId)
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `session_${sessionId}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      toast.error('Không thể xuất CSV: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleExportV2 = async () => {
    try {
      const res = await api.exportSessionCsvV2(sessionId)
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `session_${sessionId}_v2.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      toast.error('Không thể xuất CSV: ' + (error.response?.data?.message || error.message))
    }
  }

  return (
    <ResponsiveModal isOpen={isOpen} onClose={onClose} title="Import / Export CSV">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Xuất dữ liệu bill của phiên ra CSV v1/v2 (v2 hỗ trợ custom splits).
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={handleExport} variant="outline">
                Tải CSV v1
              </Button>
              <Button onClick={handleExportV2} variant="outline">
                Tải CSV v2
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Hỗ trợ CSV v1/v2 từ SplitBuddy và CSV export từ Splitwise. File sẽ được kiểm tra trước khi import.
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
            {fileName && (
              <p className="text-xs text-muted-foreground">Đã chọn: {fileName}</p>
            )}

            {preview && (
              <div className="space-y-2">
                <div className="text-sm">
                  Tổng dòng: <b>{preview.total_rows}</b> • Hợp lệ: <b>{preview.valid_rows}</b> • Lỗi:{' '}
                  <b>{preview.errors.length}</b>
                </div>
                {preview.errors.length > 0 && (
                  <div className="max-h-40 overflow-auto rounded border p-2 text-xs">
                    {preview.errors.map((err, idx) => (
                      <div key={`${err.row}-${idx}`}>
                        Dòng {err.row} [{err.field}]: {err.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={() => importMutation.mutate(csvText)}
              disabled={!csvText || !preview || preview.errors.length > 0 || importMutation.isPending}
            >
              {importMutation.isPending ? 'Đang import...' : 'Import'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ResponsiveModal>
  )
}
