import { Toaster as SonnerToaster } from 'sonner'

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
