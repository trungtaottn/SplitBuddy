import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, Key, Users, ToggleLeft, ToggleRight, Settings, Music, Upload, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/toaster'
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext'
import { useMusic } from '@/contexts/MusicContext'
import type { ApiResponse, FeatureFlag } from '@/types/api'

interface MusicTrack {
  id: string
  name: string
  src: string
}

interface AdminUser {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
}

export default function AdminPage() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  
  const [musicName, setMusicName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { refresh: refreshFeatureFlags } = useFeatureFlags()
  const { refreshTracks } = useMusic()

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdminUser[]>>('/admin/users')
      return res.data.data
    },
  })

  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ['admin', 'features'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<FeatureFlag[]>>('/admin/features')
      return res.data.data
    },
  })

  const { data: musicTracks, isLoading: musicLoading } = useQuery({
    queryKey: ['admin', 'music'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<MusicTrack[]>>('/admin/music')
      return res.data.data
    },
  })

  const deleteMusic = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/music/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'music'] })
      refreshTracks()
      toast.success('Đã xóa bài nhạc!')
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi xóa')
    },
  })

  const handleUploadMusic = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      toast.error('Vui lòng chọn file âm thanh (mp3, m4a, ...)')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File quá lớn. Giới hạn 50MB')
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    if (musicName.trim()) {
      formData.append('name', musicName.trim())
    }

    try {
      await api.post('/admin/music', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      queryClient.invalidateQueries({ queryKey: ['admin', 'music'] })
      refreshTracks()
      setMusicName('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success('Tải nhạc lên thành công!')
    } catch {
      toast.error('Có lỗi xảy ra khi tải lên')
    } finally {
      setIsUploading(false)
    }
  }

  const toggleFeature = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      await api.put(`/admin/features/${key}`, { enabled })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'features'] })
      refreshFeatureFlags()
      toast.success('Cập nhật thành công!')
    },
    onError: () => {
      toast.error('Có lỗi xảy ra')
    },
  })

  const createUser = useMutation({
    mutationFn: async (data: { email: string; full_name: string; password: string }) => {
      await api.post('/admin/users', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setShowCreateModal(false)
      setNewEmail('')
      setNewName('')
      setNewPassword('')
      toast.success('Tạo tài khoản thành công!')
    },
    onError: () => {
      toast.error('Có lỗi xảy ra. Email có thể đã tồn tại.')
    },
  })

  const resetUserPassword = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      await api.put(`/admin/users/${userId}/password`, { new_password: newPassword })
    },
    onSuccess: () => {
      setShowResetModal(false)
      setSelectedUserId(null)
      setResetPassword('')
      toast.success('Đặt lại mật khẩu thành công!')
    },
    onError: () => {
      toast.error('Có lỗi xảy ra')
    },
  })

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail || !newName || !newPassword) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }
    createUser.mutate({
      email: newEmail,
      full_name: newName,
      password: newPassword,
    })
  }

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId || !resetPassword) {
      toast.error('Vui lòng nhập mật khẩu mới')
      return
    }
    resetUserPassword.mutate({
      userId: selectedUserId,
      newPassword: resetPassword,
    })
  }

  if (isLoading || featuresLoading || musicLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Tạo tài khoản
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Danh sách người dùng ({users?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users?.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Chưa có người dùng nào
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left font-medium">Họ tên</th>
                    <th className="py-3 text-left font-medium">Email</th>
                    <th className="py-3 text-left font-medium">Ngày tạo</th>
                    <th className="py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-3">{user.full_name}</td>
                      <td className="py-3">{user.email}</td>
                      <td className="py-3">
                        {new Date(user.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUserId(user.id)
                            setShowResetModal(true)
                          }}
                          className="gap-1"
                        >
                          <Key className="h-3 w-3" />
                          Đặt lại MK
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Flags Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quản lý tính năng ({features?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Bật/tắt các tính năng cho tất cả người dùng. Tính năng bị tắt sẽ không hiển thị trên ứng dụng.
          </p>
          <div className="grid gap-3">
            {features?.map((feature) => (
              <div
                key={feature.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">{feature.name}</div>
                  {feature.description && (
                    <div className="text-sm text-muted-foreground">{feature.description}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">Key: {feature.key}</div>
                </div>
                <Button
                  variant={feature.enabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFeature.mutate({ key: feature.key, enabled: !feature.enabled })}
                  disabled={toggleFeature.isPending}
                  className="gap-2 min-w-[100px]"
                >
                  {feature.enabled ? (
                    <>
                      <ToggleRight className="h-4 w-4" />
                      Bật
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4" />
                      Tắt
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Music Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Quản lý nhạc nền ({musicTracks?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Tải lên các file nhạc nền cho ứng dụng. Chỉ admin mới có thể quản lý.
          </p>
          
          {/* Upload Section */}
          <div className="mb-6 p-4 border rounded-lg bg-muted/30">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="musicName" className="text-sm mb-1 block">Tên bài hát (tùy chọn)</Label>
                <Input
                  id="musicName"
                  value={musicName}
                  onChange={(e) => setMusicName(e.target.value)}
                  placeholder="Để trống sẽ dùng tên file"
                />
              </div>
              <div className="flex items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleUploadMusic}
                  className="hidden"
                  id="musicFile"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? 'Đang tải...' : 'Chọn file nhạc'}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Hỗ trợ: MP3, M4A, WAV, OGG (tối đa 50MB)
            </p>
          </div>

          {/* Track List */}
          {musicTracks?.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Chưa có bài nhạc nào. Tải lên bài đầu tiên!
            </p>
          ) : (
            <div className="space-y-2">
              {musicTracks?.map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{track.name}</p>
                      <p className="text-xs text-muted-foreground">{track.src}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm(`Xóa bài "${track.name}"?`)) {
                        deleteMusic.mutate(track.id)
                      }
                    }}
                    disabled={deleteMusic.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Tạo tài khoản mới</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Họ tên</Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" className="flex-1" disabled={createUser.isPending}>
                    {createUser.isPending ? 'Đang tạo...' : 'Tạo'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Đặt lại mật khẩu</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetPassword">Mật khẩu mới</Label>
                  <Input
                    id="resetPassword"
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowResetModal(false)
                      setSelectedUserId(null)
                      setResetPassword('')
                    }}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" className="flex-1" disabled={resetUserPassword.isPending}>
                    {resetUserPassword.isPending ? 'Đang xử lý...' : 'Đặt lại'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
