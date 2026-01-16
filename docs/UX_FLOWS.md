# SplitBuddy UX Flows & Analysis

> Tài liệu phân tích trải nghiệm người dùng cho 10 tính năng ưu tiên

---

## 1. Session Cards Redesign

### Hiện trạng
```
┌─────────────────────────────────────┐
│ Session Name                        │
│ 📍 Location    📅 Date              │
│ 3 participants    💰 500,000đ       │
│ Status: active                      │
└─────────────────────────────────────┘
```

### Vấn đề
- Card nhìn flat, không có visual hierarchy
- Không thấy ngay ai tham gia
- Không biết % đã thanh toán
- Status text không trực quan

### User Flow mới
```
User mở Dashboard
    ↓
Nhìn thấy danh sách sessions
    ↓
Mỗi card hiển thị:
  - Avatar stack của participants (max 4 + "+N")
  - Progress bar thanh toán (xanh = đã trả, đỏ = còn nợ)
  - Badge màu theo status (active=xanh, settled=xám, pending=vàng)
  - Tổng tiền nổi bật
    ↓
Hover/tap thấy quick preview
    ↓
Click vào session detail
```

### Thiết kế mới
```
┌─────────────────────────────────────────────────┐
│ 🍺 Nhậu cuối tuần                    [ACTIVE]   │
│ ─────────────────────────────────────────────── │
│  +2 more                                  │
│ ───────────────────────────                     │
│ 📍 Quán Bia Hơi    📅 29/12/2024               │
│                                                 │
│ ████████████░░░░░░░░  65% settled              │
│                                                 │
│ 💰 2,500,000đ                    Bạn nợ 350k → │
└─────────────────────────────────────────────────┘
```

### Metrics
- **Before**: Click-through rate unknown
- **After target**: +20% engagement với sessions

---

## 2. Bill Input UX

### Hiện trạng
```
User click "Thêm bill"
    ↓
Modal mở ra với form:
  - Mô tả (text input)
  - Số tiền (number input)
  - Người trả (dropdown)
  - Chia đều/Custom (radio)
    ↓
User phải điền từng field
    ↓
Submit
```

### Vấn đề
- Phải gõ mô tả từ đầu mỗi lần
- Không có gợi ý thông minh
- Nhập số tiền khó (không có format)
- UX mobile kém

### User Flow mới
```
User click "+" hoặc phím tắt
    ↓
Input bar xuất hiện (inline, không modal)
    ↓
Gõ vài ký tự → autocomplete gợi ý:
  🍺 Bia (gợi ý từ history)
  🍖 Đồ ăn
  🚕 Grab/Taxi
  💊 Thuốc lá
    ↓
Chọn hoặc gõ tiếp
    ↓
Tab/Enter → focus số tiền
    ↓
Gõ số → tự format (1000000 → 1,000,000)
    ↓
Enter → confirm với người trả mặc định (user hiện tại)
    ↓
Hoặc @ mention để đổi người trả
    ↓
Bill được thêm với animation
```

### Smart Suggestions
```javascript
// Autocomplete categories
const BILL_SUGGESTIONS = [
  { icon: '🍺', label: 'Bia', keywords: ['bia', 'beer', 'ruou', 'rượu'] },
  { icon: '🍖', label: 'Đồ ăn', keywords: ['do an', 'đồ ăn', 'food', 'an'] },
  { icon: '🥗', label: 'Rau/Salad', keywords: ['rau', 'salad'] },
  { icon: '🍜', label: 'Lẩu', keywords: ['lau', 'lẩu', 'hotpot'] },
  { icon: '🚕', label: 'Di chuyển', keywords: ['grab', 'taxi', 'xe'] },
  { icon: '💊', label: 'Thuốc lá', keywords: ['thuoc', 'thuốc', 'ciga'] },
  { icon: '🧊', label: 'Đá/Nước', keywords: ['da', 'đá', 'nuoc', 'nước'] },
]
```

### Thiết kế
```
┌─────────────────────────────────────────────────┐
│ ➕ Thêm bill nhanh...                           │
├─────────────────────────────────────────────────┤
│ 🍺 bi...                                        │
│   ┌─────────────────────────────────────────┐   │
│   │ 🍺 Bia                                  │   │
│   │ 🍺 Bia Tiger                            │   │
│   │ 🍺 Bia Heineken (từ session trước)      │   │
│   └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

Sau khi chọn:
┌─────────────────────────────────────────────────┐
│ 🍺 Bia Tiger        │ 250,000 │ @Tôi ▼ │ [✓]  │
└─────────────────────────────────────────────────┘
```

---

## 3. Split Preview (Real-time)

