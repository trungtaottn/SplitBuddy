import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/use-theme'
import { cn } from '@/lib/utils'
import { haptics } from '@/utils/haptics'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className, showLabel = true }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Sáng' },
    { value: 'dark' as const, icon: Moon, label: 'Tối' },
    { value: 'system' as const, icon: Monitor, label: 'Hệ thống' },
  ]

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {showLabel && (
        <label className="text-sm font-medium text-muted-foreground">
          Giao diện
        </label>
      )}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {options.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => {
              haptics.light()
              setTheme(value)
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
              theme === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ThemeToggleCompact({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <button
      onClick={() => {
        haptics.light()
        toggleTheme()
      }}
      className={cn(
        'p-2 rounded-lg hover:bg-muted transition-colors',
        className
      )}
      title={resolvedTheme === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
    >
      {resolvedTheme === 'light' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </button>
  )
}
