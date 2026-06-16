# Offline Data Hook Stability Report

## Completed

- `useOfflineData` now reads the latest `queryFn` through a ref without effect loops from render-created callbacks.
- Cached values are treated as present when non-null, so valid falsey data is not discarded.
- The last `react-hooks/exhaustive-deps` warning is cleared.
- Frontend lint warnings reduced from 25 to 24; remaining warnings are fast-refresh file-shape only.

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
