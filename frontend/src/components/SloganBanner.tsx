import { useState, useEffect } from 'react'

const SLOGANS = [
  "Không nhậu đời không nể! 🍻",
  "Nhậu là nghệ thuật, say là đẳng cấp! 🎨",
  "Cuộc đời ngắn lắm, nhậu đi đừng ngại! 🌟",
  "Một ly không say, hai ly chưa đủ! 🥂",
  "Bạn bè là để nhậu cùng! 👥",
  "Hôm nay không nhậu, mai hối hận! 😎",
  "Tiền tiêu hết, tình bạn còn mãi! 💪",
  "Bia lạnh, bạn thân, cuộc đời tươi đẹp! 🍺",
  "Nhậu để quên buồn, vui để nhớ bạn! 🎉",
  "Sống là để nhậu, nhậu để sống vui! 🌈",
  "Trăm năm bia đá, nghìn năm bia ôm! 🏆",
  "Chia bill rõ ràng, tình bạn bền lâu! 💰",
  "Uống có trách nhiệm, chia có công bằng! ⚖️",
  "Ly này tôi mời, ly sau bạn trả! 🤝",
  "Nhậu không say, lần sau ai mời! 🍾",
  "Đời là những cuộc nhậu bất tận! ♾️",
  "Có bạn có bia, có bia có vui! 🎊",
  "Cạn ly đi, chuyện đời tính sau! 🥃",
  "Không say không về, về thì phải tỉnh! 🚗",
  "Chia tiền công bằng, ai cũng vui lòng! 😄",
  "Một người vì mọi người, mọi người vì bia! 🍻",
  "Nhậu hôm nay, lo ngày mai! 📅",
  "Tiền chia đều, vui chia đôi! 💸",
  "Bạn nhậu tốt, bạn đời tốt hơn! ❤️",
  "Ly bia kết nối, tình bạn thăng hoa! 🌸",
  "Say là tạm thời, kỷ niệm là mãi mãi! 📸",
  "Nhậu ít nói nhiều, nhậu nhiều... quên nói! 🤫",
  "Chia bill như chia sẻ, công bằng như tình bạn! 🤗",
  "Đừng để tiền bạc làm hỏng cuộc vui! 💵",
  "Uống vì đam mê, chia vì công bằng! 🎯",
]

function getRandomSlogan(excludeIndex?: number): { slogan: string; index: number } {
  let index = Math.floor(Math.random() * SLOGANS.length)
  // Avoid repeating the same slogan
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
    <div className="relative py-2">
      <p 
        className={`text-center text-xl md:text-2xl lg:text-3xl font-bold italic transition-all duration-500 ${
          isAnimating ? 'opacity-0 transform -translate-y-2' : 'opacity-100 transform translate-y-0'
        }`}
        style={{
          fontFamily: '"Pacifico", "Dancing Script", "Satisfy", cursive',
          background: 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #ec4899 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
          letterSpacing: '0.5px',
        }}
      >
        ✨ {currentSlogan.slogan} ✨
      </p>
    </div>
  )
}
