import { useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { User, Lock, Camera, Save, Eye, EyeOff, Loader2, Palette } from 'lucide-react'
import type { ApiResponse } from '@/types/api'

interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  created_at: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Profile form state
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Fetch profile
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<UserProfile>>('/users/me')
      return res.data.data
    },
  })

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: { full_name?: string; avatar_url?: string }) => {
      const res = await api.put<ApiResponse<UserProfile>>('/users/me', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Cập nhật thông tin thành công!')
    },
    onError: () => {
      toast.error('Không thể cập nhật thông tin')
    },
  })

  // Change password mutation
  const changePassword = useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      const res = await api.post<ApiResponse<{ message: string }>>('/users/me/password', data)
      return res.data.data
    },
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Đổi mật khẩu thành công!')
    },
    onError: () => {
      toast.error('Mật khẩu hiện tại không đúng')
    },
  })

  // Upload avatar mutation
  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post<ApiResponse<{ url: string }>>('/uploads/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data.data
    },
    onSuccess: (data) => {
      setAvatarUrl(data.url)
      setAvatarPreview(null)
      // Auto-save profile with new avatar
      updateProfile.mutate({ avatar_url: data.url })
    },
    onError: () => {
      toast.error('Không thể upload ảnh')
      setAvatarPreview(null)
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh phải nhỏ hơn 5MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)

    // Upload
    uploadAvatar.mutate(file)
  }

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile.mutate({
      full_name: fullName || undefined,
      avatar_url: avatarUrl || undefined,
    })
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }
    
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }
    
    changePassword.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Tài khoản của tôi</h1>

      {/* Avatar & Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Thông tin cá nhân
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                {(avatarPreview || avatarUrl) ? (
                  <img
                    src={avatarPreview || avatarUrl}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                    {getInitials(fullName || user?.full_name || 'U')}
                  </div>
                )}
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-white dark:bg-gray-700 rounded-full shadow-md flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600">
                  {uploadAvatar.isPending ? (
                    <Loader2 className="h-4 w-4 text-gray-600 dark:text-gray-400 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploadAvatar.isPending}
                  />
                </label>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Ảnh đại diện</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Click vào icon camera để upload ảnh</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG, GIF tối đa 5MB</p>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <Label htmlFor="full_name">Họ và tên</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="mt-1"
              />
            </div>

            {/* Email (readonly) */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || user?.email || ''}
                disabled
                className="mt-1 bg-gray-50 dark:bg-gray-800"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email không thể thay đổi</p>
            </div>

            <Button 
              type="submit" 
              disabled={updateProfile.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {updateProfile.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            Giao diện
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            Đổi mật khẩu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="current_password">Mật khẩu hiện tại</Label>
              <div className="relative mt-1">
                <Input
                  id="current_password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="new_password">Mật khẩu mới</Label>
              <div className="relative mt-1">
                <Input
                  id="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Tối thiểu 6 ký tự</p>
            </div>

            <div>
              <Label htmlFor="confirm_password">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1"
              />
            </div>

            <Button 
              type="submit" 
              disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
              variant="outline"
              className="gap-2"
            >
              <Lock className="h-4 w-4" />
              {changePassword.isPending ? 'Đang đổi...' : 'Đổi mật khẩu'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
