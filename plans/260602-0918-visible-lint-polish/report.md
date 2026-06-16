# Visible Lint Polish Report

## Completed

- `AiGreeting` mount greeting effect now declares its live dependencies.
- `WrappedModal` personality slide case is block-scoped.
- `ProfilePage` push toggle catches no longer bind unused errors.
- Frontend lint warnings reduced from 33 to 29.

## Verification

```bash
cd frontend && npm run type-check
cd frontend && npm run lint
cd frontend && npm test
cd frontend && npm run build
make check-money
```

Result: pass.

Unresolved questions: none.
