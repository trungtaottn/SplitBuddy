import { useState, useRef, ReactNode, MouseEvent } from 'react'
import { createPortal } from 'react-dom'

interface FunTooltipProps {
  children: ReactNode
  messages: string[]
  delay?: number
}

export default function FunTooltip({ 
  children, 
  messages, 
  delay = 1500
}: FunTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = (e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    
    timeoutRef.current = setTimeout(() => {
      const randomMessage = messages[Math.floor(Math.random() * messages.length)]
      setCurrentMessage(randomMessage)
      setIsVisible(true)
    }, delay)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isVisible) {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  return (
    <>
      <div 
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="contents"
      >
        {children}
      </div>
      
      {isVisible && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: mousePos.x,
            top: mousePos.y - 10,
            transform: 'translate(-50%, -100%)',
            animation: 'tooltipFadeIn 0.15s ease-out'
          }}
        >
          <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
            {currentMessage}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export const FUN_MESSAGES = {
  createSession: [
    "Đừng ngại, làm đi! 🍻",
    "Nhanh lên, anh em đang chờ! 🔥",
    "Tới lắm rồiiii! 🎉",
    "Nhậu thôi còn chờ gì! 😎",
    "Click đi, đừng sợ! 💪",
    "Cuộc vui đang chờ bạn! 🥳",
  ],
  viewDebts: [
    "Xem ai nợ ai nè! 👀",
    "Đòi nợ thôi! 💰",
    "Công bằng là trên hết! ⚖️",
    "Ai nợ ai, rõ ràng! 📊",
  ],
  addBill: [
    "Ghi lại đi kẻo quên! 📝",
    "Chia đều cho công bằng! ⚖️",
    "Tính tiền nào! 💵",
    "Ai trả bill đây? 🤔",
  ],
  groups: [
    "Hội bạn thân đây! 👥",
    "Team nhậu chất lượng! 🏆",
    "Gắn bó bền chặt! 💪",
  ],
  sessionCard: [
    "Cuộc vui đang chờ! 🎊",
    "Xem chi tiết nào! 👀",
    "Click để xem thêm! 🔍",
  ],
  debtOwed: [
    "Trả đi nhé! 😅",
    "Đừng quên nợ nha! 💸",
    "Công bằng là hạnh phúc! 😊",
  ],
  debtOwing: [
    "Đòi đi thôi! 💪",
    "Tiền của mình mà! 💰",
    "Nhắc họ đi nào! 📢",
  ],
  participant: [
    "Thành viên VIP! ⭐",
    "Người anh em! 🤝",
    "Chiến hữu đồng hành! 🍺",
  ],
}
