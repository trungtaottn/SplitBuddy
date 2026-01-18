# Contributing to SplitBuddy

Cảm ơn bạn đã quan tâm đến việc đóng góp cho SplitBuddy! Dưới đây là hướng dẫn để bạn có thể contribute hiệu quả.

**Last Updated:** January 2026

## Code of Conduct

- Tôn trọng lẫn nhau
- Constructive feedback
- Không spam, không toxic

## Getting Started

### 1. Fork & Clone

```bash
# Fork repo trên GitHub, sau đó clone
git clone https://github.com/YOUR_USERNAME/SplitBuddy.git
cd SplitBuddy
```

### 2. Setup Development Environment

Xem [docs/SETUP.md](./docs/SETUP.md) để setup môi trường local.

### 3. Setup Git Hooks (Quan trọng!)

```bash
# Cài đặt git hooks để auto-format code
make setup

# Hoặc thủ công
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

Git hooks sẽ tự động:
- **Auto-format** Rust code với `cargo fmt`
- **Auto-fix** TypeScript với `eslint --fix`
- **Kiểm tra** clippy warnings và build errors

### 4. Create Feature Branch

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name
```

## Development Workflow

### Branch Naming Convention

```
feature/xxx    # New feature
fix/xxx        # Bug fix
refactor/xxx   # Code refactoring
docs/xxx       # Documentation
```

### Branch Strategy

```
main          # Production - auto deploy to Heroku
  └── revert  # Last known good state (auto-synced)
  └── dev     # Development - CI checks, PR target
       └── feature/xxx  # Feature branches
```

### Commit Messages

Tuân thủ [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): message

# Types
feat:     New feature
fix:      Bug fix
refactor: Code refactoring (no functional change)
docs:     Documentation only
style:    Formatting, no code change
test:     Adding tests
chore:    Maintenance tasks
```

**Examples:**

```bash
feat(games): add spin wheel component
fix(auth): resolve JWT expiration issue
refactor(api): simplify debt calculation logic
docs(readme): update installation guide
```

### Code Style

#### Frontend (TypeScript/React)

- Use functional components with hooks
- TypeScript strict mode
- TailwindCSS for styling
- No inline styles
- Component files: `PascalCase.tsx`
- ESLint v9 flat config

```typescript
// Good
export function MyComponent({ prop }: Props) {
  const [state, setState] = useState<Type>(initial)
  return <div className="flex items-center">...</div>
}

// Bad
export default class MyComponent extends React.Component { ... }
```

#### Backend (Rust)

- Follow Rust naming conventions
- Use `Result<T, AppError>` for error handling
- Repository pattern for database access
- Document public functions
- No `unwrap()` in production code

```rust
// Good
pub async fn get_user_by_id(
    &self,
    user_id: Uuid,
) -> Result<User, AppError> {
    // ...
}

// Bad
pub async fn getUser(id: String) -> User { ... }
```

## Makefile Commands

```bash
make setup          # Cài đặt git hooks
make install        # Cài đặt dependencies
make format         # Format tất cả code
make check          # Check tất cả giống CI
make check-backend  # Check backend only
make check-frontend # Check frontend only
make dev-backend    # Chạy backend dev server
make dev-frontend   # Chạy frontend dev server
make docker-build   # Build Docker image
make clean          # Dọn dẹp
```

### Pre-commit Workflow

```bash
# Git hooks tự động chạy khi commit
git add .
git commit -m "feat(games): add new game"
# → Pre-commit hook chạy: format, lint, build
# → Nếu pass → commit thành công
# → Nếu fail → commit bị cancel, fix lỗi và thử lại
```

## Pull Request Process

### 1. Before Creating PR

- [ ] Run `make check` locally (phải pass)
- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] No lint warnings (auto-fixed by pre-commit)
- [ ] Self-review your code
- [ ] Update documentation if needed

### 2. Create PR

```bash
# Push your branch
git push origin feature/your-feature-name

# Create PR on GitHub: feature/xxx -> dev
```

### 3. PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactoring
- [ ] Documentation

## Testing
How was this tested?

## Screenshots (if UI changes)

## Checklist
- [ ] `make check` passes
- [ ] Documentation updated (if needed)
- [ ] No breaking changes (or documented)
```

### 4. Review Process

- At least 1 approval required
- CI must pass (path-filtered)
- Address all review comments
- Squash commits if requested

### 5. After Merge

- PR merged to `dev`
- When ready for production: `dev` → `main` PR
- CI deploys to Heroku automatically
- `revert` branch synced automatically

## Testing

### Using Makefile (Recommended)

```bash
# Check tất cả (giống CI)
make check

# Chỉ check backend
make check-backend

# Chỉ check frontend
make check-frontend

# Format tất cả code
make format
```

### Frontend (Manual)

```bash
cd frontend
npm run type-check  # TypeScript check
npm run build       # Build production
npm run lint:fix    # Auto-fix ESLint
```

### Backend (Manual)

```bash
cd backend
cargo fmt           # Format code
cargo clippy        # Lint check
cargo test          # Run tests
cargo sqlx prepare  # Update SQLx cache
```

## CI/CD Pipeline

GitHub Actions runs on push:

| Job | Trigger | Description |
|-----|---------|-------------|
| `changes` | Always | Detect changed paths |
| `test-backend` | `backend/**` changed | Fmt, clippy, build, test |
| `test-frontend` | `frontend/**` changed | Type-check, build |
| `deploy` | `main` only | Docker build, Heroku push |
| `security-scan` | `main` | Trivy vulnerability scan |
| `sync-revert-*` | After deploy | Sync revert branch |

## Project Structure

```
SplitBuddy/
├── backend/
│   ├── src/
│   │   ├── api/          # Route handlers
│   │   ├── domain/       # Business logic
│   │   ├── repository/   # Database access
│   │   └── middleware/   # Auth, logging
│   ├── migrations/       # SQL migrations
│   └── .sqlx/            # SQLx offline cache
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   ├── hooks/        # Custom hooks
│   │   └── lib/          # Utilities
│   ├── eslint.config.js  # ESLint v9 config
│   └── public/
│
├── .github/workflows/    # CI/CD
│   └── ci.yml
│
├── .githooks/            # Git hooks
│   ├── pre-commit        # Auto-format & check
│   └── setup.sh          # Setup script
│
├── docs/                 # Documentation
├── Makefile              # Development commands
└── Dockerfile            # Multi-stage build
```

## Common Issues

### Git hooks not running

```bash
# Re-setup hooks
make setup

# Verify hook path
git config --get core.hooksPath
# Should return: .githooks
```

### ESLint errors

```bash
# Auto-fix
cd frontend && npm run lint:fix
```

### SQLx errors

```bash
# Update SQLx cache
cd backend && cargo sqlx prepare
git add .sqlx/
```

### CI fails but local passes

- Ensure you ran `make check` locally
- Check CI logs for specific errors
- SQLx cache might be outdated

## Need Help?

- Check existing [Issues](https://github.com/trungtaottn/SplitBuddy/issues)
- Read the [Documentation](./docs/)
- Create a new issue for questions

## Recognition

Contributors will be recognized in the README. Thank you for helping make SplitBuddy better! 🍺
