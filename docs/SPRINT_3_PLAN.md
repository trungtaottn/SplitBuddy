# Sprint 3: Fun & Interactive Features

## Mục tiêu
Thêm các tính năng giải trí để app SplitBuddy trở nên thú vị và hấp dẫn hơn cho người dùng.

---

## Feature 7: Wheel Spinner (Vòng quay may mắn)

### User Story
> Là người dùng, tôi muốn quay vòng quay để chọn ngẫu nhiên ai phải trả tiền hoặc thực hiện một nhiệm vụ nào đó trong buổi nhậu.

### Tính năng
- Vòng quay với tên các thành viên trong session
- Animation quay mượt mà
- Hiển thị kết quả với hiệu ứng confetti
- Lưu lịch sử các lần quay
- Các chế độ: Chọn người trả tiền, Chọn người uống, Custom task

### API Endpoints
- `POST /api/sessions/:id/spin` - Quay và lưu kết quả
- `GET /api/sessions/:id/spin-history` - Lịch sử quay

---

## Feature 8: Drinking Games (Mini-games)

### User Story
> Là người dùng, tôi muốn có các trò chơi nhỏ để làm buổi nhậu thêm vui.

### Tính năng
1. **Truth or Dare** - Sự thật hay thách thức
2. **Never Have I Ever** - Tôi chưa bao giờ
3. **Random Challenge** - Thử thách ngẫu nhiên
4. **Dice Roll** - Tung xúc xắc quyết định

### API Endpoints
- `GET /api/games/truth-or-dare` - Random câu hỏi
- `GET /api/games/never-have-i-ever` - Random câu
- `GET /api/games/challenges` - Random thử thách

---

## Feature 9: Leaderboard & Stats

### User Story
> Là người dùng, tôi muốn xem thống kê ai hay nợ nhất, ai hay trả nhất.

### Tính năng
- Top người nợ nhiều nhất
- Top người được nợ nhiều nhất
- Thống kê cá nhân (tổng đã trả, tổng đã nợ)
- Badges/Achievements

### API Endpoints
- `GET /api/stats/leaderboard` - Bảng xếp hạng
- `GET /api/stats/me` - Thống kê cá nhân

---

## Technical Notes

### Backend Changes
- Thêm bảng `spin_history` để lưu lịch sử quay
- Thêm bảng `game_content` cho nội dung games
- API endpoints mới không ảnh hưởng routes hiện có

### Frontend Changes  
- Component `WheelSpinner` với canvas animation
- Component `DrinkingGames` với các mini-games
- Component `Leaderboard` cho thống kê
- Tất cả là features mới, không sửa code cũ

### Compatibility
- Không thay đổi schema bảng hiện có
- Chỉ thêm bảng và endpoints mới
- Backward compatible 100%

---

## Timeline
- Feature 7: Wheel Spinner - 1 session
- Feature 8: Drinking Games - 1 session
- Feature 9: Leaderboard - 1 session
