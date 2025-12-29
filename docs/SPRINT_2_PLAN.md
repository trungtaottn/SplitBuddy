# 📋 Sprint 2 Development Plan

**Sprint Duration:** 1-2 tuần  
**Goal:** Cải thiện UX với Search, Filter, Pagination và Export

---

## 🎯 Feature 4: Search & Filter Sessions

### User Story

> **As a** user with many sessions  
> **I want to** search and filter my sessions  
> **So that** I can quickly find the session I need

### Acceptance Criteria

- [ ] Tìm kiếm theo tên session
- [ ] Filter theo trạng thái (active/closed)
- [ ] Filter theo khoảng thời gian
- [ ] Kết quả cập nhật realtime khi gõ
- [ ] Hiển thị số lượng kết quả

### Tasks

| # | Task | Type | Estimate |
|---|------|------|----------|
| 4.1 | Thêm query params cho API GET /sessions | Backend | 1h |
| 4.2 | Implement search logic trong SessionRepository | Backend | 1h |
| 4.3 | Thêm Search input component | Frontend | 30m |
| 4.4 | Thêm Filter dropdown (status, date range) | Frontend | 1h |
| 4.5 | Debounce search input | Frontend | 30m |
| 4.6 | Test end-to-end | Testing | 30m |

**Total Estimate:** ~4.5 hours

---

## 🎯 Feature 5: Pagination

### User Story

> **As a** user with many sessions  
> **I want to** see sessions in pages  
> **So that** the app loads faster and is easier to navigate

### Acceptance Criteria

- [ ] Hiển thị 10 sessions mỗi trang
- [ ] Có nút Previous/Next
- [ ] Hiển thị tổng số trang
- [ ] URL cập nhật khi đổi trang
- [ ] Giữ filter khi chuyển trang

### Tasks

| # | Task | Type | Estimate |
|---|------|------|----------|
| 5.1 | Thêm pagination params (page, limit) cho API | Backend | 1h |
| 5.2 | Return total count trong response | Backend | 30m |
| 5.3 | Tạo Pagination component | Frontend | 1h |
| 5.4 | Integrate với search/filter | Frontend | 30m |
| 5.5 | Sync với URL params | Frontend | 30m |
| 5.6 | Test end-to-end | Testing | 30m |

**Total Estimate:** ~4 hours

---

## 🎯 Feature 6: Export CSV

### User Story

> **As a** session owner  
> **I want to** export session data to CSV  
> **So that** I can share or archive the data

### Acceptance Criteria

- [ ] Export session summary với participants và bills
- [ ] Export debt summary
- [ ] Tên file có ngày và tên session
- [ ] Format đẹp, dễ đọc trong Excel

### Tasks

| # | Task | Type | Estimate |
|---|------|------|----------|
| 6.1 | Tạo API GET /sessions/:id/export | Backend | 1.5h |
| 6.2 | Generate CSV với proper encoding | Backend | 1h |
| 6.3 | Thêm nút Export trên SessionDetail | Frontend | 30m |
| 6.4 | Download file với proper filename | Frontend | 30m |
| 6.5 | Test với Excel/Google Sheets | Testing | 30m |

**Total Estimate:** ~4 hours

---

## 📊 Sprint Summary

| Feature | Tasks | Estimate | Priority |
|---------|-------|----------|----------|
| Search & Filter | 6 | 4.5h | 🔴 High |
| Pagination | 6 | 4h | 🔴 High |
| Export CSV | 5 | 4h | 🟡 Medium |
| **Total** | **17** | **~12.5h** | - |

---

## 🔄 Implementation Order

1. **Search & Filter** - Most impactful for UX
2. **Pagination** - Works with search/filter
3. **Export CSV** - Nice to have

---

## 📝 Technical Notes

### API Changes

```
GET /sessions?search=xxx&status=active|closed&from=date&to=date&page=1&limit=10
GET /sessions/:id/export
```

### Response Format (with pagination)

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "total_pages": 10
  }
}
```
