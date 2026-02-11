import { Info } from 'lucide-react'

export function ClosureNoticeBanner() {
  return (
    <section
      aria-label="Thông báo đóng cửa"
      className="relative w-full overflow-hidden border-b border-amber-500/20 animate-in slide-in-from-top duration-700"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-background" />

      {/* Shimmer sweep */}
      <div className="absolute inset-0 bg-[length:200%_100%] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />

      <div className="relative container mx-auto px-6 py-3">
        <p className="text-sm text-center text-white">
          <Info className="inline-block h-4 w-4 -mt-0.5 mr-1 text-red-500 animate-pulse" />
          <span className="font-bold text-red-500">THÔNG BÁO:</span>{' '}
          TRANG NÀY SẼ ĐƯỢC ĐÓNG VÀO NGÀY{' '}
          <span className="font-bold text-white">16/02/2026</span>.
          <br />
          <span className="font-bold text-white">
            Cảm ơn tất cả các bạn đã đồng hành cùng nhau và cuối cùng chúc các bạn một năm mới với tất cả niềm vui!
          </span>
        </p>
      </div>
    </section>
  )
}
