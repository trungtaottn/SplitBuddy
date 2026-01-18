import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Users, Pencil, Trash2, Play } from 'lucide-react'
import type { SessionTemplate } from '@/types/api'

export function TemplateCard({
  template,
  onCreateSession,
  onEdit,
  onDelete,
  isCreating = false,
}: {
  template: SessionTemplate
  onCreateSession?: () => void
  onEdit?: () => void
  onDelete?: () => void
  isCreating?: boolean
}) {
  const updatedAt = template.updated_at ? new Date(template.updated_at) : null

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{template.name}</CardTitle>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {template.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{template.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{template.participant_ids?.length || 0} người</span>
              </div>
              {updatedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Cập nhật: {updatedAt.toLocaleDateString('vi-VN')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onEdit && (
              <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Sửa template">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onDelete}
                aria-label="Xóa template"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Button
          className="w-full gap-2"
          onClick={onCreateSession}
          disabled={!onCreateSession || isCreating}
        >
          <Play className="h-4 w-4" />
          {isCreating ? 'Đang tạo...' : 'Tạo session từ template'}
        </Button>
      </CardContent>
    </Card>
  )
}