### Hiện trạng
```
User nhập bill 500,000đ
    ↓
Chọn chia đều cho 5 người
    ↓
Submit
    ↓
Xem kết quả: mỗi người 100,000đ
```

### Vấn đề
- Không thấy preview trước khi submit
- Dễ nhầm nếu chọn sai người
- Custom split phải tính toán thủ công

### User Flow mới
```
User nhập số tiền: 500,000đ
    ↓
Ngay lập tức hiển thị preview:
  ┌────────────────────────────┐
  │ Chia cho 5 người:          │
  │  An: 100,000đ            │
  │  Bình: 100,000đ          │
  │  Cường: 100,000đ         │
  │  Dũng: 100,000đ          │
  │  Em: 100,000đ            │
  └────────────────────────────┘
    ↓
User bỏ chọn 1 người
    ↓
Preview cập nhật ngay:
  ┌────────────────────────────┐
  │ Chia cho 4 người:          │
  │  An: 125,000đ            │
  │  Bình: 125,000đ          │
  │  Cường: 125,000đ         │
  │  Dũng: 125,000đ          │
  │ ✗ Em: không chia           │
  └────────────────────────────┘
    ↓
Hoặc chuyển Custom mode
    ↓
Kéo slider hoặc nhập số cho mỗi người
    ↓
Hiển thị tổng và warning nếu không khớp
```

### Visual Design
```
┌─────────────────────────────────────────────────┐
│ Tổng bill: 500,000đ                             │
│ ─────────────────────────────────────────────── │
│ Chia cho:  ○ Đều  ● Custom                      │
│ ─────────────────────────────────────────────── │
│                                                 │
│ [✓]  An         ████████░░ 200,000đ          │
│ [✓]  Bình       ██████░░░░ 150,000đ          │
│ [✓]  Cường      ██████░░░░ 150,000đ          │
│ [ ]  Dũng       ░░░░░░░░░░ 0đ                │
│                                                 │
│ ─────────────────────────────────────────────── │
│ Tổng: 500,000đ / 500,000đ  ✓ Khớp              │
└─────────────────────────────────────────────────┘
```

---

## 4. Quick Create Session từ Group

### Hiện trạng
```
User ở trang Groups
    ↓
Click vào group
    ↓
Xem danh sách members
    ↓
Quay về Dashboard
    ↓
Click "Tạo session mới"
    ↓
Chọn group
    ↓
Chọn lại members
    ↓
Tạo session
```

### Vấn đề
- Quá nhiều bước
- Phải nhớ ai trong group
- Context switching giữa các trang

### User Flow mới
```
User ở trang Groups
    ↓
Nhìn thấy nút "🍺 Nhậu ngay!" trên mỗi group card
    ↓
Click nút
    ↓
Bottom sheet hiện lên:
  ┌────────────────────────────┐
  │ Tạo session cho "Hội SG"   │
  │ ─────────────────────────  │
  │ 📝 Tên: Nhậu 29/12         │
  │ 📍 Địa điểm: ___________   │
  │                            │
  │ Thành viên: (bỏ chọn nếu   │
  │             ai không đi)   │
  │ [✓]  An                  │
  │ [✓]  Bình                │
  │ [✓]  Cường               │
  │                            │
  │ [ 🍺 Bắt đầu nhậu! ]       │
  └────────────────────────────┘
    ↓
Click "Bắt đầu nhậu!"
    ↓
Redirect đến Session Detail
    ↓
Sẵn sàng thêm bills
```

### Cũng thêm từ Dashboard
```
Dashboard có widget "Nhóm của bạn"
    ↓
Mỗi group có nút quick action
    ↓
1 click = tạo session với tất cả members
```

---

## 5. Dark Mode

### User Flow
```
User click avatar/settings
    ↓
Thấy toggle "Chế độ tối"
    ↓
Click toggle
    ↓
UI chuyển sang dark mode với animation mượt
    ↓
Preference được lưu localStorage
    ↓
Lần sau vào app tự động apply
```

### Hoặc Auto Mode
```
System preference = dark
    ↓
App tự động dark mode
    ↓
User có thể override trong settings
```

### Color Palette
```css
/* Light Mode */
--bg-primary: #ffffff;
--bg-secondary: #f8fafc;
--text-primary: #0f172a;
--text-secondary: #64748b;
--accent: #f97316; /* orange */

/* Dark Mode */
--bg-primary: #0f172a;
--bg-secondary: #1e293b;
--text-primary: #f8fafc;
--text-secondary: #94a3b8;
--accent: #fb923c; /* lighter orange for dark */
```

### Mood + Dark Mode
```
Dark mode + Happy mood = warm dark amber tones
Dark mode + Sad mood = cool dark blue tones
Dark mode + Stressed mood = calm dark green tones
```

---

## 6. Skeleton Loading

