import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, Key, Users } from 'lucide-react'
import { toast } from '@/components/ui/toaster'
import type { ApiResponse } from '@/types/api'

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

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdminUser[]>>('/admin/users')
      return res.data.data
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

  if (isLoading) {
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
