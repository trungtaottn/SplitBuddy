# 🎮 Games Roadmap - SplitBuddy

> Tài liệu tracking toàn bộ ý tưởng nâng cấp trò chơi

## 📊 Tổng quan Games hiện tại

| Game | Status | Mô tả |
|------|--------|-------|
| Sự thật hay Thách thức | ✅ Live | Random truth/dare từ DB |
| Tôi chưa bao giờ | ✅ Live | Random "Never have I ever" |
| Thử thách | ✅ Live | Random challenge với độ khó |
| Tung xúc xắc | ✅ Live | 2 dice với rules đặc biệt |
| Vòng quay may mắn | ✅ Live | Spin wheel chọn người |
| Đếm số shot | ✅ Live | Track drinking per person |
| Lượt chơi | ✅ Live | Player rotation system |
| King's Cup | ✅ Live | Card game với 52 lá |
| Ai có khả năng nhất | ✅ Live | Most likely to voting |
| Kể tên theo chủ đề | ✅ Live | Categories game |
| Cao hay Thấp | ✅ Live | High/Low card guessing |

---

## 🚀 Phase 1: Quick Wins ✅ COMPLETED

### 1.1 Vòng quay chọn người (Wheel of Fortune)
- **Priority:** 🔴 High
- **Status:** ✅ Completed (2025-12-30)
- **Effort:** Medium (2-3 days)
- **Description:**
  - Vòng quay với tên người chơi từ session
  - Animation spinning với sound effects
  - Chọn ai phải thực hiện câu hỏi/thử thách
  - Có thể customize số ô và nội dung

**Tasks:**
- [x] Design UI component vòng quay
- [x] Implement spinning animation (requestAnimationFrame + easing)
- [x] Integrate với session participants
- [x] Add sound effects khi quay
- [x] Random weighted selection logic

---

### 1.2 Drinking Counter & Stats
- **Priority:** 🔴 High
- **Status:** ✅ Completed (2025-12-29)
- **Effort:** Low (1 day)
- **Description:**
  - Track số shot mỗi người trong session
  - Live leaderboard "Ai uống nhiều nhất"
  - Warning khi quá X shots
  - Tích hợp với drinking_stats table (đã có)

**Tasks:**
- [x] UI component hiển thị drink count
- [x] Real-time update khi +1 drink
- [x] Leaderboard widget
- [x] Safety warning threshold

---

### 1.3 Player Rotation System
- **Priority:** 🔴 High
- **Status:** ✅ Completed (2025-12-29)
- **Effort:** Low (0.5 day)
- **Description:**
  - Fair rotation giữa người chơi
  - Track ai đã chơi, ai chưa
  - Auto-suggest người tiếp theo
  - Reset rotation khi hết vòng

**Tasks:**
- [x] Rotation state management
- [x] UI indicator "Lượt của ai"
- [x] Skip/Pass functionality
- [x] History tracking

---

## 🎯 Phase 2: New Games ✅ COMPLETED

### 2.1 King's Cup / Vua Bia
- **Priority:** 🟡 Medium
- **Status:** ✅ Completed (2025-12-29)
- **Description:**
  - Bốc bài từ 52 lá
  - Mỗi lá có rule riêng (A-K)
  - Animation lật bài
  - Track bài đã bốc

**Card Rules:**
| Card | Rule | Action |
|------|------|--------|
| A | Waterfall | Cả bàn uống liên tục |
| 2 | You | Chọn người uống |
| 3 | Me | Bạn uống |
| 4 | Floor | Tay xuống đất, chậm nhất uống |
| 5 | Guys | Nam uống |
| 6 | Chicks | Nữ uống |
| 7 | Heaven | Tay lên trời, chậm nhất uống |
| 8 | Mate | Chọn buddy, cùng uống mọi lần |
| 9 | Rhyme | Nói vần, ai hết vần uống |
| 10 | Categories | Kể tên theo chủ đề |
| J | Rule | Tạo luật mới |
| Q | Question Master | Ai trả lời câu hỏi phải uống |
| K | King Cup | Đổ vào ly King, K thứ 4 uống hết |

**Tasks:**
- [ ] Card deck component (52 cards)
- [ ] Card flip animation
- [ ] Rule display modal
- [ ] King cup progress indicator
- [ ] Deck shuffle logic

---

