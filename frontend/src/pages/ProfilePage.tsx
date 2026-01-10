import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { User, Lock, Camera, Save, Eye, EyeOff, Loader2, Palette, Sparkles, Trophy, Star, Lightbulb, HelpCircle, Landmark, Plus, Pencil, Trash2, Bell, QrCode, X } from 'lucide-react'
import WrappedModal from '@/components/WrappedModal'
import { useOnboarding } from '@/components/Onboarding'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import type { ApiResponse, PersonaWithUser, UserAchievement, BankAccount, AddBankAccountDto, UpdateBankAccountDto } from '@/types/api'

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
  const [showWrapped, setShowWrapped] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [showBankModal, setShowBankModal] = useState(false)
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null)
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [isDefaultBank, setIsDefaultBank] = useState(false)
  const [bankQrUrl, setBankQrUrl] = useState<string | null>(null)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  // Check push support + current subscription
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setPushSupported(supported)

    if (!supported) return

    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (!reg) {
          setPushEnabled(false)
          return
        }
        const sub = await reg.pushManager.getSubscription()
        setPushEnabled(!!sub)
      } catch {
        setPushEnabled(false)
      }
    })()
  }, [])

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // Fetch app version
  useEffect(() => {
    fetch('/version.json')
      .then(res => res.json())
      .then(data => setAppVersion(data.version))
      .catch(() => setAppVersion('unknown'))
  }, [])

  // Fetch persona
  const { data: persona } = useQuery({
    queryKey: ['persona', 'me'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PersonaWithUser>>('/personas/me')
      return res.data.data
    },
  })

  // Fetch achievements
  const { data: achievements } = useQuery({
    queryKey: ['achievements', 'me'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<UserAchievement[]>>('/personas/achievements/me')
      return res.data.data
    },
  })
  
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

  // Bank accounts
  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<BankAccount[]>>('/users/me/bank-accounts')
      return res.data.data
    },
  })

  const resetBankForm = () => {
    setBankName('')
    setAccountNumber('')
    setAccountHolder('')
    setIsDefaultBank(false)
    setBankQrUrl(null)
    setEditingBank(null)
  }

  const openAddBank = () => {
    resetBankForm()
    setShowBankModal(true)
  }

  const openEditBank = (b: BankAccount) => {
    setEditingBank(b)
    setBankName(b.bank_name)
    setAccountNumber(b.account_number)
    setAccountHolder(b.account_holder_name)
    setIsDefaultBank(!!b.is_default)
    setBankQrUrl(b.qr_image_url || null)
    setShowBankModal(true)
  }

  const addBankAccount = useMutation({
    mutationFn: async (data: AddBankAccountDto) => {
      const res = await api.post<ApiResponse<BankAccount>>('/users/me/bank-accounts', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast.success('Đã thêm tài khoản ngân hàng!')
      setShowBankModal(false)
      resetBankForm()
    },
    onError: () => toast.error('Không thể thêm tài khoản ngân hàng.'),
  })

  const updateBankAccount = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBankAccountDto }) => {
      const res = await api.put<ApiResponse<BankAccount>>(`/users/me/bank-accounts/${id}`, data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast.success('Đã cập nhật tài khoản ngân hàng!')
      setShowBankModal(false)
      resetBankForm()
    },
    onError: () => toast.error('Không thể cập nhật tài khoản ngân hàng.'),
  })

  const deleteBankAccount = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/me/bank-accounts/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast.success('Đã xóa tài khoản ngân hàng!')
    },
    onError: () => toast.error('Không thể xóa tài khoản ngân hàng.'),
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
      {/* Page Header - Retro Typography */}
      <h1 className="text-2xl font-heading font-semibold text-foreground">Tài khoản của tôi</h1>

      {/* Avatar & Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Thông tin cá nhân
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Avatar - Retro style with warm colors */}
            <div className="flex items-center gap-4">
              <div className="relative">
                {(avatarPreview || avatarUrl) ? (
                  <img
                    src={avatarPreview || avatarUrl}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold font-heading">
                    {getInitials(fullName || user?.full_name || 'U')}
                  </div>
                )}
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-card rounded-full shadow-md flex items-center justify-center cursor-pointer hover:bg-secondary border border-border transition-colors">
                  {uploadAvatar.isPending ? (
                    <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 text-muted-foreground" />
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

      {/* Bank Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-lg">
            <span className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Tài khoản ngân hàng
            </span>
            <Button variant="outline" size="sm" className="gap-2" onClick={openAddBank}>
              <Plus className="h-4 w-4" />
              Thêm
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(bankAccounts || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có tài khoản ngân hàng nào.</p>
          ) : (
            <div className="space-y-2">
              {bankAccounts?.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{b.bank_name}</p>
                      {b.is_default && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                          Default
                        </span>
                      )}
                      {b.qr_image_url && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/40 text-muted-foreground border border-border/50">
                          QR
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {b.account_number} — {b.account_holder_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditBank(b)} aria-label="Sửa">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteBankAccount.mutate(b.id)}
                      aria-label="Xóa"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Tài khoản default sẽ được dùng để tạo VietQR khi thanh toán.
          </p>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Push Notifications (PWA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!pushSupported ? (
            <p className="text-sm text-muted-foreground">
              Trình duyệt hiện tại không hỗ trợ Push Notifications.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Bật để nhận thông báo đẩy (cần cài PWA và cho phép notifications).
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={pushLoading || pushEnabled}
                  onClick={async () => {
                    const vapidKey = (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_VAPID_PUBLIC_KEY
                    if (!vapidKey) {
                      toast.error('Thiếu VITE_VAPID_PUBLIC_KEY trong env')
                      return
                    }
                    setPushLoading(true)
                    try {
                      const permission = await Notification.requestPermission()
                      if (permission !== 'granted') {
                        toast.error('Bạn cần cho phép Notifications')
                        return
                      }

                      // Ensure SW registration exists (works best in production build with PWA)
                      const reg =
                        (await navigator.serviceWorker.getRegistration()) ||
                        (await navigator.serviceWorker.register('/sw.js'))

                      const existing = await reg.pushManager.getSubscription()
                      const sub =
                        existing ||
                        (await reg.pushManager.subscribe({
                          userVisibleOnly: true,
                          applicationServerKey: urlBase64ToUint8Array(vapidKey),
                        }))

                      const json = sub.toJSON()
                      const endpoint = json.endpoint
                      const keys = json.keys

                      if (!endpoint || !keys?.p256dh || !keys?.auth) {
                        toast.error('Subscription không hợp lệ')
                        return
                      }

                      await api.post('/notifications/push/subscribe', {
                        endpoint,
                        keys: {
                          p256dh: keys.p256dh,
                          auth: keys.auth,
                        },
                      })

                      setPushEnabled(true)
                      toast.success('Đã bật push notifications!')
                    } catch (e) {
                      console.error(e)
                      toast.error('Không thể bật push notifications')
                    } finally {
                      setPushLoading(false)
                    }
                  }}
                >
                  {pushLoading ? 'Đang bật...' : 'Bật'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={pushLoading || !pushEnabled}
                  onClick={async () => {
                    setPushLoading(true)
                    try {
                      const reg = await navigator.serviceWorker.getRegistration()
                      if (!reg) return
                      const sub = await reg.pushManager.getSubscription()
                      if (!sub) {
                        setPushEnabled(false)
                        return
                      }

                      const endpoint = sub.endpoint
                      await api.post('/notifications/push/unsubscribe', { endpoint })
                      await sub.unsubscribe()
                      setPushEnabled(false)
                      toast.success('Đã tắt push notifications')
                    } catch (e) {
                      console.error(e)
                      toast.error('Không thể tắt push notifications')
                    } finally {
                      setPushLoading(false)
                    }
                  }}
                >
                  {pushLoading ? 'Đang tắt...' : 'Tắt'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Lưu ý: Push hoạt động tốt nhất khi app được cài đặt như PWA và chạy trên HTTPS.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Persona & Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5" />
            Hồ sơ & Thành tích
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Level & XP */}
          {persona && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-bold">Level {persona.persona.level}</span>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all"
                    style={{ width: `${(persona.persona.xp % 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{persona.persona.xp} XP</p>
              </div>
            </div>
          )}

          {/* Current Title */}
          {persona?.persona.current_title && (
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-3">
              <p className="text-sm text-gray-500">Danh hiệu hiện tại</p>
              <p className="font-bold text-purple-600 dark:text-purple-400">
                {persona.persona.current_title}
              </p>
            </div>
          )}

          {/* Achievements */}
          {achievements && achievements.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Thành tích ({achievements.length})</p>
              <div className="flex flex-wrap gap-2">
                {achievements.slice(0, 6).map((a) => (
                  <div 
                    key={a.code}
                    className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1"
                    title={a.description || a.name}
                  >
                    <span>{a.icon}</span>
                    <span className="text-sm">{a.name}</span>
                  </div>
                ))}
                {achievements.length > 6 && (
                  <div className="text-sm text-gray-500 flex items-center">
                    +{achievements.length - 6} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wrapped Button */}
          <Button 
            onClick={() => setShowWrapped(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Xem Wrapped {new Date().getFullYear()}
          </Button>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="h-5 w-5" />
            Trợ giúp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ResetOnboardingButton />
        </CardContent>
      </Card>

      {/* Version Info */}
      <div className="text-center text-xs text-gray-400 py-4">
        <p>Split Buddy v{appVersion}</p>
      </div>

      {/* Wrapped Modal */}
      <WrappedModal 
        isOpen={showWrapped} 
        onClose={() => setShowWrapped(false)} 
      />

      {/* Bank Modal */}
      <ResponsiveModal
        isOpen={showBankModal}
        onClose={() => {
          setShowBankModal(false)
          resetBankForm()
        }}
        title={editingBank ? 'Cập nhật tài khoản' : 'Thêm tài khoản'}
        desktopClassName="max-w-lg"
      >
        <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
                    toast.error('Vui lòng nhập đầy đủ thông tin')
                    return
                  }

                  const payload: AddBankAccountDto = {
                    bank_name: bankName.trim(),
                    account_number: accountNumber.trim(),
                    account_holder_name: accountHolder.trim(),
                    is_default: isDefaultBank,
                    qr_image_url: bankQrUrl,
                  }

                  if (editingBank) {
                    updateBankAccount.mutate({ id: editingBank.id, data: payload })
                  } else {
                    addBankAccount.mutate(payload)
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Tên ngân hàng</Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="VD: Vietcombank" />
                </div>
                <div className="space-y-2">
                  <Label>Số tài khoản</Label>
                  <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="VD: 0123456789" />
                </div>
                <div className="space-y-2">
                  <Label>Chủ tài khoản</Label>
                  <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="VD: NGUYEN VAN A" />
                </div>

                {/* Bank QR image upload (recommended) */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Ảnh QR ngân hàng (khuyến nghị)
                  </Label>
                  {bankQrUrl ? (
                    <div className="relative group">
                      <img
                        src={bankQrUrl}
                        alt="Bank QR"
                        className="w-full h-48 object-contain rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setBankQrUrl(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="bank-qr-upload"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (!file.type.startsWith('image/')) {
                            toast.error('Chỉ chấp nhận file ảnh')
                            return
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('File ảnh phải nhỏ hơn 5MB')
                            return
                          }
                          try {
                            const formData = new FormData()
                            formData.append('file', file)
                            const res = await api.post<ApiResponse<{ url: string }>>('/uploads/bank-qr', formData, {
                              headers: { 'Content-Type': 'multipart/form-data' },
                            })
                            setBankQrUrl(res.data.data.url)
                            toast.success('Đã upload QR!')
                          } catch (err) {
                            console.error(err)
                            toast.error('Không thể upload QR. Vui lòng thử lại.')
                          } finally {
                            // reset input so the same file can be re-selected
                            ;(e.target as HTMLInputElement).value = ''
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => document.getElementById('bank-qr-upload')?.click()}
                      >
                        <QrCode className="h-4 w-4" />
                        Upload ảnh QR
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Hãy chụp/screenshot QR chuyển khoản trong app ngân hàng và upload lên. Khi người khác cần trả tiền, app sẽ ưu tiên dùng QR này để quét.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isDefaultBank}
                    onChange={(e) => setIsDefaultBank(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Đặt làm tài khoản mặc định
                </label>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowBankModal(false)
                      resetBankForm()
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={addBankAccount.isPending || updateBankAccount.isPending}
                  >
                    {addBankAccount.isPending || updateBankAccount.isPending ? 'Đang lưu...' : 'Lưu'}
                  </Button>
                </div>
        </form>
      </ResponsiveModal>
    </div>
  )
}

// Reset onboarding button component
function ResetOnboardingButton() {
  const { startOnboarding } = useOnboarding()
  
  const handleReset = () => {
    localStorage.removeItem('splitbuddy-onboarding-completed')
    localStorage.removeItem('splitbuddy-onboarding-shown')
    startOnboarding()
  }
  
  return (
    <Button 
      variant="outline" 
      className="w-full gap-2"
      onClick={handleReset}
    >
      <Lightbulb className="h-4 w-4" />
      Xem lại hướng dẫn sử dụng
    </Button>
  )
}
