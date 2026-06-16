# Bill Input Initializer Stability Report

## Completed

- `BillInput` edit-mode initializer resolves currency locally before custom split normalization.
- `WEIGHTED` bills keep `WEIGHTED` strategy when loaded for editing.
- `BillInput` hook dependency warning cleared.
- Frontend lint warnings reduced from 29 to 28.

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
