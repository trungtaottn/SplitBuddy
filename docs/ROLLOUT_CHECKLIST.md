# SplitBuddy Rollout Checklist

## Trước khi rollout
- [ ] Chay `make check` va giai quyet toan bo warnings.
- [ ] Chay migration tren staging va kiem tra schema.
- [ ] Backup database truoc khi rollout production.
- [ ] Kiem tra `.env` va bien moi truong (JWT, DB, web-push).
- [ ] Chay smoke test: login, tao session, tao bill, import/export.

## Trong khi rollout
- [ ] Deploy backend.
- [ ] Apply migrations.
- [ ] Deploy frontend.
- [ ] Kiem tra scheduler recurring (log va dong bo).

## Sau khi rollout
- [ ] Kiem tra log error 15-30 phut dau.
- [ ] Xac nhan thong bao recurring va import/export hoat dong.
- [ ] Cap nhat `RELEASE_NOTES.md`.
