# Smart Suggestions Dead Hook Cleanup Report

## Completed

- Removed unused `useBillPrediction` from `SmartSuggestions.tsx`.
- Removed dead `parseFloat` money parsing from suggestion code.
- `SmartSuggestions.tsx` now exports only the component.
- Frontend lint warnings reduced from 17 to 16.

## Verification

```bash
rg -n "SmartSuggestions|useBillPrediction" frontend/src -g "*.tsx" -g "*.ts"
cd frontend && npm run type-check
cd frontend && npm run lint
cd frontend && npm test
cd frontend && npm run build
make check-money
```

Result: pass.

Unresolved questions: none.
