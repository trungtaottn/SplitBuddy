# Fun Tooltip Fast Refresh Cleanup Report

## Completed

- Moved `FUN_MESSAGES` from `FunTooltip.tsx` to `fun-tooltip-messages.ts`.
- Updated `DebtsPage` imports to keep debt-card tooltip copy unchanged.
- `FunTooltip.tsx` fast-refresh warning cleared.
- Frontend lint warnings reduced from 23 to 22.

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
