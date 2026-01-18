import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, MessageSquarePlus, Target, Hand, Flame } from 'lucide-react'
import { toast } from '@/components/ui/toaster'
import type { ApiResponse, CustomQuestion, CreateCustomQuestion } from '@/types/api'

const GAME_OPTIONS = [
  { value: 'truth_or_dare', label: 'Sự thật/Thách thức', icon: Target, color: 'pink' },
  { value: 'never_have_i_ever', label: 'Tôi chưa bao giờ', icon: Hand, color: 'blue' },
  { value: 'challenge', label: 'Thử thách', icon: Flame, color: 'orange' },
]

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Dễ' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'hard', label: 'Khó' },
  { value: 'extreme', label: 'Cực khó' },
]

export function CustomQuestions() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [newQuestion, setNewQuestion] = useState<CreateCustomQuestion>({
    game_type: 'truth_or_dare',
    content: '',
    difficulty: 'medium',
    is_public: false,
  })
  const [filterGameType, setFilterGameType] = useState<string>('')

  const { data: questions, isLoading } = useQuery({
    queryKey: ['custom-questions', filterGameType],
    queryFn: async () => {
      const url = filterGameType 
        ? `/games/custom?game_type=${filterGameType}` 
        : '/games/custom'
      const res = await api.get<ApiResponse<CustomQuestion[]>>(url)
      return res.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateCustomQuestion) => {
      const res = await api.post<ApiResponse<CustomQuestion>>('/games/custom', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-questions'] })
      setNewQuestion({ game_type: 'truth_or_dare', content: '', difficulty: 'medium', is_public: false })
      setShowForm(false)
      toast.success('Đã thêm câu hỏi mới!')
    },
    onError: () => {
      toast.error('Không thể thêm câu hỏi')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/games/custom/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-questions'] })
      toast.success('Đã xóa câu hỏi!')
    },
    onError: () => {
      toast.error('Không thể xóa câu hỏi')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQuestion.content.trim()) {
      toast.error('Vui lòng nhập nội dung câu hỏi')
      return
    }
    createMutation.mutate(newQuestion)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquarePlus className="h-5 w-5" />
            Câu hỏi tự tạo
          </CardTitle>
          <Button
            size="sm"
            variant={showForm ? 'outline' : 'default'}
            onClick={() => setShowForm(!showForm)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Đóng' : 'Thêm mới'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form thêm mới */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-zinc-900 border border-white/5 rounded-lg">
            <div>
              <label className="text-sm font-medium mb-1 block">Loại trò chơi</label>
              <select
                value={newQuestion.game_type}
                onChange={(e) => setNewQuestion({ ...newQuestion, game_type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {GAME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Nội dung</label>
              <Input
                value={newQuestion.content}
                onChange={(e) => setNewQuestion({ ...newQuestion, content: e.target.value })}
                placeholder="VD: Bạn đã từng làm gì điên rồ nhất?"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Độ khó</label>
                <select
                  value={newQuestion.difficulty || 'medium'}
                  onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Công khai</label>
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={newQuestion.is_public || false}
                    onChange={(e) => setNewQuestion({ ...newQuestion, is_public: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">Cho phép người khác sử dụng</span>
                </label>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Đang thêm...' : 'Thêm câu hỏi'}
            </Button>
          </form>
        )}

        {/* Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterGameType('')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filterGameType === '' ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Tất cả
          </button>
          {GAME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterGameType(opt.value)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filterGameType === opt.value ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Danh sách */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-zinc-800 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !questions || questions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Bạn chưa tạo câu hỏi nào
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {questions.map((q) => {
              const gameOpt = GAME_OPTIONS.find((o) => o.value === q.game_type)
              const Icon = gameOpt?.icon || Target
              return (
                <div
                  key={q.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-white/5 hover:bg-zinc-800/80 group"
                >
                  <Icon className={`h-4 w-4 text-${gameOpt?.color || 'gray'}-500 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{q.content}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        Đã dùng {q.use_count || 0} lần
                      </span>
                      {q.is_public && (
                        <span className="text-xs bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                          Công khai
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteMutation.mutate(q.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CustomQuestions
