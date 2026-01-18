# Branch Protection Rules Setup Guide

## Vấn đề

Khi push trực tiếp lên nhánh `dev`, bạn có thể gặp lỗi:
```
remote: error: GH013: Repository rule violations found for refs/heads/dev.
remote: - 2 of 2 required status checks are expected.
```

## Giải pháp

Cấu hình Branch Protection Rules trên GitHub để phù hợp với workflow:

### 1. Truy cập Settings

1. Vào repository trên GitHub: `https://github.com/trungtaottn/SplitBuddy`
2. Vào **Settings** → **Branches**
3. Tìm section **Branch protection rules**

### 2. Cấu hình cho nhánh `dev`

**Rule name:** `dev`

**Branch name pattern:** `dev`

**Các settings:**

#### ✅ Bật các tính năng này:
- [ ] **Require a pull request before merging**
  - ✅ Require approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (nếu có)

#### ⚠️ **Status checks:**
- [ ] **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - ✅ Status checks required:
    - `test-backend` (chỉ khi backend thay đổi)
    - `test-frontend` (chỉ khi frontend thay đổi)
  - ⚠️ **QUAN TRỌNG:** Bỏ tick **"Require status checks to pass before merging"** cho direct push
  - Hoặc: Chỉ require status checks cho PRs, không require cho direct push

#### ❌ Tắt các tính năng này:
- [ ] **Do not allow bypassing the above settings** (cho phép admin bypass)
- [ ] **Restrict pushes that create files larger than 100 MB**

#### ✅ Cho phép:
- [x] **Allow force pushes** (cho phép revert nếu cần)
- [x] **Allow deletions** (cho phép xóa branch nếu cần)

### 3. Cấu hình cho nhánh `main`

**Rule name:** `main`

**Branch name pattern:** `main`

**Các settings:**

#### ✅ Bật các tính năng này:
- [x] **Require a pull request before merging**
  - ✅ Require approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (nếu có)

#### ✅ **Status checks:**
- [x] **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - ✅ Status checks required:
    - `test-backend`
    - `test-frontend`
    - `deploy` (optional)

#### ❌ Tắt:
- [ ] **Do not allow bypassing the above settings** (cho phép admin bypass)

#### ✅ Cho phép:
- [x] **Allow force pushes** (cho revert workflow)
- [ ] **Allow deletions** (KHÔNG cho phép xóa main)

## Workflow sau khi cấu hình

### Push trực tiếp lên `dev`:
```bash
git push origin dev
# ✅ Sẽ thành công (không require status checks)
# CI sẽ chạy sau khi push để verify
```

### Tạo PR vào `dev`:
```bash
git push origin feature/xxx
# Tạo PR: feature/xxx → dev
# ✅ Status checks sẽ được require trước khi merge
```

### Tạo PR vào `main`:
```bash
# Từ dev branch
# Tạo PR: dev → main
# ✅ Status checks sẽ được require trước khi merge
```

## Lưu ý

1. **Direct push lên `dev`:** Cho phép để developer có thể push code nhanh, CI sẽ verify sau
2. **PR vào `dev`:** Yêu cầu status checks để đảm bảo code quality
3. **PR vào `main`:** Luôn yêu cầu status checks và approval

## Troubleshooting

### Nếu vẫn gặp lỗi sau khi cấu hình:

1. **Kiểm tra lại settings:**
   - Vào Settings → Branches
   - Xem rule cho `dev` branch
   - Đảm bảo không có "Require status checks" cho direct push

2. **Kiểm tra CI workflow:**
   - Vào Actions tab
   - Xem workflow có chạy không
   - Xem job names có đúng không (`test-backend`, `test-frontend`)

3. **Tạm thời bypass (nếu cần):**
   ```bash
   # Nếu bạn là admin, có thể push với --no-verify
   git push origin dev --no-verify
   ```

## Alternative: Sử dụng feature branches

Thay vì push trực tiếp lên `dev`, bạn có thể:

```bash
# Tạo feature branch
git checkout -b feature/your-feature
git commit -m "feat: your feature"
git push origin feature/your-feature

# Tạo PR: feature/your-feature → dev
# Sau khi merge, code sẽ vào dev
```

Cách này an toàn hơn và phù hợp với best practices.
