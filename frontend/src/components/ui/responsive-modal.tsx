import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

interface ResponsiveModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string | null
  children: React.ReactNode
  className?: string
  /** @deprecated use className instead - mapped to className for now */
  desktopClassName?: string
  /** @deprecated use className instead - mapped to className for now */
  sheetClassName?: string
  showHandle?: boolean
}

/**
 * ResponsiveModal
 * - Desktop: Renders a Shadcn UI Dialog
 * - Mobile: Renders a Vaul Drawer (Bottom Sheet)
 */
export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  desktopClassName,
  sheetClassName,
}: ResponsiveModalProps) {
  // Breakpoint can be adjusted. "md" (768px) is standard.
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // Normalize className
  const contentClassName = cn(className, desktopClassName, sheetClassName)

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className={cn("sm:max-w-[425px]", contentClassName)}>
          {(title || description) && (
            <DialogHeader>
              {title && <DialogTitle>{title}</DialogTitle>}
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
          )}
          {children}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className={contentClassName}>
        {(title || description) && (
          <DrawerHeader className="text-left">
            {title && <DrawerTitle>{title}</DrawerTitle>}
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
        )}
        <div className="p-4 pt-0">
         {children}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
