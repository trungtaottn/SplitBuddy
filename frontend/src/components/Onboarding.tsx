import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { X, ChevronRight, ChevronLeft, Lightbulb, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// Onboarding steps configuration
interface OnboardingStep {
  id: string
  target?: string // CSS selector for highlighting
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  emoji?: string
}

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Chào mừng đến Split Buddy!',
    description: 'Ứng dụng giúp bạn chia tiền nhậu dễ dàng với bạn bè. Hãy cùng tìm hiểu nhé!',
    position: 'center',
    emoji: '',
  },
  {
    id: 'create-session',
    target: '[data-onboarding="create-session"]',
    title: 'Tạo buổi nhậu',
    description: 'Bấm vào đây để tạo buổi nhậu mới. Thêm bạn bè và bắt đầu chia tiền!',
    position: 'bottom',
    emoji: '',
  },
  {
    id: 'add-bill',
    target: '[data-onboarding="add-bill"]',
    title: 'Thêm hóa đơn',
    description: 'Sau khi tạo session, thêm các bill và chọn ai trả tiền, ai được chia.',
    position: 'bottom',
    emoji: '',
  },
  {
    id: 'view-debts',
    target: '[data-onboarding="debts"]',
    title: 'Xem công nợ',
    description: 'Xem ai nợ ai bao nhiêu, và nhắc nhở thanh toán dễ dàng!',
    position: 'right',
    emoji: '',
  },
  {
    id: 'play-games',
    target: '[data-onboarding="games"]',
    title: 'Chơi game vui',
    description: 'Mini games vui nhộn để làm cuộc nhậu thêm sôi động!',
    position: 'right',
    emoji: '',
  },
]

// Context for onboarding state
interface OnboardingContextType {
  isActive: boolean
  currentStep: number
  steps: OnboardingStep[]
  startOnboarding: () => void
  endOnboarding: () => void
  nextStep: () => void
  prevStep: () => void
  skipOnboarding: () => void
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}

// Provider component
export function OnboardingProvider({ 
  children,
  steps = DEFAULT_STEPS,
}: { 
  children: ReactNode
  steps?: OnboardingStep[]
}) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_hasCompleted, setHasCompleted] = useState(() => {
    // Check if user has completed onboarding
    return localStorage.getItem('splitbuddy-onboarding-completed') === 'true'
  })

  const startOnboarding = () => {
    setCurrentStep(0)
    setIsActive(true)
  }

  const endOnboarding = () => {
    setIsActive(false)
    setHasCompleted(true)
    localStorage.setItem('splitbuddy-onboarding-completed', 'true')
  }

  const skipOnboarding = () => {
    endOnboarding()
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      endOnboarding()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <OnboardingContext.Provider value={{
      isActive,
      currentStep,
      steps,
      startOnboarding,
      endOnboarding,
      nextStep,
      prevStep,
      skipOnboarding,
    }}>
      {children}
      {isActive && <OnboardingOverlay />}
    </OnboardingContext.Provider>
  )
}

// Overlay component that shows during onboarding
function OnboardingOverlay() {
  const { currentStep, steps, nextStep, prevStep, skipOnboarding } = useOnboarding()
  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1
  const isCentered = step.position === 'center' || !step.target

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Tooltip */}
      <div 
        className={cn(
          "absolute bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm animate-in zoom-in duration-300",
          isCentered && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          !isCentered && "left-4 right-4 sm:left-auto sm:right-auto sm:w-80"
        )}
      >
        {/* Close button */}
        <button 
          onClick={skipOnboarding}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>

        {/* Emoji */}
        {step.emoji && (
          <div className="text-5xl mb-4 animate-bounce">{step.emoji}</div>
        )}

        {/* Content */}
        <h3 className="text-lg font-bold mb-2">{step.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{step.description}</p>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === currentStep ? "bg-primary w-4" : "bg-gray-300 dark:bg-gray-600"
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          {!isFirst && (
            <Button variant="outline" onClick={prevStep} className="flex-1 gap-1">
              <ChevronLeft className="h-4 w-4" />
              Quay lại
            </Button>
          )}
          <Button onClick={nextStep} className="flex-1 gap-1 btn-gradient">
            {isLast ? 'Bắt đầu!' : 'Tiếp theo'}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Skip link */}
        {!isLast && (
          <button 
            onClick={skipOnboarding}
            className="w-full text-center mt-3 text-sm text-gray-400 hover:text-gray-600"
          >
            Bỏ qua hướng dẫn
          </button>
        )}
      </div>
    </div>
  )
}

// Contextual tip that shows inline
export function ContextualTip({
  id,
  title,
  description,
  showOnce = true,
  className,
}: {
  id: string
  title: string
  description: string
  showOnce?: boolean
  className?: string
}) {
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (showOnce) {
      const dismissed = localStorage.getItem(`tip-dismissed-${id}`)
      if (dismissed) {
        setIsDismissed(true)
      }
    }
  }, [id, showOnce])

  const dismiss = () => {
    setIsDismissed(true)
    if (showOnce) {
      localStorage.setItem(`tip-dismissed-${id}`, 'true')
    }
  }

  if (isDismissed) return null

  return (
    <div className={cn(
      "relative bg-primary/5 border border-primary/20 rounded-lg p-4 animate-in slide-in-from-top duration-300",
      className
    )}>
      <button 
        onClick={dismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary/10 transition-colors"
      >
        <X className="h-3.5 w-3.5 text-primary/60" />
      </button>
      
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h4 className="font-medium text-sm text-primary">{title}</h4>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  )
}

// Feature highlight badge for new features
export function NewFeatureBadge({ children }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium">
      <Sparkles className="h-3 w-3" />
      {children || 'Mới'}
    </span>
  )
}

// Button to restart onboarding
export function StartOnboardingButton() {
  const { startOnboarding } = useOnboarding()
  
  return (
    <Button 
      variant="ghost" 
      size="sm"
      onClick={startOnboarding}
      className="gap-2 text-gray-500"
    >
      <Lightbulb className="h-4 w-4" />
      Xem hướng dẫn
    </Button>
  )
}