### Hiện trạng
```
User mở Dashboard
    ↓
Thấy spinner quay giữa màn hình
    ↓
Đợi 1-2 giây
    ↓
Content xuất hiện đột ngột
```

### Vấn đề
- Spinner không cho biết content sẽ như thế nào
- Cảm giác chậm hơn thực tế
- Layout shift khi content load

### User Flow mới
```
User mở Dashboard
    ↓
Ngay lập tức thấy skeleton:
  ┌─────────────────────────────────┐
  │ ████████████████                │ ← Header skeleton
  │ ─────────────────────────────── │
  │ ┌───────────┐ ┌───────────┐     │
  │ │ ░░░░░░░░░ │ │ ░░░░░░░░░ │     │ ← Stats cards
  │ │ ░░░░░░░░░ │ │ ░░░░░░░░░ │     │
  │ └───────────┘ └───────────┘     │
  │                                 │
  │ ┌─────────────────────────────┐ │
  │ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │ ← Session cards
  │ │ ░░░░░░░░░░                  │ │
  │ └─────────────────────────────┘ │
  │ ┌─────────────────────────────┐ │
  │ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
  │ │ ░░░░░░░░░░                  │ │
  │ └─────────────────────────────┘ │
  └─────────────────────────────────┘
    ↓
Data load xong
    ↓
Skeleton fade out, content fade in (smooth transition)
```

### Implementation
```tsx
// Skeleton component với shimmer animation
<div className="animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
```

---

## 7. Debt Optimization

### Hiện trạng
```
A nợ B: 100k
A nợ C: 50k
B nợ C: 80k
    ↓
3 giao dịch cần thực hiện
```

### Vấn đề
- Quá nhiều giao dịch nhỏ
- Khó track ai đã trả ai
- Phức tạp với nhóm lớn

### User Flow mới
```
User mở Debts page
    ↓
Thấy section "💡 Gợi ý thanh toán tối ưu"
    ↓
Hệ thống tính toán:
  Thay vì 3 giao dịch:
    A → B: 100k
    A → C: 50k
    B → C: 80k
  
  Chỉ cần 2 giao dịch:
    A → B: 20k
    A → C: 130k
    ↓
Hiển thị:
  ┌────────────────────────────────────┐
  │ 💡 Thanh toán tối ưu               │
  │ ──────────────────────────────     │
  │ Giảm từ 3 → 2 giao dịch!           │
  │                                    │
  │  Bạn →  Bình: 20,000đ    [Trả] │
  │  Bạn →  Cường: 130,000đ  [Trả] │
  │                                    │
  │ Tiết kiệm: 1 giao dịch             │
  └────────────────────────────────────┘
    ↓
User click "Trả"
    ↓
Tự động mark debt settled
```

### Algorithm
```
// Minimum Cash Flow Algorithm
1. Tính net balance cho mỗi người
2. Người nợ nhiều nhất trả cho người được nợ nhiều nhất
3. Lặp lại cho đến khi tất cả = 0
```

---

## 8. Payment Reminder

### User Flow
```
User có người nợ > 7 ngày chưa trả
    ↓
Dashboard hiển thị badge notification
    ↓
Click vào section "⏰ Nhắc nhở"
    ↓
Thấy danh sách:
  ┌────────────────────────────────────┐
  │ ⏰ Cần nhắc nhở                     │
  │ ──────────────────────────────     │
  │  Bình - 150,000đ                 │
  │    Từ "Nhậu tuần trước" (10 ngày)  │
  │    [💬 Nhắc] [✓ Đã trả]            │
  │                                    │
  │  Cường - 80,000đ                 │
  │    Từ "Sinh nhật An" (14 ngày)     │
  │    [💬 Nhắc] [✓ Đã trả]            │
  └────────────────────────────────────┘
    ↓
User click "Nhắc"
    ↓
Options:
  - Copy message để gửi qua Zalo/Messenger
  - Share via system share sheet
    ↓
Message template:
  "Ê [Tên], nhắc nợ từ buổi [Session] hôm [Date] nhé.
   Bạn còn nợ [Amount]. Chuyển khoản giúp mình nha! 🍺"
```

### Auto Reminder (Future)
```
Settings: Bật tự động nhắc sau X ngày
    ↓
System gửi push notification cho người nợ
    ↓
Hoặc gửi email reminder
```

---

## 9. Game Animations

### Hiện trạng
```
User click "Rút câu hỏi"
    ↓
Loading text hiện
    ↓
Câu hỏi xuất hiện đột ngột
```

### Vấn đề
- Không có suspense/excitement
- Cảm giác boring
- Thiếu "fun factor" của party game

