# Error Boundary Export Cleanup Report

## Completed

- Removed unused `useErrorHandler` export from `ErrorBoundary.tsx`.
- Kept `ErrorBoundary`, `AsyncBoundary`, and default export intact.
- `ErrorBoundary.tsx` fast-refresh warning cleared.
- Frontend lint warnings reduced from 19 to 18.

## Verification

```bash
rg -n "ErrorBoundary|useErrorHandler" frontend/src -g "*.tsx" -g "*.ts"
cd frontend && npm run type-check
cd frontend && npm run lint
cd frontend && npm test
cd frontend && npm run build
make check-money
```

Result: pass.

Unresolved questions: none.
