import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { api as axiosApi } from '@/lib/axios' // Needed for direct put to /users/me
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, Sparkles } from 'lucide-react'
import type { UserPersona } from '@/types/api'
import { useAuth } from '@/contexts/AuthContext'

interface PersonaEditorProps {
  isOpen: boolean
  onClose: () => void
  initialData: UserPersona
  unlockedTitles: string[]
}

const AVATAR_STYLES = [
  { value: 'adventurer', label: 'Phiêu lưu' },
  { value: 'avataaars', label: 'Hoạt hình' },
  { value: 'bottts', label: 'Robot' },
  { value: 'lorelei', label: 'Nghệ thuật' },
  { value: 'micah', label: 'Hiện đại' },
  { value: 'notionists', label: 'Notion' },
  { value: 'open-peeps', label: 'Vẽ tay' },
  { value: 'personas', label: 'Phẳng' },
]

export function PersonaEditor({ isOpen, onClose, initialData, unlockedTitles }: PersonaEditorProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  const [avatarStyle, setAvatarStyle] = useState(initialData.avatar_style || 'micah')
  const [avatarBackground, setAvatarBackground] = useState(initialData.avatar_background || 'linear-gradient(to right, #f97316, #ec4899)')
  const [currentTitle, setCurrentTitle] = useState(initialData.current_title || '')
  const [useAsAvatar, setUseAsAvatar] = useState(false)

  useEffect(() => {
    if (isOpen) {
        setAvatarStyle(initialData.avatar_style || 'micah')
        setAvatarBackground(initialData.avatar_background || 'linear-gradient(to right, #f97316, #ec4899)')
        setCurrentTitle(initialData.current_title || '')
        setUseAsAvatar(false)
    }
  }, [isOpen, initialData])

  const updatePersona = useMutation({
    mutationFn: async (data: any) => {
      // 1. Update Persona
      await api.personas.updateMe(data)
      
      // 2. Update User Avatar if requested
      if (useAsAvatar && user?.id) {
          const avatarUrl = `https://api.dicebear.com/7.x/${data.avatar_style}/svg?seed=${user.id}`
          await axiosApi.put('/users/me', { avatar_url: avatarUrl })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persona', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] }) // Update profile avatar in UI
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      toast.success('Đã cập nhật giao diện!')
      onClose()
    },
    onError: () => {
      toast.error('Không thể cập nhật giao diện')
    }
  })

  const handleSave = () => {
    updatePersona.mutate({
      avatar_style: avatarStyle,
      avatar_background: avatarBackground,
      current_title: currentTitle || null
    })
  }

  // Preview Image
  const previewUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${user?.id || 'preview'}`

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tùy chỉnh Giao diện"
      description="Thay đổi cách bạn xuất hiện trên bảng xếp hạng và trong game."
    >
      <div className="space-y-6 pt-4">
        
        {/* Style Selector */}
        <div className="space-y-3">
          <Label>Phong cách Avatar</Label>
          <div className="grid grid-cols-2 gap-2 h-48 overflow-y-auto pr-1">
            {AVATAR_STYLES.map((style) => (
                <div 
                    key={style.value}
                    onClick={() => setAvatarStyle(style.value)}
                    className={`cursor-pointer rounded-xl border-2 p-2 flex items-center gap-2 transition-all ${
                        avatarStyle === style.value 
                        ? 'border-orange-500 bg-orange-500/10' 
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    }`}
                >
                    <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                        <img 
                            src={`https://api.dicebear.com/7.x/${style.value}/svg?seed=${user?.id || 'preview'}`} 
                            alt={style.label}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <span className={`text-sm font-medium ${avatarStyle === style.value ? 'text-orange-500' : 'text-zinc-400'}`}>
                        {style.label}
                    </span>
                </div>
            ))}
          </div>
        </div>

        {/* Live Preview & Checkbox */}
        <div className="flex items-center gap-4 p-3 bg-zinc-900 rounded-xl border border-white/5">
             <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 shrink-0">
                 <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
             </div>
             <div className="flex-1 space-y-2">
                 <p className="text-sm font-medium text-white">Xem trước Avatar</p>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="useAvatar" checked={useAsAvatar} onCheckedChange={(c) => setUseAsAvatar(c === true)} />
                    <label
                        htmlFor="useAvatar"
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-400 cursor-pointer select-none"
                    >
                        Sử dụng làm ảnh đại diện chính
                    </label>
                </div>
             </div>
        </div>

        {/* Title Selector */}
        <div className="space-y-3">
            <Label>Danh hiệu</Label>
            <Select value={currentTitle} onValueChange={setCurrentTitle}>
                <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-left">
                    <SelectValue placeholder="Chọn danh hiệu" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">(Không có)</SelectItem>
                    {unlockedTitles.length > 0 ? (
                        unlockedTitles.map(t => (
                            <SelectItem key={t} value={t}>
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-yellow-500" />
                                    <span>{t}</span>
                                </div>
                            </SelectItem>
                        ))
                    ) : (
                        <div className="p-2 text-xs text-zinc-500 text-center">
                            Chưa mở khóa danh hiệu nào
                        </div>
                    )}
                </SelectContent>
            </Select>
            <p className="text-[10px] text-zinc-500">Mở khóa thêm danh hiệu bằng cách hoàn thành thành tích.</p>
        </div>

        {/* Background Color */}
        <div className="space-y-3">
           <Label>Màu nền thẻ (Profile/Leaderboard)</Label>
           <div className="flex gap-2 flex-wrap">
               {[
                   'linear-gradient(to right, #f97316, #ec4899)', // Orange Pink
                   'linear-gradient(to right, #3b82f6, #8b5cf6)', // Blue Purple
                   'linear-gradient(to right, #10b981, #3b82f6)', // Green Blue
                   'linear-gradient(to right, #ef4444, #f97316)', // Red Orange
                   'linear-gradient(to right, #8b5cf6, #ec4899)', // Purple Pink
                   '#18181b', // Zinc 900
                   '#09090b', // Zinc 950
               ].map((bg) => (
                   <div 
                     key={bg}
                     onClick={() => setAvatarBackground(bg)}
                     className={`w-10 h-10 rounded-full cursor-pointer transition-transform hover:scale-110 border border-white/10 ${avatarBackground === bg ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-950' : ''}`}
                     style={{ background: bg }}
                   />
               ))}
           </div>
        </div>

        <Button 
            className="w-full h-12 text-base font-bold bg-white text-black hover:bg-zinc-200" 
            onClick={() => handleSave()} 
            disabled={updatePersona.isPending}
        >
            {updatePersona.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SaveIcon />}
            {updatePersona.isPending ? 'Đang lưu...' : 'Lưu Thay Đổi'}
        </Button>
      </div>
    </ResponsiveModal>
  )
}

function SaveIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
    )
}
