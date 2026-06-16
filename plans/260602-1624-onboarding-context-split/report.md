# Onboarding Context Split Report

## Completed

- Moved `OnboardingContext`, `OnboardingStep`, and `useOnboarding` to `onboarding-context.ts`.
- Updated `DashboardPage` and `ProfilePage` hook imports.
- `Onboarding.tsx` now exports only components.
- Frontend lint warnings reduced from 18 to 17.

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
