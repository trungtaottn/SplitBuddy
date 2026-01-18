# Git Hooks - SplitBuddy

## 📋 Mô tả

Thư mục này chứa các git hooks để đảm bảo code quality trước khi commit.

## 🔧 Cài đặt

### Tự động (khuyến nghị)
```bash
make setup
```

### Thủ công
```bash
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

## 🎯 Pre-commit Hook

Hook sẽ tự động chạy khi bạn `git commit`:

### Backend (Rust)
1. **Auto-format**: Tự động chạy `cargo fmt` và stage lại files
2. **Clippy check**: Kiểm tra lỗi logic và warnings

### Frontend (TypeScript)
1. **Auto-fix**: Tự động chạy `eslint --fix` và stage lại files
2. **Type check**: Kiểm tra TypeScript errors (warning only)
3. **Build check**: Đảm bảo build thành công

## 🚀 Sử dụng

### Commit bình thường
```bash
git add .
git commit -m "feat: add new feature"
# Hook sẽ tự động chạy và format code
```

### Bỏ qua hook (không khuyến khích)
```bash
git commit --no-verify -m "wip: work in progress"
```

## 📝 Commands hữu ích

```bash
# Format tất cả code
make format

# Check tất cả (giống CI)
make check

# Chỉ check backend
make check-backend

# Chỉ check frontend
make check-frontend
```

## ❓ Troubleshooting

### Hook không chạy?
```bash
# Kiểm tra hook path
git config core.hooksPath

# Cài lại
make setup
```

### Muốn tắt tạm thời?
```bash
git commit --no-verify -m "message"
```

### Muốn xóa hook?
```bash
git config --unset core.hooksPath
```
