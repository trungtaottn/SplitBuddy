# Contributing to SplitBuddy

Cảm ơn bạn đã quan tâm đến việc đóng góp cho SplitBuddy! Dưới đây là hướng dẫn để bạn có thể contribute hiệu quả.

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

### 3. Create Feature Branch

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

## Pull Request Process

### 1. Before Creating PR

- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] No lint warnings (where possible)
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
```

### 4. Review Process

- At least 1 approval required
- CI must pass
- Address all review comments
- Squash commits if requested

## Testing

### Frontend

```bash
cd frontend
npm run build    # Type check + build
npm run preview  # Preview production build
```

### Backend

```bash
cd backend
cargo test
cargo clippy     # Lint check
```

## Project Structure

```
SplitBuddy/
├── backend/
│   ├── src/
│   │   ├── api/          # Route handlers
│   │   ├── domain/       # Business logic
│   │   ├── repository/   # Database access
│   │   └── middleware/   # Auth, logging
│   └── migrations/
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   └── lib/          # Utilities
│   └── public/
│
└── docs/                 # Documentation
```

## Need Help?

- Check existing [Issues](https://github.com/trungtaottn/SplitBuddy/issues)
- Read the [Documentation](./docs/)
- Create a new issue for questions

## Recognition

Contributors will be recognized in the README. Thank you for helping make SplitBuddy better!
