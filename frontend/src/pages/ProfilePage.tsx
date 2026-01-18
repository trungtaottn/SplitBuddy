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
import { User, Lock, Camera, Save, Eye, EyeOff, Loader2, Palette, Sparkles, Trophy, Star, Lightbulb, Landmark, Plus, Pencil, Trash2, Bell, QrCode } from 'lucide-react'
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
    <div className="w-full space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Tài khoản của tôi</h1>
        <p className="text-zinc-400 font-medium mt-1">Quản lý thông tin cá nhân và cài đặt</p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        {/* Left Column: Personal Info & Security */}
        <div className="space-y-6">
          {/* Avatar & Basic Info */}
          <Card className="bg-zinc-900 border-white/5 overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-white font-heading font-bold">
                <User className="h-5 w-5 text-orange-500" />
                Thông tin cá nhân
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 blur-sm opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="relative w-24 h-24 rounded-full p-1 bg-zinc-900">
                      {(avatarPreview || avatarUrl) ? (
                        <img
                          src={avatarPreview || avatarUrl}
                          alt="Avatar"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-orange-500 text-3xl font-bold font-heading border border-white/5">
                          {getInitials(fullName || user?.full_name || 'U')}
                        </div>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 hover:text-white text-zinc-400 border border-zinc-700 transition-all shadow-lg z-10">
                      {uploadAvatar.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
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
                    <h3 className="font-bold text-white text-lg">{fullName || 'Chưa đặt tên'}</h3>
                    <p className="text-zinc-500 text-sm mb-2">{user?.email}</p>
                    <p className="text-xs text-orange-500/80 bg-orange-500/10 px-2 py-1 rounded w-fit">
                      Click icon camera để thay đổi ảnh
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-zinc-400">Họ và tên</Label>
                    <Input
                      id="full_name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-zinc-400">Email</Label>
                    <Input
                      id="email"
                      value={profile?.email || user?.email || ''}
                      disabled
                      className="bg-zinc-900 border-white/5 text-zinc-500"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={updateProfile.isPending}
                  className="bg-white text-black hover:bg-zinc-200 font-bold w-full sm:w-auto"
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="bg-zinc-900 border-white/5 overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-white font-heading font-bold">
                <Lock className="h-5 w-5 text-zinc-400" />
                Bảo mật
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password" className="text-zinc-400">Mật khẩu hiện tại</Label>
                  <div className="relative">
                    <Input
                      id="current_password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 pr-10 focus-visible:ring-orange-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_password" className="text-zinc-400">Mật khẩu mới</Label>
                    <div className="relative">
                      <Input
                        id="new_password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 pr-10 focus-visible:ring-orange-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password" className="text-zinc-400">Xác nhận</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500/50"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
                  variant="outline"
                  className="w-full sm:w-auto border-white/10 hover:bg-zinc-800 text-zinc-300"
                >
                  {changePassword.isPending ? 'Đang đổi...' : 'Đổi mật khẩu'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Bank Accounts */}
          <Card className="bg-zinc-900 border-white/5 overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg text-white font-heading font-bold">
                <Landmark className="h-5 w-5 text-emerald-500" />
                Tài khoản ngân hàng
              </CardTitle>
              <Button 
                size="sm" 
                className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold" 
                onClick={openAddBank}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Thêm
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {(bankAccounts || []).length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-xl">
                  <Landmark className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm">Chưa có tài khoản ngân hàng nào.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {bankAccounts?.map((b) => (
                    <div
                      key={b.id}
                      className="group flex items-center justify-between rounded-xl bg-zinc-800/30 border border-white/5 p-4 hover:bg-zinc-800 hover:border-white/10 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-white truncate">{b.bank_name}</p>
                          {b.is_default && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                              Default
                            </span>
                          )}
                          {b.qr_image_url && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 flex items-center gap-1">
                              <QrCode className="h-3 w-3" />
                              QR
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-mono text-zinc-400 truncate">
                          {b.account_number} <span className="mx-1 text-zinc-600">|</span> {b.account_holder_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEditBank(b)} 
                          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteBankAccount.mutate(b.id)}
                          className="h-8 w-8 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/10 text-blue-400 text-xs">
                <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Tài khoản được đánh dấu "Default" sẽ được dùng để tạo mã VietQR tự động khi thanh toán.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Achievements & Extras */}
        <div className="space-y-6">
          {/* XP Card */}
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-white/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Trophy className="h-24 w-24 text-white" />
            </div>
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-white font-heading font-bold flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                Cấp độ {persona?.persona.level || 1}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="mb-2 flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                <span>XP Progress</span>
                <span>{persona?.persona.xp || 0} XP</span>
              </div>
              <div className="h-3 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                  style={{ width: `${(persona?.persona.xp || 0) % 100}%` }}
                />
              </div>
              
              {persona?.persona.current_title && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-zinc-500 mb-1 font-medium">Danh hiệu hiện tại</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 text-violet-300 text-sm font-bold shadow-lg shadow-violet-900/10">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5 text-violet-400" />
                    {persona.persona.current_title}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievements List */}
          <Card className="bg-zinc-900 border-white/5">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-white text-base font-bold flex items-center justify-between">
                <span>Thành tích</span>
                <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{achievements?.length || 0}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {achievements && achievements.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                   {achievements.slice(0, 9).map((a) => (
                    <div 
                      key={a.code}
                      className="aspect-square flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-800 border border-white/5 text-center group hover:border-orange-500/30 transition-colors cursor-help relative"
                      title={a.description || a.name}
                    >
                      <span className="text-2xl mb-1 filter drop-shadow-md group-hover:scale-110 transition-transform">{a.icon}</span>
                      <span className="text-[10px] text-zinc-400 font-medium line-clamp-1 w-full overflow-hidden text-ellipsis">{a.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 italic text-center py-4">Chưa có thành tích nào.</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-3">
             <Button 
              onClick={() => setShowWrapped(true)}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-fuchsia-900/20 border-0"
            >
              <div className="bg-white/20 p-1.5 rounded-full mr-3">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-bold">Xem Wrapped 2024</span>
            </Button>
            
            <Card className="bg-zinc-900 border-white/5">
               <CardContent className="p-0">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                         <Palette className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-zinc-300 text-sm">Giao diện</span>
                    </div>
                    <ThemeToggle showLabel={false} className="[&_span]:hidden" />
                  </div>
                  
                   <div className="p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                          <Bell className="h-4 w-4" />
                        </div>
                         <div className="flex flex-col">
                            <span className="font-medium text-zinc-300 text-sm">Thông báo</span>
                            <span className="text-[10px] text-zinc-500">Push Notification</span>
                         </div>
                     </div>
                     <div className="flex items-center gap-2">
                       {pushSupported && (
                         <div className={`w-3 h-3 rounded-full ${pushEnabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500/20'}`} />
                       )}
                     </div>
                   </div>
                   
                   {pushSupported && (
                     <div className="px-4 pb-4">
                        <Button 
                          size="sm" 
                          variant={pushEnabled ? "outline" : "default"}
                          disabled={pushLoading}
                          onClick={async () => {
                             // Copied logic from original file, compacted for brevity
                             // ... (Push toggle logic as before)
                             if(pushEnabled) {
                                // Logic to disable
                                 setPushLoading(true)
                                 try {
                                   const reg = await navigator.serviceWorker.getRegistration()
                                   if (reg) {
                                      const sub = await reg.pushManager.getSubscription()
                                      if (sub) {
                                        await api.post('/notifications/push/unsubscribe', { endpoint: sub.endpoint })
                                        await sub.unsubscribe()
                                        setPushEnabled(false)
                                        toast.success('Đã tắt push notifications')
                                      }
                                   }
                                 } catch(e) { toast.error('Lỗi khi tắt push') } finally { setPushLoading(false) }
                             } else {
                                // Logic to enable
                                 const vapidKey = (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_VAPID_PUBLIC_KEY
                                 if (!vapidKey) return toast.error('Thiếu VAPID Key')
                                 setPushLoading(true)
                                 try {
                                    const permission = await Notification.requestPermission()
                                    if(permission !== 'granted') return toast.error('Cần cấp quyền Notification')
                                    const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'))
                                    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({
                                       userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey)
                                    }))
                                    const json = sub.toJSON()
                                    if(json.endpoint && json.keys?.p256dh && json.keys?.auth) {
                                       await api.post('/notifications/push/subscribe', { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } })
                                       setPushEnabled(true)
                                       toast.success('Đã bật push!')
                                    }
                                 } catch(e) { toast.error('Lỗi khi bật push') } finally { setPushLoading(false) }
                             }
                          }}
                          className={`w-full text-xs h-8 ${pushEnabled ? 'border-white/10 text-zinc-400 hover:text-white' : 'bg-white text-black hover:bg-zinc-200'}`}
                        >
                           {pushLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : (pushEnabled ? 'Tắt thông báo' : 'Bật thông báo')}
                        </Button>
                     </div>
                   )}
               </CardContent>
            </Card>
          </div>
          
           <div className="text-center">
             <p className="text-[10px] text-zinc-600 font-mono">Split Buddy v{appVersion}</p>
           </div>
        </div>
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
        description="Thông tin này sẽ được mã hóa và bảo mật."
      >
         {/* ... Bank Form ... */}
         <div className="pt-2">
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
                    <Label htmlFor="bankName" className="text-zinc-400">Tên ngân hàng</Label>
                    <Input
                      id="bankName"
                      placeholder="VD: MB Bank, Vietcombank..."
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber" className="text-zinc-400">Số tài khoản</Label>
                    <Input
                      id="accountNumber"
                      placeholder="0123456789"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                       className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50 font-mono"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="accountHolder" className="text-zinc-400">Chủ tài khoản</Label>
                    <Input
                      id="accountHolder"
                      placeholder="NGUYEN VAN A"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                       className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50 uppercase"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                     <input
                        type="checkbox"
                        id="isDefault"
                        checked={isDefaultBank}
                        onChange={(e) => setIsDefaultBank(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/50"
                     />
                     <label htmlFor="isDefault" className="text-sm text-zinc-300 cursor-pointer select-none">
                        Đặt làm tài khoản mặc định
                     </label>
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800"
                      onClick={() => setShowBankModal(false)}
                    >
                      Hủy
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={addBankAccount.isPending || updateBankAccount.isPending}
                    >
                      {editingBank ? 'Cập nhật' : 'Thêm mới'}
                    </Button>
                  </div>
              </form>
         </div>
      </ResponsiveModal>
      
      {/* Support Info */}
      <div className="text-center pb-8 opacity-50 hover:opacity-100 transition-opacity">
        <ResetOnboardingButton />
      </div>
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
