# 📋 Sprint 1 Development Plan

**Sprint Duration:** 1-2 tuần  
**Goal:** Hoàn thiện Core UX - Cho phép user quản lý linh hoạt bills, participants và sessions

---

## 🎯 Feature 1: Delete Bill

### User Story
> **As a** session participant  
> **I want to** delete a bill that I created  
> **So that** I can fix mistakes when I enter wrong information

### Acceptance Criteria
- [ ] Chỉ người tạo bill mới có thể xóa
- [ ] Hiển thị confirmation dialog trước khi xóa
- [ ] Sau khi xóa, debts được tính lại tự động
- [ ] UI cập nhật realtime sau khi xóa

### Tasks

| # | Task | Type | Estimate |
|---|------|------|----------|
| 1.1 | Tạo API endpoint `DELETE /api/sessions/:id/bills/:bill_id` | Backend | 1h |
| 1.2 | Thêm method `delete_bill` trong `SessionRepository` | Backend | 1h |
| 1.3 | Recalculate debts sau khi xóa bill | Backend | 30m |
| 1.4 | Thêm nút Delete trên UI bill card | Frontend | 30m |
| 1.5 | Tạo ConfirmDialog component | Frontend | 30m |
| 1.6 | Gọi API và cập nhật state | Frontend | 30m |
| 1.7 | Test end-to-end | Testing | 30m |

**Total Estimate:** ~4.5 hours

---

## 🎯 Feature 2: Delete/Edit Participant

### User Story 2a: Delete Participant
> **As a** session owner  
> **I want to** remove a participant from my session  
> **So that** I can fix when I add wrong person

### User Story 2b: Edit Guest Name
> **As a** session owner  
> **I want to** edit guest participant name  
> **So that** I can correct typos or update names

### Acceptance Criteria
- [ ] Chỉ owner mới có thể xóa/sửa participant
- [ ] Không thể xóa participant nếu đã có bill liên quan
- [ ] Không thể xóa owner (người tạo session)
- [ ] Guest name có thể edit inline
- [ ] UI cập nhật realtime

### Tasks

| # | Task | Type | Estimate |
|---|------|------|----------|
| 2.1 | Tạo API `DELETE /api/sessions/:id/participants/:pid` | Backend | 1h |
| 2.2 | Tạo API `PUT /api/sessions/:id/participants/:pid` | Backend | 1h |
| 2.3 | Kiểm tra participant có bill không trước khi xóa | Backend | 30m |
| 2.4 | Thêm nút Delete/Edit trên participant list | Frontend | 1h |
| 2.5 | Tạo inline edit cho guest name | Frontend | 1h |
| 2.6 | Xử lý error cases (có bill, là owner) | Frontend | 30m |
| 2.7 | Test end-to-end | Testing | 30m |

**Total Estimate:** ~5.5 hours

---

## 🎯 Feature 3: Close/Reopen Session

### User Story 3a: Close Session
> **As a** session owner  
> **I want to** close/lock a session when drinking party is done  
> **So that** no one can add more bills

### User Story 3b: Reopen Session
> **As a** session owner  
> **I want to** reopen a closed session  
> **So that** I can add missed bills

### Acceptance Criteria
- [ ] Chỉ owner mới có thể close/reopen
- [ ] Session closed không thể thêm bill mới
- [ ] Session closed vẫn xem được chi tiết
- [ ] UI hiển thị rõ trạng thái closed
- [ ] Có thể reopen session bất kỳ lúc nào

### Tasks

| # | Task | Type | Estimate |
|---|------|------|----------|
| 3.1 | Tạo API `POST /api/sessions/:id/close` | Backend | 30m |
| 3.2 | Tạo API `POST /api/sessions/:id/reopen` | Backend | 30m |
| 3.3 | Block create_bill nếu session closed | Backend | 30m |
| 3.4 | Thêm Close/Reopen button trên SessionDetail | Frontend | 1h |
| 3.5 | Disable Add Bill button khi session closed | Frontend | 30m |
| 3.6 | Hiển thị badge "Closed" trên session card | Frontend | 30m |
| 3.7 | Test end-to-end | Testing | 30m |

**Total Estimate:** ~4 hours

---

## 📊 Sprint Summary

| Feature | Tasks | Estimate | Priority |
|---------|-------|----------|----------|
| Delete Bill | 7 | 4.5h | 🔴 High |
| Delete/Edit Participant | 7 | 5.5h | 🔴 High |
| Close/Reopen Session | 7 | 4h | 🟡 Medium |
| **Total** | **21** | **~14h** | - |

---

## 🔄 Implementation Order

1. **Delete Bill** - Most requested, users often make mistakes
2. **Delete/Edit Participant** - Related to session management
3. **Close/Reopen Session** - Workflow completion

---

## 📝 Technical Notes

### Database Changes
- Không cần migration mới (sử dụng existing schema)

### API Endpoints Summary
```
DELETE /api/sessions/:id/bills/:bill_id
DELETE /api/sessions/:id/participants/:pid
PUT    /api/sessions/:id/participants/:pid
POST   /api/sessions/:id/close
POST   /api/sessions/:id/reopen
```

### Shared Components Needed
- `ConfirmDialog` - Reusable confirmation modal
- `InlineEdit` - Inline text editing component
