import { useState, useEffect } from 'react'

/**
 * SloganBanner - Vintage Typewriter Style
 * Features:
 * - Sepia monochrome text
 * - Typewriter font
 * - Paper texture feel
 */

const SLOGANS = [
  "Không nhậu đời không nể!",
  "Nhậu là nghệ thuật, say là đẳng cấp!",
  "Cuộc đời ngắn lắm, nhậu đi đừng ngại!",
  "Một ly không say, hai ly chưa đủ!",
  "Bạn bè là để nhậu cùng!",
  "Hôm nay không nhậu, mai hối hận!",
  "Tiền tiêu hết, tình bạn còn mãi!",
  "Bia lạnh, bạn thân, cuộc đời tươi đẹp!",
  "Nhậu để quên buồn, vui để nhớ bạn!",
  "Sống là để nhậu, nhậu để sống vui!",
  "Trăm năm bia đá, nghìn năm bia ôm!",
  "Chia bill rõ ràng, tình bạn bền lâu!",
  "Uống có trách nhiệm, chia có công bằng!",
  "Ly này tôi mời, ly sau bạn trả!",
  "Nhậu không say, lần sau ai mời!",
  "Đời là những cuộc nhậu bất tận!",
  "Có bạn có bia, có bia có vui!",
  "Cạn ly đi, chuyện đời tính sau!",
  "Không say không về, về thì phải tỉnh!",
  "Chia tiền công bằng, ai cũng vui lòng!",
  "Một người vì mọi người, mọi người vì bia!",
  "Nhậu hôm nay, lo ngày mai!",
  "Tiền chia đều, vui chia đôi!",
  "Bạn nhậu tốt, bạn đời tốt hơn!",
  "Ly bia kết nối, tình bạn thăng hoa!",
  "Say là tạm thời, kỷ niệm là mãi mãi!",
  "Nhậu ít nói nhiều, nhậu nhiều... quên nói!",
  "Chia bill như chia sẻ, công bằng như tình bạn!",
  "Đừng để tiền bạc làm hỏng cuộc vui!",
  "Uống vì đam mê, chia vì công bằng!",
]

function getRandomSlogan(excludeIndex?: number): { slogan: string; index: number } {
  let index = Math.floor(Math.random() * SLOGANS.length)
  if (excludeIndex !== undefined && SLOGANS.length > 1) {
    while (index === excludeIndex) {
      index = Math.floor(Math.random() * SLOGANS.length)
    }
  }
  return { slogan: SLOGANS[index], index }
}

export default function SloganBanner() {
  const [currentSlogan, setCurrentSlogan] = useState(() => getRandomSlogan())
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentSlogan((prev) => getRandomSlogan(prev.index))
        setIsAnimating(false)
      }, 300)
    }, 30000) // Change every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative py-3 px-4">
      {/* Decorative quotes */}
      <span className="absolute left-2 top-1 text-2xl text-primary/30 select-none">"</span>
      <span className="absolute right-2 bottom-1 text-2xl text-primary/30 select-none rotate-180">"</span>
      
      <p 
        className={`
          text-center text-base md:text-lg lg:text-xl 
          font-semibold italic text-primary
          transition-all duration-500
          ${isAnimating ? 'opacity-0 transform -translate-y-2' : 'opacity-100 transform translate-y-0'}
        `}
      >
        {currentSlogan.slogan}
      </p>
    </div>
  )
}