### 2.2 Most Likely To (Ai có khả năng nhất)
- **Priority:** 🟡 Medium
- **Status:** 🟡 Pending
- **Effort:** Medium (2 days)
- **Description:**
  - "Ai có khả năng nhất sẽ..."
  - Đếm ngược 3-2-1, mọi người vote
  - Người bị vote nhiều nhất = uống
  - Content từ DB hoặc custom

**Tasks:**
- [ ] Question bank "Most likely to..."
- [ ] Voting UI (point at player)
- [ ] Vote counting logic
- [ ] Results reveal animation
- [ ] Tie-breaker rules

---

### 2.3 Categories Game
- **Priority:** 🟡 Medium
- **Status:** 🟡 Pending
- **Effort:** Low (1 day)
- **Description:**
  - Chọn category (xe hơi, bia, phim...)
  - Lần lượt kể tên trong category
  - Lặp lại hoặc hết ý = uống
  - Timer countdown áp lực

**Tasks:**
- [ ] Category selection UI
- [ ] Timer countdown component
- [ ] Answer input/voice
- [ ] Duplicate detection
- [ ] Category database

---

### 2.4 High or Low (Cao thấp)
- **Priority:** 🟡 Medium
- **Status:** 🟡 Pending
- **Effort:** Low (1 day)
- **Description:**
  - Dealer ra 1 lá bài
  - Đoán lá tiếp cao hơn hay thấp hơn
  - Đoán sai = uống
  - Streak bonus

**Tasks:**
- [ ] Card display component
- [ ] High/Low buttons
- [ ] Streak counter
- [ ] Card deck management

---

## 🔥 Phase 3: Advanced Features

### 3.1 Real-time Reaction Game
- **Priority:** 🟢 Low
- **Status:** 🟡 Pending
- **Effort:** High (3-4 days)
- **Description:**
  - Màn hình đổi màu random
  - Ai bấm nhanh nhất khi thấy target
  - Chậm nhất = uống
  - Multiplayer real-time via WebSocket

**Tasks:**
- [ ] WebSocket integration
- [ ] Color flash game logic
- [ ] Reaction time tracking
- [ ] Leaderboard per round

---

### 3.2 Team Mode
- **Priority:** 🟢 Low
- **Status:** 🟡 Pending
- **Effort:** Medium (2 days)
- **Description:**
  - Chia đội (2-4 teams)
  - Điểm số theo đội
  - Relay challenges
  - Team vs Team showdown

**Tasks:**
- [ ] Team creation UI
- [ ] Team scoring system
- [ ] Team-based games adaptation
- [ ] Winner celebration

---

### 3.3 Achievements System
- **Priority:** 🟢 Low
- **Status:** 🟡 Pending
- **Effort:** Medium (2 days)
- **Description:**
  - Huy hiệu cho milestones
  - "First blood", "Party animal", "Survivor"
  - Profile badges
  - Unlock animations

**Tasks:**
- [ ] Achievement definitions
- [ ] Progress tracking
- [ ] Badge display UI
- [ ] Unlock notifications

---

## 🛠️ UX Improvements (Ongoing)

### Current Game Enhancements

| Feature | Status | Description |
|---------|--------|-------------|
| Difficulty Progression | 🟡 Pending | Auto increase difficulty |
| Combo System | 🟡 Pending | Streak bonuses |
| Custom Content Sharing | 🟡 Pending | Share between groups |
| Share Moment | 🟡 Pending | Screenshot & share |
| Daily Challenges | 🟡 Pending | Thử thách mỗi ngày |

---

## 📅 Implementation Timeline

```
Week 1: Phase 1 (Quick Wins)
├── Day 1-2: Wheel of Fortune
├── Day 3: Drinking Counter
└── Day 4: Player Rotation

Week 2: Phase 2 (New Games)
├── Day 1-3: King's Cup
├── Day 4-5: Most Likely To
└── Day 6-7: Categories + High/Low

Week 3: Phase 3 (Advanced)
├── Real-time features
├── Team mode
└── Achievements
```

---

## 📝 Notes

- Tất cả games cần tích hợp với `session_participants`
- Sound effects và vibration là standard
- Mobile-first design
- Offline capability cho basic games

---

## 🔄 Changelog

| Date | Change |
|------|--------|
| 2025-12-30 | Initial roadmap created |

