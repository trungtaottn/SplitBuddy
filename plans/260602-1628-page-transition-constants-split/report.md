# Page Transition Constants Split Report

## Completed

- Moved route/page animation constants to `page-transition-animations.ts`.
- Updated `DashboardPage`, `DebtsPage`, and `GroupsPage` to import stagger variants from the non-component module.
- `PageTransition.tsx` now exports only animation components.
- Frontend lint warnings reduced from 16 to 13.

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
