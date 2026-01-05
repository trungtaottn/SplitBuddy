import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'
import { CheckCircle2, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      expand={false}
      richColors
      toastOptions={{
        style: {
          background: 'hsl(var(--card))',
          border: '2px solid hsl(var(--border))',
          borderRadius: '0',
          padding: '12px 16px',
          boxShadow: 'var(--shadow-lifted)',
          fontFamily: 'var(--font-mono)',
        },
        className: 'toast-retro animate-paper-fold',
        duration: 4000,
      }}
    />
  )
}

export const toast = {
  success: (message: string) => {
    sonnerToast.success(message, {
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    })
  },
  error: (message: string) => {
    sonnerToast.error(message, {
      icon: <XCircle className="h-5 w-5 text-red-500" />,
    })
  },
  warning: (message: string) => {
    sonnerToast.warning(message, {
      icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
    })
  },
  info: (message: string) => {
    sonnerToast.info(message, {
      icon: <Info className="h-5 w-5 text-blue-500" />,
    })
  },
  loading: (message: string) => {
    return sonnerToast.loading(message, {
      icon: <Loader2 className="h-5 w-5 text-primary animate-spin" />,
    })
  },
  dismiss: (id?: string | number) => {
    sonnerToast.dismiss(id)
  },
  promise: sonnerToast.promise,
}
