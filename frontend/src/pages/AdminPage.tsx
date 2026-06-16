import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, Key, Users, ToggleLeft, ToggleRight, Settings, Music, Upload, Trash2, Power, PowerOff, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from '@/components/ui/toast'
import { useFeatureFlags } from '@/contexts/use-feature-flags'
import { useMusic } from '@/contexts/use-music'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
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
  const [musicUrl, setMusicUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isAddingUrl, setIsAddingUrl] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { refresh: refreshFeatureFlags } = useFeatureFlags()
  const { refreshTracks } = useMusic()

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ data: AdminUser[], pagination: { total: number } }>>('/admin/users')
      return res.data.data
    },
  })
  const users = usersData?.data

  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ['admin', 'features'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<FeatureFlag[]>>('/admin/features')
      return res.data.data
    },
  })

  const { data: musicData, isLoading: musicLoading } = useQuery({
    queryKey: ['admin', 'music'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ data: MusicTrack[], pagination: { total: number } }>>('/admin/music')
      return res.data.data
    },
  })
  const musicTracks = musicData?.data

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

  const handleAddMusicUrl = async () => {
    if (!musicName.trim() || !musicUrl.trim()) {
      toast.error('Vui lòng nhập tên bài hát và URL')
      return
    }

    setIsAddingUrl(true)
    try {
      await api.post('/admin/music/url', {
        name: musicName.trim(),
        url: musicUrl.trim(),
      })
      queryClient.invalidateQueries({ queryKey: ['admin', 'music'] })
      refreshTracks()
      setMusicName('')
      setMusicUrl('')
      toast.success('Thêm nhạc từ URL thành công!')
    } catch {
      toast.error('Có lỗi xảy ra khi thêm URL')
    } finally {
      setIsAddingUrl(false)
    }
  }

  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set())

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

  const toggleAllFeatures = useMutation({
    mutationFn: async (enabled: boolean) => {
      await api.put('/admin/features/toggle-all', { enabled })
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'features'] })
      refreshFeatureFlags()
      toast.success(enabled ? 'Đã bật tất cả tính năng!' : 'Đã tắt tất cả tính năng!')
    },
    onError: () => {
      toast.error('Có lỗi xảy ra')
    },
  })

  const toggleModuleFeatures = useMutation({
    mutationFn: async ({ module, enabled }: { module: string; enabled: boolean }) => {
      await api.put(`/admin/features/module/${module}`, { enabled })
    },
    onSuccess: (_, { module, enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'features'] })
      refreshFeatureFlags()
      toast.success(`Đã ${enabled ? 'bật' : 'tắt'} module "${getModuleLabel(module)}"!`)
    },
    onError: () => {
      toast.error('Có lỗi xảy ra')
    },
  })

  // Group features by module
  const featuresByModule = features?.reduce((acc, feature) => {
    const module = feature.module || 'general'
    if (!acc[module]) acc[module] = []
    acc[module].push(feature)
    return acc
  }, {} as Record<string, FeatureFlag[]>) || {}

  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      general: 'Chung',
      sessions: 'Buổi nhậu',
      groups: 'Nhóm',
      debts: 'Công nợ',
      games: 'Trò chơi',
    }
    return labels[module] || module
  }

  const toggleModuleCollapse = (module: string) => {
    setCollapsedModules(prev => {
      const next = new Set(prev)
      if (next.has(module)) {
        next.delete(module)
      } else {
        next.add(module)
      }
      return next
    })
  }

  const isModuleFullyEnabled = (module: string) => {
    return featuresByModule[module]?.every(f => f.enabled) ?? false
  }

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

          {/* Bulk Actions */}
          <div className="flex gap-2 mb-4 p-3 rounded-lg border bg-muted/30">
            <Button
              variant="default"
              size="sm"
              onClick={() => toggleAllFeatures.mutate(true)}
              disabled={toggleAllFeatures.isPending}
              className="gap-2"
            >
              <Power className="h-4 w-4" />
              Bật tất cả
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllFeatures.mutate(false)}
              disabled={toggleAllFeatures.isPending}
              className="gap-2"
            >
              <PowerOff className="h-4 w-4" />
              Tắt tất cả
            </Button>
          </div>

          {/* Features grouped by module */}
          <div className="space-y-4">
            {Object.entries(featuresByModule).map(([module, moduleFeatures]) => (
              <div key={module} className="border rounded-lg overflow-hidden">
                {/* Module Header */}
                <div
                  className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => toggleModuleCollapse(module)}
                >
                  <div className="flex items-center gap-2">
                    {collapsedModules.has(module) ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="font-semibold">{getModuleLabel(module)}</span>
                    <span className="text-xs text-muted-foreground">
                      ({moduleFeatures.filter(f => f.enabled).length}/{moduleFeatures.length} bật)
                    </span>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant={isModuleFullyEnabled(module) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleModuleFeatures.mutate({
                        module,
                        enabled: !isModuleFullyEnabled(module)
                      })}
                      disabled={toggleModuleFeatures.isPending}
                      className="gap-1 text-xs h-7"
                    >
                      {isModuleFullyEnabled(module) ? (
                        <>
                          <ToggleRight className="h-3 w-3" />
                          Tắt module
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-3 w-3" />
                          Bật module
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Module Features */}
                {!collapsedModules.has(module) && (
                  <div className="divide-y">
                    {moduleFeatures.map((feature) => (
                      <div
                        key={feature.id}
                        className="flex items-center justify-between p-3 hover:bg-accent/30 transition-colors"
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
                )}
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

          {/* Add Music Section */}
          <div className="mb-6 p-4 border rounded-lg bg-muted/30 space-y-4">
            {/* Track Name */}
            <div>
              <Label htmlFor="musicName" className="text-sm mb-1 block">Tên bài hát</Label>
              <Input
                id="musicName"
                value={musicName}
                onChange={(e) => setMusicName(e.target.value)}
                placeholder="Nhập tên bài hát"
              />
            </div>

            {/* URL Input */}
            <div>
              <Label htmlFor="musicUrl" className="text-sm mb-1 block">URL nhạc (stream từ internet)</Label>
              <div className="flex gap-2">
                <Input
                  id="musicUrl"
                  value={musicUrl}
                  onChange={(e) => setMusicUrl(e.target.value)}
                  placeholder="https://example.com/music.mp3"
                  className="flex-1"
                />
                <Button
                  onClick={handleAddMusicUrl}
                  disabled={isAddingUrl || !musicName.trim() || !musicUrl.trim()}
                  className="gap-2"
                >
                  {isAddingUrl ? 'Đang thêm...' : 'Thêm URL'}
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-xs text-muted-foreground">hoặc</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            {/* File Upload */}
            <div>
              <Label className="text-sm mb-1 block">Upload file nhạc</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleUploadMusic}
                className="hidden"
                id="musicFile"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2 w-full"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Đang tải...' : 'Chọn file từ máy (MP3, M4A, WAV - max 50MB)'}
              </Button>
            </div>
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

      <ResponsiveModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Tạo tài khoản mới"
        desktopClassName="max-w-md"
      >
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
      </ResponsiveModal>

      <ResponsiveModal
        isOpen={showResetModal}
        onClose={() => {
          setShowResetModal(false)
          setSelectedUserId(null)
          setResetPassword('')
        }}
        title="Đặt lại mật khẩu"
        desktopClassName="max-w-md"
      >
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
      </ResponsiveModal>
    </div>
  )
}