### User Flow mới
```
User click "Rút câu hỏi"
    ↓
Card flip animation:
  ┌─────────┐     ┌─────────┐
  │   ❓    │ →→→ │ Sự thật │
  │         │     │ hay     │
  │  ???    │     │ Thách   │
  │         │     │ thức?   │
  └─────────┘     └─────────┘
    ↓
Suspense build-up (1-2 giây)
    ↓
Card reveal với confetti nếu câu khó
    ↓
Sound effect (optional)

Dice Game:
User click "Tung xúc xắc"
    ↓
3D dice roll animation
    ↓
Dice bounces và stops
    ↓
Kết quả reveal với flash effect
    ↓
Đôi → confetti + celebration
```

### Animation Specs
```css
/* Card flip */
@keyframes card-flip {
  0% { transform: rotateY(0deg); }
  50% { transform: rotateY(90deg); }
  100% { transform: rotateY(180deg); }
}

/* Dice shake */
@keyframes dice-shake {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-15deg); }
  75% { transform: rotate(15deg); }
}

/* Result reveal */
@keyframes reveal-pop {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
```

---

## 10. Quick Actions (Long-press)

### User Flow
```
User ở tab Hoá đơn
    ↓
Long-press trên card hoá đơn (mobile) hoặc right‑click (desktop)
    ↓
Bottom sheet "Thao tác nhanh" xuất hiện
    ↓
Các lựa chọn:
  - ✏️ Sửa hoá đơn
  - 🧾 Xem ảnh hoá đơn (nếu có)
  - 🗑️ Xoá hoá đơn (confirm)
    ↓
Chạm ra ngoài để đóng
```

### Micro‑Interactions
- Haptic nhẹ khi mở sheet (mobile)
- Swipe actions: kéo trái để Xoá, kéo phải để Sửa
- Trạng thái xoá 2 bước: chọn → xác nhận

### Design Notes
- Ưu tiên thao tác 1 tay, nút đủ lớn (>= 44px)
- Bottom sheet dùng tiêu đề ngắn, rõ hành động
- Không chặn thao tác click nút bên trong card

---

## 11. Empty States

### Các trường hợp
1. **Chưa có sessions** - Dashboard trống
2. **Chưa có bills** - Session detail trống
3. **Chưa có debts** - Debts page trống
4. **Chưa có groups** - Groups page trống
5. **Search không có kết quả**

### User Flow
```
User mới đăng ký, vào Dashboard
    ↓
Thay vì trang trống, thấy:
  ┌─────────────────────────────────────────────┐
  │                                             │
  │         🍺                                  │
  │     ╱─────╲                                 │
  │    │       │                                │
  │    │  ___  │                                │
  │    │ (   ) │                                │
  │     ╲_____╱                                 │
  │                                             │
  │   Chưa có buổi nhậu nào!                    │
  │                                             │
  │   Tạo session đầu tiên để bắt đầu          │
  │   chia tiền với bạn bè.                     │
  │                                             │
  │   [ 🍺 Tạo buổi nhậu đầu tiên ]            │
  │                                             │
  │   ─── hoặc ───                              │
  │                                             │
  │   [ 👥 Tạo nhóm bạn nhậu ]                 │
  │                                             │
  └─────────────────────────────────────────────┘
    ↓
User click CTA
    ↓
Flow tạo session/group
```

### Empty States cho các trang khác
```
Bills trống:
  "🧾 Chưa có hóa đơn nào
   Thêm bill đầu tiên bằng nút + bên trên"

Debts trống (tốt!):
  "🎉 Tuyệt vời!
   Bạn không nợ ai và không ai nợ bạn.
   Tiếp tục nhậu thôi!"

Groups trống:
  "👥 Chưa có nhóm nào
   Tạo nhóm để dễ dàng quản lý bạn nhậu"

Search không kết quả:
  "🔍 Không tìm thấy '[keyword]'
   Thử tìm với từ khóa khác"
```

---

## Thứ tự triển khai đề xuất

### Phase 1: Foundation (Tuần 1)
1. ✅ Skeleton Loading - Cần cho tất cả các page
2. ✅ Empty States - Cần cho tất cả các page
3. ✅ Dark Mode - Cần setup theme system

### Phase 2: Core UX (Tuần 2)
4. ✅ Session Cards redesign
5. ✅ Bill Input UX
6. ✅ Split Preview

### Phase 3: Convenience (Tuần 3)
7. ✅ Quick Create Session từ Group
8. ✅ Payment Reminder

### Phase 4: Delight (Tuần 4)
9. ✅ Debt Optimization
10. ✅ Game Animations

---

## Notes

- Tất cả animations nên có `prefers-reduced-motion` fallback
- Dark mode phải test với tất cả mood colors
- Mobile-first cho tất cả redesign
- A/B test nếu có thể cho major UX changes
